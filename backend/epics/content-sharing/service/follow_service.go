package service

import (
	"context"
	"errors"
	"federated-social/backend/epics/content-sharing/repository"
	identityModels "federated-social/backend/epics/identity/models"
	identityRepo "federated-social/backend/epics/identity/repository"

	"go.mongodb.org/mongo-driver/bson/primitive"
	
	safetyRepo "federated-social/backend/epics/safety/repository"
	safetyService "federated-social/backend/epics/safety/service"
)

type FollowService struct {
	followRepo       *repository.FollowRepository
	userRepo         *identityRepo.UserRepository
	notificationRepo *repository.NotificationRepository
	blockService     *safetyService.BlockService
}

func NewFollowService() *FollowService {
	return &FollowService{
		followRepo:       repository.NewFollowRepository(),
		userRepo:         identityRepo.NewUserRepository(),
		notificationRepo: repository.NewNotificationRepository(),
		blockService:     safetyService.NewBlockService(safetyRepo.NewBlockRepository()),
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

	// Check if blocked (Bidirectional)
	// 1. Is followingID blocked by followerID?
	blocked, err := s.blockService.IsBlocked(ctx, followerID, followingID)
	if err != nil {
		return err
	}
	if blocked {
		return errors.New("cannot follow a user you have blocked")
	}

	// 2. Is followerID blocked by followingID?
	blockedBy, err := s.blockService.IsBlocked(ctx, followingID, followerID)
	if err != nil {
		return err
	}
	if blockedBy {
		return errors.New("cannot follow this user")
	}

	if err := s.followRepo.Follow(ctx, followerID, followingID); err != nil {
		return err
	}

	// Create notification for the user being followed
	// notification := &models.Notification{
	// 	UserID:        followingID,
	// 	Type:          "follow",
	// 	RelatedUserID: followerID,
	// }
	// s.notificationRepo.CreateNotification(ctx, notification)

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
