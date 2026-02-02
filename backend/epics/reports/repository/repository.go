package repository

import (
	"context"
	"federated-social/backend/database"
	"federated-social/backend/epics/reports/models"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type ReportRepository struct {
	collection *mongo.Collection
}

func NewReportRepository() *ReportRepository {
	return &ReportRepository{
		collection: database.DB.Collection("user_activity"),
	}
}

// IncrementActivity increments the activity minutes for a user on a specific date
func (r *ReportRepository) IncrementActivity(ctx context.Context, userID primitive.ObjectID, date time.Time) error {
	// Normalize date to midnight (UTC)
	normalizedDate := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, time.UTC)

	filter := bson.M{
		"user_id": userID,
		"date":    normalizedDate,
	}

	update := bson.M{
		"$inc": bson.M{"minutes": 1},
		"$setOnInsert": bson.M{
			"created_at": time.Now(),
		},
		"$set": bson.M{
			"updated_at": time.Now(),
		},
	}

	opts := options.Update().SetUpsert(true)

	_, err := r.collection.UpdateOne(ctx, filter, update, opts)
	return err
}

// GetActivity retrieves activity stats for a user within a date range
func (r *ReportRepository) GetActivity(ctx context.Context, userID primitive.ObjectID, startDate, endDate time.Time) ([]models.DailyActivity, error) {
	filter := bson.M{
		"user_id": userID,
		"date": bson.M{
			"$gte": startDate,
			"$lte": endDate,
		},
	}

	opts := options.Find().SetSort(bson.M{"date": 1})

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var activities []models.DailyActivity
	if err := cursor.All(ctx, &activities); err != nil {
		return nil, err
	}

	return activities, nil
}
