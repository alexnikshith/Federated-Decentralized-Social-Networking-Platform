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
	collection         *mongo.Collection
	reportsCollection  *mongo.Collection
	usersCollection    *mongo.Collection
	likesCollection    *mongo.Collection
	commentsCollection *mongo.Collection
	followsCollection  *mongo.Collection
	postsCollection    *mongo.Collection
}

func NewReportRepository() *ReportRepository {
	return &ReportRepository{
		collection:         database.DB.Collection("user_activity"),
		reportsCollection:  database.DB.Collection("user_reports"),
		usersCollection:    database.DB.Collection("users"),
		likesCollection:    database.GetCollection("likes"),
		commentsCollection: database.GetCollection("comments"),
		followsCollection:  database.GetCollection("follows"),
		postsCollection:    database.GetCollection("posts"),
	}
}

// IncrementActivity increments the activity minutes for a user on a specific date
// It normalizes the date to midnight UTC to ensure daily aggregation.
// Uses an upsert operation to create the record if it doesn't exist for that day.
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

// GetInteractionsMade retrieves interaction stats (likes given, comments posted, follows initiated, posts created) for a user within a date range
func (r *ReportRepository) GetInteractionsMade(ctx context.Context, userID primitive.ObjectID, startDate, endDate time.Time) ([]models.DailyInteraction, error) {
	// Normalize dates to midnight
	normalizedStart := time.Date(startDate.Year(), startDate.Month(), startDate.Day(), 0, 0, 0, 0, time.UTC)
	normalizedEnd := time.Date(endDate.Year(), endDate.Month(), endDate.Day(), 23, 59, 59, 999999999, time.UTC)

	// Create a map to store daily interactions
	dailyMap := make(map[string]*models.DailyInteraction)

	// Helper to normalize date for grouping
	normalizeDate := func(t time.Time) string {
		return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC).Format("2006-01-02")
	}

	// Aggregate likes (from likes collection)
	likeFilter := bson.M{
		"user_id": userID,
		"created_at": bson.M{
			"$gte": normalizedStart,
			"$lte": normalizedEnd,
		},
	}
	likeCursor, err := r.likesCollection.Find(ctx, likeFilter)
	if err == nil {
		defer likeCursor.Close(ctx)
		for likeCursor.Next(ctx) {
			var like struct {
				CreatedAt time.Time `bson:"created_at"`
			}
			if err := likeCursor.Decode(&like); err == nil {
				dateKey := normalizeDate(like.CreatedAt)
				if dailyMap[dateKey] == nil {
					parsedDate, _ := time.Parse("2006-01-02", dateKey)
					dailyMap[dateKey] = &models.DailyInteraction{
						Date: parsedDate,
					}
				}
				dailyMap[dateKey].Likes++
			}
		}
	}

	// Aggregate comments
	commentFilter := bson.M{
		"user_id": userID,
		"created_at": bson.M{
			"$gte": normalizedStart,
			"$lte": normalizedEnd,
		},
	}
	commentCursor, err := r.commentsCollection.Find(ctx, commentFilter)
	if err == nil {
		defer commentCursor.Close(ctx)
		for commentCursor.Next(ctx) {
			var comment struct {
				CreatedAt time.Time `bson:"created_at"`
			}
			if err := commentCursor.Decode(&comment); err == nil {
				dateKey := normalizeDate(comment.CreatedAt)
				if dailyMap[dateKey] == nil {
					parsedDate, _ := time.Parse("2006-01-02", dateKey)
					dailyMap[dateKey] = &models.DailyInteraction{
						Date: parsedDate,
					}
				}
				dailyMap[dateKey].Comments++
			}
		}
	}

	// Aggregate follows
	followFilter := bson.M{
		"follower_id": userID,
		"created_at": bson.M{
			"$gte": normalizedStart,
			"$lte": normalizedEnd,
		},
	}
	followCursor, err := r.followsCollection.Find(ctx, followFilter)
	if err == nil {
		defer followCursor.Close(ctx)
		for followCursor.Next(ctx) {
			var follow struct {
				CreatedAt time.Time `bson:"created_at"`
			}
			if err := followCursor.Decode(&follow); err == nil {
				dateKey := normalizeDate(follow.CreatedAt)
				if dailyMap[dateKey] == nil {
					parsedDate, _ := time.Parse("2006-01-02", dateKey)
					dailyMap[dateKey] = &models.DailyInteraction{
						Date: parsedDate,
					}
				}
				dailyMap[dateKey].Follows++
			}
		}
	}

	// Aggregate posts
	postFilter := bson.M{
		"author_id": userID,
		"created_at": bson.M{
			"$gte": normalizedStart,
			"$lte": normalizedEnd,
		},
	}
	postCursor, err := r.postsCollection.Find(ctx, postFilter)
	if err == nil {
		defer postCursor.Close(ctx)
		for postCursor.Next(ctx) {
			var post struct {
				CreatedAt time.Time `bson:"created_at"`
			}
			if err := postCursor.Decode(&post); err == nil {
				dateKey := normalizeDate(post.CreatedAt)
				if dailyMap[dateKey] == nil {
					parsedDate, _ := time.Parse("2006-01-02", dateKey)
					dailyMap[dateKey] = &models.DailyInteraction{
						Date: parsedDate,
					}
				}
				dailyMap[dateKey].Posts++
			}
		}
	}

	// Convert map to sorted slice
	var interactions []models.DailyInteraction
	for _, interaction := range dailyMap {
		interactions = append(interactions, *interaction)
	}

	// Sort by date
	for i := 0; i < len(interactions); i++ {
		for j := i + 1; j < len(interactions); j++ {
			if interactions[i].Date.After(interactions[j].Date) {
				interactions[i], interactions[j] = interactions[j], interactions[i]
			}
		}
	}

	return interactions, nil
}

