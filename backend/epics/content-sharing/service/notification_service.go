package service

import (
	"context"
	"federated-social/backend/epics/content-sharing/dto"
	"federated-social/backend/epics/content-sharing/models"
	"federated-social/backend/epics/content-sharing/repository"
	"federated-social/backend/pkg/websocket"
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

// CreateNotification creates a new notification for a user
func (s *NotificationService) CreateNotification(ctx context.Context, userID, relatedUserID primitive.ObjectID, notifType string, relatedEntityID primitive.ObjectID, content string, relatedUserName string, relatedUserAvatar string) error {
	notification := &models.Notification{
		UserID:            userID,
		RelatedUserID:     relatedUserID,
		Type:              notifType,
		RelatedEntityID:   relatedEntityID,
		CommentContent:    content,
		RelatedUserName:   relatedUserName,
		RelatedUserAvatar: relatedUserAvatar,
	}
	if err := s.notificationRepo.CreateNotification(ctx, notification); err != nil {
		return err
	}

	// Broadcast via WebSocket if GlobalHub is available
	if websocket.GlobalHub != nil {
		websocket.GlobalHub.BroadcastToUser(userID.Hex(), "new_notification", notification)
	}

	return nil
}

// GetNotifications retrieves notifications for a user with user information
// It fetches raw notifications then enriches them with details about the related users (name, avatar).
// It also filters out notifications from deactivated users to keep the list clean.
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

	// Build notification responses (filter out notifications from deactivated users)
	notificationResponses := make([]dto.NotificationResponse, 0)
	for _, notif := range notifications {
		user, ok := users[notif.RelatedUserID]
		userName := "Unknown User"
		userAvatar := ""

		// Skip notifications from deactivated users
		if ok && user != nil {
			if user.IsDeactivated {
				continue
			}
			userName = user.Username
			userAvatar = user.AvatarURL
		} else {
			// Fallback to persisted name/avatar if local user not found (e.g. federated user)
			if notif.RelatedUserName != "" {
				userName = notif.RelatedUserName
			}
			if notif.RelatedUserAvatar != "" {
				userAvatar = notif.RelatedUserAvatar
			}
		}

		notificationResponses = append(notificationResponses, dto.NotificationResponse{
			ID:                   notif.ID,
			Type:                 notif.Type,
			RelatedEntityID:      notif.RelatedEntityID,
			RelatedUserID:        notif.RelatedUserID,
			RelatedUserName:      userName,
			RelatedUserAvatar:    userAvatar,
			CommentContent:       notif.CommentContent,
			ParentCommentID:      notif.ParentCommentID,
			ParentCommentContent: notif.ParentCommentContent,
			ParentUserName:       notif.ParentUserName,
			IsRead:               notif.IsRead,
			CreatedAt:            notif.CreatedAt,
		})
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
