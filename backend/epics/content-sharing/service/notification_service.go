package service

import (
	"context"
	"federated-social/backend/epics/content-sharing/dto"
	"federated-social/backend/epics/content-sharing/repository"
	"log"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type NotificationService struct {
	notificationRepo *repository.NotificationRepository
	searchRepo       *repository.SearchRepository
}

func NewNotificationService() *NotificationService {
	return &NotificationService{
		notificationRepo: repository.NewNotificationRepository(),
		searchRepo:       repository.NewSearchRepository(),
	}
}

// GetNotifications retrieves notifications for a user with user information
func (s *NotificationService) GetNotifications(ctx context.Context, userID primitive.ObjectID, limit int64) ([]dto.NotificationResponse, error) {
	notifications, err := s.notificationRepo.GetNotifications(ctx, userID, limit)
	if err != nil {
		return nil, err
	}
	log.Printf("DEBUG: NotificationService found %d notifications for user %v", len(notifications), userID.Hex())

	// Get unique related user IDs
	userIDs := make([]primitive.ObjectID, 0)
	userIDSet := make(map[primitive.ObjectID]bool)
	for _, notif := range notifications {
		if !userIDSet[notif.RelatedUserID] {
			userIDs = append(userIDs, notif.RelatedUserID)
			userIDSet[notif.RelatedUserID] = true
		}
	}

	// Fetch user information
	users, err := s.searchRepo.GetUsersByIDs(ctx, userIDs)
	if err != nil {
		return nil, err
	}

	// Build notification responses
	notificationResponses := make([]dto.NotificationResponse, len(notifications))
	for i, notif := range notifications {
		user, ok := users[notif.RelatedUserID]
		userName := "Unknown User"
		userAvatar := ""
		if ok && user != nil {
			userName = user.Username
			userAvatar = user.AvatarURL
		}

		notificationResponses[i] = dto.NotificationResponse{
			ID:                notif.ID,
			Type:              notif.Type,
			RelatedEntityID:   notif.RelatedEntityID,
			RelatedUserID:     notif.RelatedUserID,
			RelatedUserName:   userName,
			RelatedUserAvatar: userAvatar,
			IsRead:            notif.IsRead,
			CreatedAt:         notif.CreatedAt,
		}
	}

	return notificationResponses, nil
}

// MarkAsRead marks a notification as read
func (s *NotificationService) MarkAsRead(ctx context.Context, notificationID primitive.ObjectID) error {
	return s.notificationRepo.MarkAsRead(ctx, notificationID)
}

// MarkAllAsRead marks all notifications for a user as read
func (s *NotificationService) MarkAllAsRead(ctx context.Context, userID primitive.ObjectID) error {
	return s.notificationRepo.MarkAllAsRead(ctx, userID)
}

// GetUnreadCount returns the count of unread notifications
func (s *NotificationService) GetUnreadCount(ctx context.Context, userID primitive.ObjectID) (int64, error) {
	return s.notificationRepo.GetUnreadCount(ctx, userID)
}
