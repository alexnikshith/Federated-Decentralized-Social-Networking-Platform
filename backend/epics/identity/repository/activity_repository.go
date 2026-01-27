package repository

import (
	"context"
	"federated-social/backend/database"
	"federated-social/backend/epics/identity/models"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type ActivityRepository struct {
	collection *mongo.Collection
}

func NewActivityRepository() *ActivityRepository {
	return &ActivityRepository{
		collection: database.GetCollection("activity_logs"),
	}
}

// LogActivity creates a new activity log entry
func (r *ActivityRepository) LogActivity(ctx context.Context, log *models.ActivityLog) error {
	log.Timestamp = time.Now()
	_, err := r.collection.InsertOne(ctx, log)
	return err
}

// GetUserActivity retrieves activity logs for a user
func (r *ActivityRepository) GetUserActivity(ctx context.Context, userID primitive.ObjectID, limit int64) ([]models.ActivityLog, error) {
	opts := options.Find().SetSort(bson.D{bson.E{Key: "timestamp", Value: -1}}).SetLimit(limit)

	cursor, err := r.collection.Find(ctx, bson.M{"user_id": userID}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var activities []models.ActivityLog
	if err := cursor.All(ctx, &activities); err != nil {
		return nil, err
	}

	return activities, nil
}
