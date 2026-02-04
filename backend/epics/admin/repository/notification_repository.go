package repository

import (
	"context"
	"federated-social/backend/database"
	"federated-social/backend/epics/admin/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type AdminNotificationRepository struct {
	collection *mongo.Collection
}

func NewAdminNotificationRepository() *AdminNotificationRepository {
	return &AdminNotificationRepository{
		collection: database.GetCollection("admin_notifications"),
	}
}

func (r *AdminNotificationRepository) CreateNotification(ctx context.Context, notification *models.AdminNotification) error {
	_, err := r.collection.InsertOne(ctx, notification)
	return err
}

func (r *AdminNotificationRepository) GetNotifications(ctx context.Context, limit int64, offset int64) ([]models.AdminNotification, error) {
	opts := options.Find().SetLimit(limit).SetSkip(offset).SetSort(bson.M{"created_at": -1})
	cursor, err := r.collection.Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var notifications []models.AdminNotification
	if err = cursor.All(ctx, &notifications); err != nil {
		return nil, err
	}
	return notifications, nil
}

func (r *AdminNotificationRepository) GetPendingNotifications(ctx context.Context) ([]models.AdminNotification, error) {
	filter := bson.M{"is_resolved": false}
	opts := options.Find().SetSort(bson.M{"created_at": -1})
	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var notifications []models.AdminNotification
	if err = cursor.All(ctx, &notifications); err != nil {
		return nil, err
	}
	return notifications, nil
}

func (r *AdminNotificationRepository) UpdateResolutionStatus(ctx context.Context, id primitive.ObjectID, isResolved bool) error {
	filter := bson.M{"_id": id}
	update := bson.M{"$set": bson.M{"is_resolved": isResolved}}
	_, err := r.collection.UpdateOne(ctx, filter, update)
	return err
}
