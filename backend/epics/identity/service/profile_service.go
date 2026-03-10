package service

import (
	"context"
	"errors"
	"federated-social/backend/config"
	followRepo "federated-social/backend/epics/content-sharing/repository"
	followService "federated-social/backend/epics/content-sharing/service"
	federationModels "federated-social/backend/epics/federation/models"
	federationRepo "federated-social/backend/epics/federation/repository"
	"federated-social/backend/epics/identity/dto"
	"federated-social/backend/epics/identity/models"
	"federated-social/backend/epics/identity/repository"
	safetyService "federated-social/backend/epics/safety/service"
	"fmt"
	"log"
	"strings"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type ProfileService struct {
	userRepo           UserRepository
	activityRepo       ActivityRepository
	sessionRepo        SessionRepository
	verificationRepo   VerificationRepository
	followRepo         FollowRepository
	followService      FollowService
	postRepo           PostRepository
	notificationRepo   NotificationRepository
	remoteUserRepo     RemoteUserRepository
	enforcementService *safetyService.EnforcementService
}

func NewProfileService(enforcement *safetyService.EnforcementService) *ProfileService {
	return &ProfileService{
		userRepo:           repository.NewUserRepository(),
		activityRepo:       repository.NewActivityRepository(),
		sessionRepo:        repository.NewSessionRepository(),
		verificationRepo:   repository.NewVerificationRepository(),
		followRepo:         followRepo.NewFollowRepository(),
		followService:      followService.NewFollowService(),
		postRepo:           followRepo.NewPostRepository(),
		notificationRepo:   followRepo.NewNotificationRepository(),
		remoteUserRepo:     federationRepo.NewRemoteUserRepository(),
		enforcementService: enforcement,
	}
}

// GetProfile retrieves a user's profile (US1.4 - with visibility check)
// It fetches necessary user data, checks for account deactivation, and
// enforces visibility rules based on the relationship (own profile, following, or public).
func (s *ProfileService) GetProfile(ctx context.Context, userID primitive.ObjectID, requestingUserID *primitive.ObjectID) (*models.PublicUser, error) {
	// Try local user repository first
	user, err := s.userRepo.FindByID(ctx, userID)
	if err != nil {
		// If not found locally, try remote user repository
		remoteUser, remoteErr := s.remoteUserRepo.GetRemoteUserByID(ctx, userID)
		if remoteErr == nil {
			publicUser := s.RemoteUserToPublicUser(remoteUser)
			if requestingUserID != nil {
				isFollowing, _ := s.followService.IsFollowing(ctx, *requestingUserID, remoteUser.ID)
				publicUser.IsFollowing = isFollowing
			}

			// Enforce visibility for remote user
			if publicUser.ProfileVisibility == "followers" || publicUser.ProfileVisibility == "private" {
				if !publicUser.IsFollowing {
					publicUser.CanViewDetails = false
				}
			}
			return publicUser, nil
		}
		// If still not found, try by actor ID (which might be a URL or other identifier)
		remoteUserByActorID, actorIDErr := s.remoteUserRepo.GetRemoteUserByActorID(ctx, userID.Hex())
		if actorIDErr == nil {
			return s.RemoteUserToPublicUser(remoteUserByActorID), nil
		}
		return nil, errors.New("user not found")
	}

	// Local user found, proceed with visibility checks
	// Check if account is deactivated - deactivated accounts should not be visible
	if user.IsDeactivated {
		return nil, errors.New("account is deactivated")
	}

	// Convert to PublicUser to strip sensitive fields (e.g., password hash)
	publicUser := user.ToPublicUser()
	if publicUser.InstanceID == "" {
		publicUser.InstanceID = config.AppConfig.InstanceDomain
	}

	// Populate private fields (like 2FA status) ONLY if viewing own profile
	if requestingUserID != nil && *requestingUserID == userID {
		publicUser.Is2FAEnabled = &user.Is2FAEnabled
	}

	// Check and set follow status if a requesting user is provided
	if requestingUserID != nil {
		// Use FollowService to check both local and remote follows
		isFollowing, _ := s.followService.IsFollowing(ctx, *requestingUserID, userID)
		publicUser.IsFollowing = isFollowing

		// Check for pending follow request
		if fs, ok := s.followService.(interface {
			HasFollowRequest(context.Context, primitive.ObjectID, primitive.ObjectID) (bool, error)
		}); ok {
			isRequested, _ := fs.HasFollowRequest(ctx, *requestingUserID, userID)
			publicUser.IsFollowRequested = isRequested
		}
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
	// Use FollowService to count aggregated local and remote followers/following
	followersCount, _ := s.followService.CountFollowers(ctx, userID)
	followingCount, _ := s.followService.CountFollowing(ctx, userID)
	postsCount, _ := s.postRepo.CountPostsByAuthor(ctx, userID)

	log.Printf("DEBUG: ProfileService.GetProfile for userID=%v: followers=%d, following=%d, posts=%d", userID.Hex(), followersCount, followingCount, postsCount)

	publicUser.FollowersCount = followersCount
	publicUser.FollowingCount = followingCount
	publicUser.PostsCount = postsCount

	return &publicUser, nil
}

// UpdateProfile updates user profile information (US1.3)
func (s *ProfileService) UpdateProfile(ctx context.Context, userID primitive.ObjectID, req dto.UpdateProfileRequest) (*models.PublicUser, error) {

	// --- Synchronous AI Moderation BEFORE saving ---
	// Check username, display_name, and bio for guideline violations.
	// If a violation is found, reject the request immediately — DB is never touched.
	if s.enforcementService != nil {
		aiService := s.enforcementService.GetAIService()
		if aiService != nil {
			guidelines, err := s.enforcementService.GetActiveGuidelines(ctx)
			if err != nil {
				log.Printf("[Profile] Warning: could not fetch guidelines for moderation: %v", err)
			}

			type fieldCheck struct {
				label string
				value *string
			}
			fields := []fieldCheck{
				{"display name", req.DisplayName},
				{"username", req.Username},
				{"bio", req.Bio},
			}

			for _, f := range fields {
				if f.value == nil || *f.value == "" {
					continue
				}
				result, err := aiService.ModerateContent(ctx, *f.value, guidelines)
				if err != nil {
					// AI unavailable — log and allow (fail-open to not block UX)
					log.Printf("[Profile] AI moderation unavailable for %s, allowing update: %v", f.label, err)
					continue
				}
				if result.IsViolation {
					reason := result.Reason
					if len(result.BadWordsFound) > 0 {
						reason = fmt.Sprintf("offensive words detected: %s", strings.Join(result.BadWordsFound, ", "))
					}
					log.Printf("[Profile] Blocked update for user %s: %s violates guidelines. Reason: %s", userID.Hex(), f.label, reason)
					return nil, fmt.Errorf("your %s violates our community guidelines — %s", f.label, reason)
				}
			}
		}
	}
	// --- End moderation check ---

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
	if req.IsDiscoverable != nil {
		update["is_discoverable"] = *req.IsDiscoverable
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
		// Use GetProfile which handles both local and remote users by ID
		if profile, err := s.GetProfile(ctx, userID, requestingUserID); err == nil {
			return profile, nil
		}
	}

	// If not found or not a valid ObjectID, try as username
	user, err = s.userRepo.FindByUsername(ctx, identifier)
	if err == nil {
		return s.GetProfile(ctx, user.ID, requestingUserID)
	}

	// Still not found? Try remote user cache by username
	remoteUser, remoteErr := s.remoteUserRepo.GetRemoteUserByUsername(ctx, identifier)
	if remoteErr == nil {
		publicUser := s.RemoteUserToPublicUser(remoteUser)
		if requestingUserID != nil {
			isFollowing, _ := s.followService.IsFollowing(ctx, *requestingUserID, remoteUser.ID)
			publicUser.IsFollowing = isFollowing
		}

		// Enforce visibility
		if publicUser.ProfileVisibility == "followers" || publicUser.ProfileVisibility == "private" {
			if !publicUser.IsFollowing {
				publicUser.CanViewDetails = false
			}
		}
		return publicUser, nil
	}

	return nil, errors.New("user not found")
}

func (s *ProfileService) RemoteUserToPublicUser(ru *federationModels.RemoteUser) *models.PublicUser {
	return &models.PublicUser{
		ID:                ru.ID,
		Username:          ru.Username,
		DisplayName:       ru.DisplayName,
		Bio:               ru.Bio,
		AvatarURL:         ru.AvatarURL,
		InstanceID:        ru.Instance,
		ProfileVisibility: ru.ProfileVisibility,
		CanViewDetails:    true, // Default to true, restricted by logic above if private/followers
		CreatedAt:         ru.CreatedAt,
	}
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
