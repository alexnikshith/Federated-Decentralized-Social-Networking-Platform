package service

import (
	"context"
	"federated-social/backend/epics/content-sharing/models"
	"federated-social/backend/epics/content-sharing/repository"
	identityModels "federated-social/backend/epics/identity/models"
	identityRepo "federated-social/backend/epics/identity/repository"
	"log"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type FollowService struct {
	followRepo       *repository.FollowRepository
	userRepo         *identityRepo.UserRepository
	notificationRepo *repository.NotificationRepository
}

func NewFollowService() *FollowService {
	return &FollowService{
		followRepo:       repository.NewFollowRepository(),
		userRepo:         identityRepo.NewUserRepository(),
		notificationRepo: repository.NewNotificationRepository(),
	}
}

// GetFollowers returns list of followers for a user
func (s *FollowService) GetFollowers(ctx context.Context, userID primitive.ObjectID) ([]identityModels.PublicUser, error) {
	followerIDs, err := s.followRepo.GetFollowerIDs(ctx, userID)
	if err != nil {
		return nil, err
	}

	users, err := s.userRepo.FindByIDs(ctx, followerIDs)
	if err != nil {
		return nil, err
	}

	publicUsers := make([]identityModels.PublicUser, len(users))
	for i, user := range users {
		publicUsers[i] = user.ToPublicUser()
	}

	return publicUsers, nil
}

// GetFollowing returns list of users that the given user follows
func (s *FollowService) GetFollowing(ctx context.Context, userID primitive.ObjectID) ([]identityModels.PublicUser, error) {
	followingIDs, err := s.followRepo.GetFollowingIDs(ctx, userID)
	if err != nil {
		return nil, err
	}

	users, err := s.userRepo.FindByIDs(ctx, followingIDs)
	if err != nil {
		return nil, err
	}

	publicUsers := make([]identityModels.PublicUser, len(users))
	for i, user := range users {
		publicUsers[i] = user.ToPublicUser()
	}

	return publicUsers, nil
}

// Follow creates a follow relationship
func (s *FollowService) Follow(ctx context.Context, followerID, followingID primitive.ObjectID) error {
	if followerID == followingID {
		return nil // Cannot follow yourself
	}

	// Check if already following
	if isFollowing, _ := s.followRepo.IsFollowing(ctx, followerID, followingID); isFollowing {
		log.Printf("DEBUG: User %v already follows %v, skipping follow and notification", followerID.Hex(), followingID.Hex())
		return nil
	}

	if err := s.followRepo.Follow(ctx, followerID, followingID); err != nil {
		log.Printf("ERROR: Follow operation failed: %v", err)
		return err
	}

	// Create notification for the user being followed
	log.Printf("DEBUG: Creating follow notification for user %v from follower %v", followingID.Hex(), followerID.Hex())
	notification := &models.Notification{
		UserID:        followingID,
		Type:          "follow",
		RelatedUserID: followerID,
	}
	if err := s.notificationRepo.CreateNotification(ctx, notification); err != nil {
		log.Printf("ERROR: Failed to create follow notification: %v", err)
	}

	return nil
}

// Unfollow removes a follow relationship
func (s *FollowService) Unfollow(ctx context.Context, followerID, followingID primitive.ObjectID) error {
	return s.followRepo.Unfollow(ctx, followerID, followingID)
}

// IsFollowing checks if a user follows another
func (s *FollowService) IsFollowing(ctx context.Context, followerID, followingID primitive.ObjectID) (bool, error) {
	return s.followRepo.IsFollowing(ctx, followerID, followingID)
}
