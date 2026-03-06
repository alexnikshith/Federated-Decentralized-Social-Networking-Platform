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

type StoryRepository struct {
	collection *mongo.Collection
}

func NewStoryRepository() *StoryRepository {
	return &StoryRepository{
		collection: database.GetCollection("stories"),
	}
}

// CreateIndexes ensures stories expire automatically and author queries are fast
func (r *StoryRepository) CreateIndexes(ctx context.Context) error {
	indexes := []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "author_id", Value: 1}},
			Options: options.Index().SetName("idx_author_id"),
		},
		{
			Keys:    bson.D{{Key: "expires_at", Value: 1}},
			Options: options.Index().SetExpireAfterSeconds(0).SetName("idx_ttl_expires_at"),
		},
	}

	_, err := r.collection.Indexes().CreateMany(ctx, indexes)
	return err
}

func (r *StoryRepository) CreateStory(ctx context.Context, story *models.Story) error {
	story.CreatedAt = time.Now()
	if story.ExpiresAt.IsZero() {
		story.ExpiresAt = story.CreatedAt.Add(24 * time.Hour) // Default 24h expiration
	}
	result, err := r.collection.InsertOne(ctx, story)
	if err == nil {
		story.ID = result.InsertedID.(primitive.ObjectID)
	}
	return err
}

// GetActiveStories retrieves non-expired stories from followed users (simplified: all active for now)
// In a full implementation, this should filter by Follows.
func (r *StoryRepository) GetActiveStories(ctx context.Context) ([]*models.Story, error) {
	now := time.Now()
	filter := bson.M{
		"expires_at": bson.M{"$gt": now},
	}

	opts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}})

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var stories []*models.Story
	err = cursor.All(ctx, &stories)
	return stories, err
}

func (r *StoryRepository) GetStoryByID(ctx context.Context, id primitive.ObjectID) (*models.Story, error) {
	var story models.Story
	err := r.collection.FindOne(ctx, bson.M{"_id": id}).Decode(&story)
	return &story, err
}

func (r *StoryRepository) DeleteStory(ctx context.Context, id primitive.ObjectID) error {
	_, err := r.collection.DeleteOne(ctx, bson.M{"_id": id})
	return err
}

// DeleteStoriesByAuthor deletes all stories created by a specific user
func (r *StoryRepository) DeleteStoriesByAuthor(ctx context.Context, authorID primitive.ObjectID) error {
	_, err := r.collection.DeleteMany(ctx, bson.M{"author_id": authorID})
	return err
}

// LikeStory adds userID to the story's likes array (idempotent via $addToSet)
func (r *StoryRepository) LikeStory(ctx context.Context, storyID primitive.ObjectID, userID string) error {
	_, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": storyID},
		bson.M{"$addToSet": bson.M{"likes": userID}},
	)
	return err
}

// UnlikeStory removes userID from the story's likes array
func (r *StoryRepository) UnlikeStory(ctx context.Context, storyID primitive.ObjectID, userID string) error {
	_, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": storyID},
		bson.M{"$pull": bson.M{"likes": userID}},
	)
	return err
}
