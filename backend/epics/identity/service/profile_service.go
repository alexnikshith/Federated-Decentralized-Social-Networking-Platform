package service

import (
	"context"
	"errors"
	followRepo "federated-social/backend/epics/content-sharing/repository"
	"federated-social/backend/epics/identity/dto"
	"federated-social/backend/epics/identity/models"
	"federated-social/backend/epics/identity/repository"
	"log"

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
}

func NewProfileService() *ProfileService {
	return &ProfileService{
		userRepo:         repository.NewUserRepository(),
		activityRepo:     repository.NewActivityRepository(),
		sessionRepo:      repository.NewSessionRepository(),
		verificationRepo: repository.NewVerificationRepository(),
		followRepo:       followRepo.NewFollowRepository(),
		postRepo:         followRepo.NewPostRepository(),
	}
}

// GetProfile retrieves a user's profile (US1.4 - with visibility check)
func (s *ProfileService) GetProfile(ctx context.Context, userID primitive.ObjectID, requestingUserID *primitive.ObjectID) (*models.PublicUser, error) {
	user, err := s.userRepo.FindByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Check if account is deactivated
	if user.IsDeactivated {
		return nil, errors.New("account is deactivated")
	}

	// Check visibility
	if user.ProfileVisibility == "followers" || user.ProfileVisibility == "private" {
		// If requesting user is not the owner, check if they're a follower
		if requestingUserID == nil || *requestingUserID != userID {
			isFollowing, err := s.followRepo.IsFollowing(ctx, *requestingUserID, userID)
			if err != nil || !isFollowing {
				return nil, errors.New("profile is private")
			}
		}
	}

	publicUser := user.ToPublicUser()

	// Populate counts
	followersCount, _ := s.followRepo.CountFollowers(ctx, userID)
	followingCount, _ := s.followRepo.CountFollowing(ctx, userID)
	postsCount, _ := s.postRepo.CountPostsByAuthor(ctx, userID)

	log.Printf("DEBUG: ProfileService.GetProfile for userID=%v: followers=%d, following=%d, posts=%d", userID.Hex(), followersCount, followingCount, postsCount)

	publicUser.FollowersCount = followersCount
	publicUser.FollowingCount = followingCount
	publicUser.PostsCount = postsCount

	// Populate follow status
	if requestingUserID != nil {
		isFollowing, _ := s.followRepo.IsFollowing(ctx, *requestingUserID, userID)
		publicUser.IsFollowing = isFollowing
	}

	return &publicUser, nil
}

// UpdateProfile updates user profile information (US1.3)
func (s *ProfileService) UpdateProfile(ctx context.Context, userID primitive.ObjectID, req dto.UpdateProfileRequest) (*models.PublicUser, error) {
	update := bson.M{}

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
		if *req.ProfileVisibility != "public" && *req.ProfileVisibility != "followers" && *req.ProfileVisibility != "private" {
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
func (s *ProfileService) DeleteAccount(ctx context.Context, userID primitive.ObjectID) error {
	// 1. Delete posts
	if err := s.postRepo.DeletePostsByAuthor(ctx, userID); err != nil {
		return err
	}
	// 2. Delete likes
	if err := s.postRepo.DeleteLikesByUser(ctx, userID); err != nil {
		return err
	}
	// 3. Delete comments
	if err := s.postRepo.DeleteCommentsByUser(ctx, userID); err != nil {
		return err
	}
	// 4. Delete follows
	if err := s.followRepo.DeleteAllFollows(ctx, userID); err != nil {
		return err
	}
	// 5. Delete sessions
	if err := s.sessionRepo.DeleteAllUserSessions(ctx, userID); err != nil {
		return err
	}
	// 6. Delete verification codes
	if err := s.verificationRepo.DeleteVerificationCodesByUser(ctx, userID); err != nil {
		return err
	}
	// 7. Delete activity logs
	if err := s.activityRepo.DeleteUserActivity(ctx, userID); err != nil {
		return err
	}
	// 8. Delete user
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

// Helper function to log activity
func (s *ProfileService) logActivity(ctx context.Context, userID primitive.ObjectID, action, details string) {
	log := &models.ActivityLog{
		UserID:  userID,
		Action:  action,
		Details: details,
	}
	s.activityRepo.LogActivity(ctx, log)
}