// GetInteractionsReceived retrieves interaction stats (likes/comments received on posts, followers gained) for a user within a date range
func (r *ReportRepository) GetInteractionsReceived(ctx context.Context, userID primitive.ObjectID, startDate, endDate time.Time) ([]models.DailyInteraction, error) {
	// Normalize dates to midnight
	normalizedStart := time.Date(startDate.Year(), startDate.Month(), startDate.Day(), 0, 0, 0, 0, time.UTC)
	normalizedEnd := time.Date(endDate.Year(), endDate.Month(), endDate.Day(), 23, 59, 59, 999999999, time.UTC)

	// Create a map to store daily interactions
	dailyMap := make(map[string]*models.DailyInteraction)

	// Helper to normalize date for grouping
	normalizeDate := func(t time.Time) string {
		return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC).Format("2006-01-02")
	}

	// First, get all posts by the user
	postFilter := bson.M{
		"author_id": userID,
	}
	postCursor, err := r.postsCollection.Find(ctx, postFilter)
	if err != nil {
		return nil, err
	}
	defer postCursor.Close(ctx)

	var userPostIDs []primitive.ObjectID
	postCountByDate := make(map[string]int)

	for postCursor.Next(ctx) {
		var post struct {
			ID        primitive.ObjectID `bson:"_id"`
			CreatedAt time.Time          `bson:"created_at"`
		}
		if err := postCursor.Decode(&post); err == nil {
			userPostIDs = append(userPostIDs, post.ID)

			// Count posts created in the date range
			if post.CreatedAt.After(normalizedStart) && post.CreatedAt.Before(normalizedEnd) {
				dateKey := normalizeDate(post.CreatedAt)
				postCountByDate[dateKey]++
			}
		}
	}

	// Add post counts to daily map
	for dateKey, count := range postCountByDate {
		parsedDate, _ := time.Parse("2006-01-02", dateKey)
		dailyMap[dateKey] = &models.DailyInteraction{
			Date:  parsedDate,
			Posts: count,
		}
	}

	// Aggregate likes on user's posts
	if len(userPostIDs) > 0 {
		likeFilter := bson.M{
			"post_id": bson.M{"$in": userPostIDs},
			"created_at": bson.M{
				"$gte": normalizedStart,
				"$lte": normalizedEnd,
			},
		}
		likeCursor, err := r.likesCollection.Find(ctx, likeFilter)
		if err == nil {
			defer likeCursor.Close(ctx)
			for likeCursor.Next(ctx) {
				var like struct {
					CreatedAt time.Time `bson:"created_at"`
				}
				if err := likeCursor.Decode(&like); err == nil {
					dateKey := normalizeDate(like.CreatedAt)
					if dailyMap[dateKey] == nil {
						parsedDate, _ := time.Parse("2006-01-02", dateKey)
						dailyMap[dateKey] = &models.DailyInteraction{
							Date: parsedDate,
						}
					}
					dailyMap[dateKey].Likes++
				}
			}
		}

		// Aggregate comments on user's posts
		commentFilter := bson.M{
			"post_id": bson.M{"$in": userPostIDs},
			"created_at": bson.M{
				"$gte": normalizedStart,
				"$lte": normalizedEnd,
			},
		}
		commentCursor, err := r.commentsCollection.Find(ctx, commentFilter)
		if err == nil {
			defer commentCursor.Close(ctx)
			for commentCursor.Next(ctx) {
				var comment struct {
					CreatedAt time.Time `bson:"created_at"`
				}
				if err := commentCursor.Decode(&comment); err == nil {
					dateKey := normalizeDate(comment.CreatedAt)
					if dailyMap[dateKey] == nil {
						parsedDate, _ := time.Parse("2006-01-02", dateKey)
						dailyMap[dateKey] = &models.DailyInteraction{
							Date: parsedDate,
						}
					}
					dailyMap[dateKey].Comments++
				}
			}
		}
	}

	// Aggregate followers gained (people who followed this user)
	followFilter := bson.M{
		"following_id": userID, // Changed from follower_id to following_id
		"created_at": bson.M{
			"$gte": normalizedStart,
			"$lte": normalizedEnd,
		},
	}
	followCursor, err := r.followsCollection.Find(ctx, followFilter)
	if err == nil {
		defer followCursor.Close(ctx)
		for followCursor.Next(ctx) {
			var follow struct {
				CreatedAt time.Time `bson:"created_at"`
			}
			if err := followCursor.Decode(&follow); err == nil {
				dateKey := normalizeDate(follow.CreatedAt)
				if dailyMap[dateKey] == nil {
					parsedDate, _ := time.Parse("2006-01-02", dateKey)
					dailyMap[dateKey] = &models.DailyInteraction{
						Date: parsedDate,
					}
				}
				dailyMap[dateKey].Follows++
			}
		}
	}

	// Convert map to sorted slice
	var interactions []models.DailyInteraction
	for _, interaction := range dailyMap {
		interactions = append(interactions, *interaction)
	}

	// Sort by date
	for i := 0; i < len(interactions); i++ {
		for j := i + 1; j < len(interactions); j++ {
			if interactions[i].Date.After(interactions[j].Date) {
				interactions[i], interactions[j] = interactions[j], interactions[i]
			}
		}
	}

	return interactions, nil
}

