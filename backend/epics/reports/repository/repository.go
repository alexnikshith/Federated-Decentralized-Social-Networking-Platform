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
	collection        *mongo.Collection
	reportsCollection *mongo.Collection
	usersCollection   *mongo.Collection
}

func NewReportRepository() *ReportRepository {
	return &ReportRepository{
		collection:        database.DB.Collection("user_activity"),
		reportsCollection: database.DB.Collection("user_reports"),
		usersCollection:   database.DB.Collection("users"),
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

// CreateUserReport creates a new user report
func (r *ReportRepository) CreateUserReport(ctx context.Context, report models.UserReport) error {
	_, err := r.reportsCollection.InsertOne(ctx, report)
	return err
}

// CountReports counts reports for a specific user
func (r *ReportRepository) CountReports(ctx context.Context, reportedID primitive.ObjectID) (int64, error) {
	filter := bson.M{"reported_id": reportedID}
	return r.reportsCollection.CountDocuments(ctx, filter)
}

// DeactivateUser deactivates a user account
func (r *ReportRepository) DeactivateUser(ctx context.Context, userID primitive.ObjectID) error {
	filter := bson.M{"_id": userID}
	update := bson.M{"$set": bson.M{"is_active": false}}
	_, err := r.usersCollection.UpdateOne(ctx, filter, update)
	return err
}

// GetReports retrieves all reports (for admin)
func (r *ReportRepository) GetReports(ctx context.Context) ([]models.UserReportResponse, error) {
	pipeline := []bson.M{
		{"$sort": bson.M{"created_at": -1}},
		{"$lookup": bson.M{
			"from":         "users",
			"localField":   "reported_id",
			"foreignField": "_id",
			"as":           "user_details",
		}},
		{"$unwind": bson.M{
			"path":                       "$user_details",
			"preserveNullAndEmptyArrays": true,
		}},
	}

	cursor, err := r.reportsCollection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var reports []models.UserReportResponse
	if err := cursor.All(ctx, &reports); err != nil {
		return nil, err
	}
	return reports, nil
}

// GetInteractionsReceived retrieves interactions received by the user
func (r *ReportRepository) GetInteractionsReceived(ctx context.Context, userID primitive.ObjectID, startDate, endDate time.Time) ([]models.DailyInteraction, error) {
	// Stub implementation to fix build
	return []models.DailyInteraction{}, nil
}

// GetInteractionsMade retrieves interactions made by the user
func (r *ReportRepository) GetInteractionsMade(ctx context.Context, userID primitive.ObjectID, startDate, endDate time.Time) ([]models.DailyInteraction, error) {
	// Stub implementation to fix build
	return []models.DailyInteraction{}, nil
}
