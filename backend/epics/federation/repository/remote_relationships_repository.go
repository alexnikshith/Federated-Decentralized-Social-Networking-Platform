package repository

import (
	"context"
	"federated-social/backend/database"
	"federated-social/backend/epics/federation/models"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type RemoteRelationshipsRepository struct {
	remoteFollows   *mongo.Collection
	remoteFollowers *mongo.Collection
}

func NewRemoteRelationshipsRepository() *RemoteRelationshipsRepository {
	return &RemoteRelationshipsRepository{
		remoteFollows:   database.GetCollection("remote_follows"),
		remoteFollowers: database.GetCollection("remote_followers"),
	}
}

// CreateIndexes creates necessary indexes for remote relationship collections
func (r *RemoteRelationshipsRepository) CreateIndexes(ctx context.Context) error {
	// Clean up any legacy/incorrect indexes that may exist in the database (e.g., from old code)
	// These indexes were from previous implementations and can cause duplicate key errors
	legacyIndexes := []string{
		"activity_id_1",
		"follower_actor_id_1_following_actor_id_1",
		"origin_instance_1",
		"status_1",
	}

	for _, indexName := range legacyIndexes {
		_, err := r.remoteFollows.Indexes().DropOne(ctx, indexName)
		if err != nil {
			// Ignore errors - index might not exist, which is fine
			// log.Printf("Note: Could not drop legacy index %s (may not exist): %v", indexName, err)
		}
	}

	// Remote Follows Indexes
	followsIndexes := []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "local_user_id", Value: 1}, {Key: "remote_actor_id", Value: 1}},
			Options: options.Index().SetUnique(true),
		},
		{
			Keys: bson.D{{Key: "local_user_id", Value: 1}},
		},
	}

	if _, err := r.remoteFollows.Indexes().CreateMany(ctx, followsIndexes); err != nil {
		return err
	}

	// Remote Followers Indexes
	followersIndexes := []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "local_user_id", Value: 1}, {Key: "remote_actor_id", Value: 1}},
			Options: options.Index().SetUnique(true),
		},
		{
			Keys: bson.D{{Key: "local_user_id", Value: 1}},
		},
		{
			Keys: bson.D{{Key: "remote_instance", Value: 1}},
		},
	}

	if _, err := r.remoteFollowers.Indexes().CreateMany(ctx, followersIndexes); err != nil {
		return err
	}

	return nil
}

// AddRemoteFollow records that a local user follows a remote user
func (r *RemoteRelationshipsRepository) AddRemoteFollow(ctx context.Context, follow *models.RemoteFollow) error {
	follow.CreatedAt = time.Now()

	// Upsert to prevent duplicates
	filter := bson.M{
		"local_user_id":   follow.LocalUserID,
		"remote_actor_id": follow.RemoteActorID,
	}
	update := bson.M{
		"$set": bson.M{
			"remote_username": follow.RemoteUsername,
			"remote_instance": follow.RemoteInstance,
			"created_at":      follow.CreatedAt,
		},
	}

	_, err := r.remoteFollows.UpdateOne(ctx, filter, update, options.Update().SetUpsert(true))
	return err
}

// AddRemoteFollower records that a remote user follows a local user
func (r *RemoteRelationshipsRepository) AddRemoteFollower(ctx context.Context, follower *models.RemoteFollower) error {
	follower.CreatedAt = time.Now()

	filter := bson.M{
		"local_user_id":   follower.LocalUserID,
		"remote_actor_id": follower.RemoteActorID,
	}
	update := bson.M{
		"$set": bson.M{
			"remote_instance": follower.RemoteInstance,
			"created_at":      follower.CreatedAt,
		},
	}

	_, err := r.remoteFollowers.UpdateOne(ctx, filter, update, options.Update().SetUpsert(true))
	return err
}

// GetRemoteFollowing returns all remote users that a local user follows
func (r *RemoteRelationshipsRepository) GetRemoteFollowing(ctx context.Context, localUserID primitive.ObjectID) ([]models.RemoteFollow, error) {
	cursor, err := r.remoteFollows.Find(ctx, bson.M{"local_user_id": localUserID})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var follows []models.RemoteFollow
	if err := cursor.All(ctx, &follows); err != nil {
		return nil, err
	}
	return follows, nil
}

// GetRemoteFollowers returns all remote users following a local user
func (r *RemoteRelationshipsRepository) GetRemoteFollowers(ctx context.Context, localUserID primitive.ObjectID) ([]models.RemoteFollower, error) {
	cursor, err := r.remoteFollowers.Find(ctx, bson.M{"local_user_id": localUserID})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var followers []models.RemoteFollower
	if err := cursor.All(ctx, &followers); err != nil {
		return nil, err
	}
	return followers, nil
}

// RemoveRemoteFollow removes a remote follow
func (r *RemoteRelationshipsRepository) RemoveRemoteFollow(ctx context.Context, localUserID primitive.ObjectID, remoteActorID, username, instance string) error {
	filter := bson.M{
		"local_user_id": localUserID,
		"$or": []bson.M{
			{"remote_actor_id": remoteActorID},
			{"remote_username": username, "remote_instance": instance},
		},
	}
	_, err := r.remoteFollows.DeleteMany(ctx, filter)
	return err
}

// RemoveRemoteFollower removes a remote follower
func (r *RemoteRelationshipsRepository) RemoveRemoteFollower(ctx context.Context, localUserID primitive.ObjectID, remoteActorID string) error {
	_, err := r.remoteFollowers.DeleteOne(ctx, bson.M{
		"local_user_id":   localUserID,
		"remote_actor_id": remoteActorID,
	})
	return err
}

// GetFollowerInstances returns unique instances that have users following the local user
func (r *RemoteRelationshipsRepository) GetFollowerInstances(ctx context.Context, localUserID primitive.ObjectID) ([]string, error) {
	// Distinct instances for followers of this user
	values, err := r.remoteFollowers.Distinct(ctx, "remote_instance", bson.M{"local_user_id": localUserID})
	if err != nil {
		return nil, err
	}

	var instances []string
	for _, v := range values {
		if s, ok := v.(string); ok {
			instances = append(instances, s)
		}
	}

	return instances, nil
}

// CountRemoteFollowing returns the count of remote users a local user is following
func (r *RemoteRelationshipsRepository) CountRemoteFollowing(ctx context.Context, localUserID primitive.ObjectID) (int64, error) {
	count, err := r.remoteFollows.CountDocuments(ctx, bson.M{"local_user_id": localUserID})
	return count, err
}

// CountRemoteFollowers returns the count of remote users following a local user
func (r *RemoteRelationshipsRepository) CountRemoteFollowers(ctx context.Context, localUserID primitive.ObjectID) (int64, error) {
	count, err := r.remoteFollowers.CountDocuments(ctx, bson.M{"local_user_id": localUserID})
	return count, err
}
