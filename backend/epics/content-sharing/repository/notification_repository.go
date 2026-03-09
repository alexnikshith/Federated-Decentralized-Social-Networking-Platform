package repository

import (
	"context"
	"federated-social/backend/database"
	"federated-social/backend/epics/content-sharing/models"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type NotificationRepository struct {
	collection *mongo.Collection
}

func NewNotificationRepository() *NotificationRepository {
	return &NotificationRepository{
		collection: database.GetCollection("notifications"),
	}
}

// CreateIndexes creates necessary indexes for notifications
func (r *NotificationRepository) CreateIndexes(ctx context.Context) error {
	indexes := []mongo.IndexModel{
		{
			Keys: bson.D{
				{Key: "user_id", Value: 1},
				{Key: "created_at", Value: -1},
			},
		},
		{
			Keys: bson.D{
				{Key: "user_id", Value: 1},
				{Key: "is_read", Value: 1},
			},
		},
	}

	_, err := r.collection.Indexes().CreateMany(ctx, indexes)
	return err
}

// CreateNotification creates a new notification
func (r *NotificationRepository) CreateNotification(ctx context.Context, notification *models.Notification) error {
	notification.CreatedAt = time.Now()
	notification.IsRead = false

	result, err := r.collection.InsertOne(ctx, notification)
	if err != nil {
		return err
	}

	notification.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

// GetNotifications retrieves a paginated list of notifications for a user
// Notifications are sorted by creation date in descending order (newest first).
func (r *NotificationRepository) GetNotifications(ctx context.Context, userID primitive.ObjectID, limit int64) ([]models.Notification, error) {
	filter := bson.M{"user_id": userID}
	opts := options.Find().
		SetSort(bson.D{{Key: "created_at", Value: -1}}).
		SetLimit(limit)

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var notifications []models.Notification
	if err = cursor.All(ctx, &notifications); err != nil {
		return nil, err
	}

	return notifications, nil
}

// MarkAsRead marks a notification as read
func (r *NotificationRepository) MarkAsRead(ctx context.Context, notificationID primitive.ObjectID) error {
	_, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": notificationID},
		bson.M{"$set": bson.M{"is_read": true}},
	)
	return err
}

// MarkAllAsRead marks all notifications for a user as read
func (r *NotificationRepository) MarkAllAsRead(ctx context.Context, userID primitive.ObjectID) error {
	_, err := r.collection.UpdateMany(
		ctx,
		bson.M{"user_id": userID, "is_read": false},
		bson.M{"$set": bson.M{"is_read": true}},
	)
	return err
}

// GetUnreadCount returns the count of unread notifications for a user
func (r *NotificationRepository) GetUnreadCount(ctx context.Context, userID primitive.ObjectID) (int64, error) {
	count, err := r.collection.CountDocuments(ctx, bson.M{
		"user_id": userID,
		"is_read": false,
	})
	return count, err
}

// DeleteUserNotifications permanently deletes all notifications for a user
func (r *NotificationRepository) DeleteUserNotifications(ctx context.Context, userID primitive.ObjectID) error {
	_, err := r.collection.DeleteMany(ctx, bson.M{"user_id": userID})
	return err
}

// UpdateNotificationType modifies the type of an existing notification
func (r *NotificationRepository) UpdateNotificationType(ctx context.Context, userID, relatedUserID primitive.ObjectID, oldType, newType string) error {
	_, err := r.collection.UpdateMany(
		ctx,
		bson.M{"user_id": userID, "related_user_id": relatedUserID, "type": oldType},
		bson.M{"$set": bson.M{"type": newType}},
	)
	return err
}

// DeleteNotificationByParams removes a specific notification based on matching params
func (r *NotificationRepository) DeleteNotificationByParams(ctx context.Context, userID, relatedUserID primitive.ObjectID, nType string) error {
	_, err := r.collection.DeleteMany(
		ctx,
		bson.M{"user_id": userID, "related_user_id": relatedUserID, "type": nType},
	)
	return err
}
