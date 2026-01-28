package service

import (
	"context"
	"errors"
	"federated-social/backend/epics/identity/dto"
	"federated-social/backend/epics/identity/models"
	"federated-social/backend/epics/identity/repository"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type ProfileService struct {
	userRepo     *repository.UserRepository
	activityRepo *repository.ActivityRepository
}

func NewProfileService() *ProfileService {
	return &ProfileService{
		userRepo:     repository.NewUserRepository(),
		activityRepo: repository.NewActivityRepository(),
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
			// TODO: Check follower relationship when federation is implemented
			return nil, errors.New("profile is private")
		}
	}

	publicUser := user.ToPublicUser()
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

// Helper function to log activity
func (s *ProfileService) logActivity(ctx context.Context, userID primitive.ObjectID, action, details string) {
	log := &models.ActivityLog{
		UserID:  userID,
		Action:  action,
		Details: details,
	}
	s.activityRepo.LogActivity(ctx, log)
}
