package service

import (
	"context"
	"errors"
	followRepo "federated-social/backend/epics/content-sharing/repository"
	"federated-social/backend/epics/identity/dto"
	"federated-social/backend/epics/identity/models"
	"federated-social/backend/epics/identity/repository"
	"log"
	"strings"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type ProfileService struct {
	userRepo         *repository.UserRepository
	activityRepo     *repository.ActivityRepository
	sessionRepo      *repository.SessionRepository
	verificationRepo *repository.VerificationRepository
	followRepo       *followRepo.FollowRepository
	postRepo         *followRepo.PostRepository
	notificationRepo *followRepo.NotificationRepository
}

func NewProfileService() *ProfileService {
	return &ProfileService{
		userRepo:         repository.NewUserRepository(),
		activityRepo:     repository.NewActivityRepository(),
		sessionRepo:      repository.NewSessionRepository(),
		verificationRepo: repository.NewVerificationRepository(),
		followRepo:       followRepo.NewFollowRepository(),
		postRepo:         followRepo.NewPostRepository(),
		notificationRepo: followRepo.NewNotificationRepository(),
	}
}

// GetProfile retrieves a user's profile (US1.4 - with visibility check)
// It fetches necessary user data, checks for account deactivation, and
// enforces visibility rules based on the relationship (own profile, following, or public).
func (s *ProfileService) GetProfile(ctx context.Context, userID primitive.ObjectID, requestingUserID *primitive.ObjectID) (*models.PublicUser, error) {
	// Fetch user from repository
	user, err := s.userRepo.FindByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Check if account is deactivated - deactivated accounts should not be visible
	if user.IsDeactivated {
		return nil, errors.New("account is deactivated")
	}

	// Convert to PublicUser to strip sensitive fields (e.g., password hash)
	publicUser := user.ToPublicUser()

	// Populate private fields (like 2FA status) ONLY if viewing own profile
	if requestingUserID != nil && *requestingUserID == userID {
		publicUser.Is2FAEnabled = &user.Is2FAEnabled
	}

	// Check and set follow status if a requesting user is provided
	if requestingUserID != nil {
		isFollowing, _ := s.followRepo.IsFollowing(ctx, *requestingUserID, userID)
		publicUser.IsFollowing = isFollowing
	}

	// Enforce Profile Visibility Rules:
	// - Public: Visible to everyone
	// - Followers: Visible only to followers and the user themselves
	// - Private: Visible checking is similar to followers logic here, usually more strict (e.g. valid connection)
	publicUser.CanViewDetails = true
	if user.ProfileVisibility == "followers" || user.ProfileVisibility == "private" {
		if requestingUserID == nil || *requestingUserID != userID {
			if !publicUser.IsFollowing {
				publicUser.CanViewDetails = false
			}
		}
	}

	// Always populate stats regardless of visibility (US requirements)
	followersCount, _ := s.followRepo.CountFollowers(ctx, userID)
	followingCount, _ := s.followRepo.CountFollowing(ctx, userID)
	postsCount, _ := s.postRepo.CountPostsByAuthor(ctx, userID)

	log.Printf("DEBUG: ProfileService.GetProfile for userID=%v: followers=%d, following=%d, posts=%d", userID.Hex(), followersCount, followingCount, postsCount)

	publicUser.FollowersCount = followersCount
	publicUser.FollowingCount = followingCount
	publicUser.PostsCount = postsCount

	return &publicUser, nil
}

// UpdateProfile updates user profile information (US1.3)
func (s *ProfileService) UpdateProfile(ctx context.Context, userID primitive.ObjectID, req dto.UpdateProfileRequest) (*models.PublicUser, error) {
	update := bson.M{}

	if req.Username != nil {
		newUsername := *req.Username
		if strings.Contains(newUsername, " ") {
			return nil, errors.New("username cannot contain spaces")
		}
		// Check if username is already taken by someone else
		if existingUser, err := s.userRepo.FindByUsername(ctx, newUsername); err == nil && existingUser.ID != userID {
			return nil, errors.New("username already taken")
		}
		update["username"] = newUsername
	}
	if req.DisplayName != nil {
		update["display_name"] = *req.DisplayName
	}
	if req.Bio != nil {
		update["bio"] = *req.Bio
	}
	if req.AvatarURL != nil {
		update["avatar_url"] = *req.AvatarURL
	}
	if req.ProfileVisibility != nil {
		if *req.ProfileVisibility != "public" && *req.ProfileVisibility != "followers" {
			return nil, errors.New("invalid profile visibility value")
		}
		update["profile_visibility"] = *req.ProfileVisibility
	}

	if len(update) == 0 {
		return nil, errors.New("no fields to update")
	}

	if err := s.userRepo.UpdateUser(ctx, userID, update); err != nil {
		return nil, err
	}

	// Log activity
	s.logActivity(ctx, userID, "profile_update", "Profile updated")

	// Get updated user
	user, err := s.userRepo.FindByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	publicUser := user.ToPublicUser()

	// Populate counts
	followersCount, _ := s.followRepo.CountFollowers(ctx, userID)
	followingCount, _ := s.followRepo.CountFollowing(ctx, userID)
	postsCount, _ := s.postRepo.CountPostsByAuthor(ctx, userID)

	publicUser.FollowersCount = followersCount
	publicUser.FollowingCount = followingCount
	publicUser.PostsCount = postsCount

	return &publicUser, nil
}

// DeactivateAccount deactivates a user account (US1.5)
func (s *ProfileService) DeactivateAccount(ctx context.Context, userID primitive.ObjectID) error {
	if err := s.userRepo.DeactivateUser(ctx, userID); err != nil {
		return err
	}

	// Log activity
	s.logActivity(ctx, userID, "account_deactivation", "Account deactivated")

	return nil
}

// DeleteAccount permanently deletes a user account (US1.X)
// This is a destructive operation that removes all data associated with the user,
// including posts, likes, comments, follows, sessions, and activity logs.
func (s *ProfileService) DeleteAccount(ctx context.Context, userID primitive.ObjectID) error {
	// 1. Delete all posts authored by the user
	if err := s.postRepo.DeletePostsByAuthor(ctx, userID); err != nil {
		return err
	}
	// 2. Remove likes made by the user on other posts
	if err := s.postRepo.DeleteLikesByUser(ctx, userID); err != nil {
		return err
	}
	// 3. Remove comments made by the user
	if err := s.postRepo.DeleteCommentsByUser(ctx, userID); err != nil {
		return err
	}
	// 4. Remove all follow relationships (both following and followers)
	if err := s.followRepo.DeleteAllFollows(ctx, userID); err != nil {
		return err
	}
	// 5. Invalidate and delete all active sessions
	if err := s.sessionRepo.DeleteAllUserSessions(ctx, userID); err != nil {
		return err
	}
	// 6. Delete any pending verification codes
	if err := s.verificationRepo.DeleteVerificationCodesByUser(ctx, userID); err != nil {
		return err
	}
	// 7. Delete audit/activity logs
	if err := s.activityRepo.DeleteUserActivity(ctx, userID); err != nil {
		return err
	}
	// 8. Delete notifications
	if err := s.notificationRepo.DeleteUserNotifications(ctx, userID); err != nil {
		return err
	}
	// 9. Finally, delete the user record itself
	if err := s.userRepo.DeleteUser(ctx, userID); err != nil {
		return err
	}

	return nil
}

// GetActivity retrieves user activity logs (US1.7)
func (s *ProfileService) GetActivity(ctx context.Context, userID primitive.ObjectID, limit int64) ([]models.ActivityLog, error) {
	if limit <= 0 || limit > 100 {
		limit = 50 // Default limit
	}

	activities, err := s.activityRepo.GetUserActivity(ctx, userID, limit)
	if err != nil {
		return nil, err
	}

	return activities, nil
}

// GetProfileByIdOrUsername retrieves a profile by either hex ID or username
func (s *ProfileService) GetProfileByIdOrUsername(ctx context.Context, identifier string, requestingUserID *primitive.ObjectID) (*models.PublicUser, error) {
	var user *models.User
	var err error

	// Try as ObjectID first
	if userID, idErr := primitive.ObjectIDFromHex(identifier); idErr == nil {
		user, err = s.userRepo.FindByID(ctx, userID)
	}

	// If not found or not a valid ObjectID, try as username
	if user == nil {
		user, err = s.userRepo.FindByUsername(ctx, identifier)
	}

	if err != nil {
		return nil, err
	}

	return s.GetProfile(ctx, user.ID, requestingUserID)
}

// AddJoinedCommunity adds a community to the user's joined list
func (s *ProfileService) AddJoinedCommunity(ctx context.Context, userID primitive.ObjectID, communityID string) error {
	if communityID == "" {
		return errors.New("community ID required")
	}
	return s.userRepo.AddJoinedCommunity(ctx, userID, communityID)
}

// RemoveJoinedCommunity removes a community from the user's joined list
func (s *ProfileService) RemoveJoinedCommunity(ctx context.Context, userID primitive.ObjectID, communityID string) error {
	if communityID == "" {
		return errors.New("community ID required")
	}
	return s.userRepo.RemoveJoinedCommunity(ctx, userID, communityID)
}

// Helper function to log activity
func (s *ProfileService) logActivity(ctx context.Context, userID primitive.ObjectID, action, details string) {
	log := &models.ActivityLog{
		UserID:  userID,
		Action:  action,
		Details: details,
	}
	s.activityRepo.LogActivity(ctx, log)
}
