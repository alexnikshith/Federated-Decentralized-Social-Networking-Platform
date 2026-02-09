package repository

import (
	"context"
	"federated-social/backend/database"
	"federated-social/backend/epics/federation/models"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type RemoteUserRepository struct {
	remoteUsers *mongo.Collection
}

func NewRemoteUserRepository() *RemoteUserRepository {
	return &RemoteUserRepository{
		remoteUsers: database.GetCollection("remote_users"),
	}
}

// CreateIndexes creates necessary indexes for remote_users collection
func (r *RemoteUserRepository) CreateIndexes(ctx context.Context) error {
	indexes := []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "actor_id", Value: 1}},
			Options: options.Index().SetUnique(true),
		},
		{
			Keys: bson.D{{Key: "instance", Value: 1}},
		},
		{
			Keys: bson.D{{Key: "username", Value: 1}},
		},
	}

	_, err := r.remoteUsers.Indexes().CreateMany(ctx, indexes)
	return err
}

// UpsertRemoteUser creates or updates a remote user
func (r *RemoteUserRepository) UpsertRemoteUser(ctx context.Context, remoteUser *models.RemoteUser) error {
	remoteUser.FetchedAt = time.Now()

	opts := options.Update().SetUpsert(true)
	update := bson.M{
		"$set": bson.M{
			"username":     remoteUser.Username,
			"display_name": remoteUser.DisplayName,
			"instance":     remoteUser.Instance,
			"avatar_url":   remoteUser.AvatarURL,
			"bio":          remoteUser.Bio,
			"fetched_at":   remoteUser.FetchedAt,
		},
		"$setOnInsert": bson.M{
			"created_at": time.Now(),
		},
	}

	_, err := r.remoteUsers.UpdateOne(
		ctx,
		bson.M{"actor_id": remoteUser.ActorID},
		update,
		opts,
	)
	return err
}

// GetRemoteUserByActorID retrieves a remote user by actor ID
func (r *RemoteUserRepository) GetRemoteUserByActorID(ctx context.Context, actorID string) (*models.RemoteUser, error) {
	var remoteUser models.RemoteUser
	err := r.remoteUsers.FindOne(ctx, bson.M{"actor_id": actorID}).Decode(&remoteUser)
	if err != nil {
		return nil, err
	}
	return &remoteUser, nil
}

// ListRemoteUsersByInstance retrieves all remote users from a specific instance
func (r *RemoteUserRepository) ListRemoteUsersByInstance(ctx context.Context, instance string) ([]models.RemoteUser, error) {
	cursor, err := r.remoteUsers.Find(ctx, bson.M{"instance": instance})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var users []models.RemoteUser
	if err := cursor.All(ctx, &users); err != nil {
		return nil, err
	}
	return users, nil
}

// DeleteRemoteUser deletes a remote user by actor ID
func (r *RemoteUserRepository) DeleteRemoteUser(ctx context.Context, actorID string) error {
	_, err := r.remoteUsers.DeleteOne(ctx, bson.M{"actor_id": actorID})
	return err
}

// GetRemoteUserByUsernameAndInstance retrieves a remote user by username and instance
func (r *RemoteUserRepository) GetRemoteUserByUsernameAndInstance(ctx context.Context, username, instance string) (*models.RemoteUser, error) {
	var remoteUser models.RemoteUser
	err := r.remoteUsers.FindOne(ctx, bson.M{
		"username": username,
		"instance": instance,
	}).Decode(&remoteUser)
	if err != nil {
		return nil, err
	}
	return &remoteUser, nil
}
