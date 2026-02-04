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
	likesCollection    *mongo.Collection
	commentsCollection *mongo.Collection
	followsCollection  *mongo.Collection
	postsCollection    *mongo.Collection
}

func NewReportRepository() *ReportRepository {
	return &ReportRepository{
		collection:         database.DB.Collection("user_activity"),
		likesCollection:    database.GetCollection("likes"),
		commentsCollection: database.GetCollection("comments"),
		followsCollection:  database.GetCollection("follows"),
		postsCollection:    database.GetCollection("posts"),
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

// GetInteractions retrieves interaction stats (likes, comments, follows, posts) for a user within a date range
func (r *ReportRepository) GetInteractions(ctx context.Context, userID primitive.ObjectID, startDate, endDate time.Time) ([]models.DailyInteraction, error) {
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