// GetReportedUserIDs retrieves IDs of users reported by a specific user
func (r *ReportRepository) GetReportedUserIDs(ctx context.Context, reporterID primitive.ObjectID) ([]primitive.ObjectID, error) {
	filter := bson.M{
		"reporter_id": reporterID,
	}

	cursor, err := r.reportsCollection.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var reports []models.UserReport
	if err := cursor.All(ctx, &reports); err != nil {
		return nil, err
	}

	seen := make(map[primitive.ObjectID]bool)
	var ids []primitive.ObjectID

	for _, report := range reports {
		if !seen[report.ReportedID] {
			ids = append(ids, report.ReportedID)
			seen[report.ReportedID] = true
		}
	}

	return ids, nil
}

// IsUserReported checks if a specific user has been reported by another user
func (r *ReportRepository) IsUserReported(ctx context.Context, reporterID, reportedID primitive.ObjectID) (bool, error) {
	filter := bson.M{
		"reporter_id": reporterID,
		"reported_id": reportedID,
	}
	count, err := r.reportsCollection.CountDocuments(ctx, filter)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

// CreateIndexes creates necessary indexes for user reports
func (r *ReportRepository) CreateIndexes(ctx context.Context) error {
	indexes := []mongo.IndexModel{
		{
			Keys: bson.D{
				{Key: "reporter_id", Value: 1},
				{Key: "reported_id", Value: 1},
			},
			Options: options.Index().SetUnique(true),
		},
		{
			Keys: bson.D{{Key: "created_at", Value: -1}},
		},
	}

	_, err := r.reportsCollection.Indexes().CreateMany(ctx, indexes)
	return err
}
