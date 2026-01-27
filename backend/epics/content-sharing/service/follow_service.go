package service

import (
	"context"
	"federated-social/backend/epics/content-sharing/repository"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type FollowService struct {
	followRepo       *repository.FollowRepository
	notificationRepo *repository.NotificationRepository
}

func NewFollowService() *FollowService {
	return &FollowService{
		followRepo:       repository.NewFollowRepository(),
		notificationRepo: repository.NewNotificationRepository(),
	}
}

// Follow creates a follow relationship
func (s *FollowService) Follow(ctx context.Context, followerID, followingID primitive.ObjectID) error {
	if followerID == followingID {
		return nil // Cannot follow yourself
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
