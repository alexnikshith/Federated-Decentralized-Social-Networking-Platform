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

type FollowRepository struct {
	collection *mongo.Collection
}

func NewFollowRepository() *FollowRepository {
	return &FollowRepository{
		collection: database.GetCollection("follows"),
	}
}

// CreateIndexes creates necessary indexes for follows
func (r *FollowRepository) CreateIndexes(ctx context.Context) error {
	indexes := []mongo.IndexModel{
		{
			Keys: bson.D{
				{Key: "follower_id", Value: 1},
				{Key: "following_id", Value: 1},
			},
			Options: options.Index().SetUnique(true), // Prevent duplicate follows
		},
		{
			Keys: bson.D{{Key: "follower_id", Value: 1}},
		},
		{
			Keys: bson.D{{Key: "following_id", Value: 1}},
		},
	}

	_, err := r.collection.Indexes().CreateMany(ctx, indexes)
	return err
}

// Follow creates a follow relationship
func (r *FollowRepository) Follow(ctx context.Context, followerID, followingID primitive.ObjectID) error {
	follow := models.Follow{
		FollowerID:  followerID,
		FollowingID: followingID,
		CreatedAt:   time.Now(),
	}

	_, err := r.collection.InsertOne(ctx, follow)
	return err
}

// Unfollow removes a follow relationship
func (r *FollowRepository) Unfollow(ctx context.Context, followerID, followingID primitive.ObjectID) error {
	_, err := r.collection.DeleteOne(ctx, bson.M{
		"follower_id":  followerID,
		"following_id": followingID,
	})
	return err
}

// IsFollowing checks if followerID follows followingID
func (r *FollowRepository) IsFollowing(ctx context.Context, followerID, followingID primitive.ObjectID) (bool, error) {
	count, err := r.collection.CountDocuments(ctx, bson.M{
		"follower_id":  followerID,
		"following_id": followingID,
	})
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

// GetFollowingIDs returns list of user IDs that the given user follows
func (r *FollowRepository) GetFollowingIDs(ctx context.Context, userID primitive.ObjectID) ([]primitive.ObjectID, error) {
	filter := bson.M{"follower_id": userID}
	cursor, err := r.collection.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var follows []models.Follow
	if err = cursor.All(ctx, &follows); err != nil {
		return nil, err
	}

	followingIDs := make([]primitive.ObjectID, len(follows))
	for i, follow := range follows {
		followingIDs[i] = follow.FollowingID
	}

	return followingIDs, nil
}

// GetFollowerIDs returns list of user IDs who follow the given user
func (r *FollowRepository) GetFollowerIDs(ctx context.Context, userID primitive.ObjectID) ([]primitive.ObjectID, error) {
	filter := bson.M{"following_id": userID}
	cursor, err := r.collection.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var follows []models.Follow
	if err = cursor.All(ctx, &follows); err != nil {
		return nil, err
	}

	followerIDs := make([]primitive.ObjectID, len(follows))
	for i, follow := range follows {
		followerIDs[i] = follow.FollowerID
	}

	return followerIDs, nil
}

// DeleteAllFollows removes all follow relationships where the user is either a follower or following
func (r *FollowRepository) DeleteAllFollows(ctx context.Context, userID primitive.ObjectID) error {
	_, err := r.collection.DeleteMany(ctx, bson.M{
		"$or": []bson.M{
			{"follower_id": userID},
			{"following_id": userID},
		},
	})
	return err
}

// CountFollowers returns the number of followers for a user
func (r *FollowRepository) CountFollowers(ctx context.Context, userID primitive.ObjectID) (int64, error) {
	return r.collection.CountDocuments(ctx, bson.M{"following_id": userID})
}

// CountFollowing returns the number of users that the given user follows
func (r *FollowRepository) CountFollowing(ctx context.Context, userID primitive.ObjectID) (int64, error) {
	return r.collection.CountDocuments(ctx, bson.M{"follower_id": userID})
}
