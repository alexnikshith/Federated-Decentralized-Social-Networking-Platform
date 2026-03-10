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

type RemotePostRepository struct {
	remotePosts *mongo.Collection
}

func NewRemotePostRepository() *RemotePostRepository {
	return &RemotePostRepository{
		remotePosts: database.GetCollection("remote_posts"),
	}
}

// CreateIndexes creates necessary indexes for remote_posts collection
func (r *RemotePostRepository) CreateIndexes(ctx context.Context) error {
	indexes := []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "remote_post_id", Value: 1}},
			Options: options.Index().SetUnique(true),
		},
		{
			Keys: bson.D{{Key: "origin_instance", Value: 1}},
		},
		{
			Keys: bson.D{{Key: "received_at", Value: -1}},
		},
		{
			Keys: bson.D{{Key: "created_at", Value: -1}},
		},
		{
			Keys: bson.D{{Key: "author_actor_id", Value: 1}},
		},
	}

	_, err := r.remotePosts.Indexes().CreateMany(ctx, indexes)
	return err
}

// CreateRemotePost creates a new remote post
func (r *RemotePostRepository) CreateRemotePost(ctx context.Context, remotePost *models.RemotePost) error {
	remotePost.ReceivedAt = time.Now()
	remotePost.UpdatedAt = time.Now()

	result, err := r.remotePosts.InsertOne(ctx, remotePost)
	if err != nil {
		return err
	}
	remotePost.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

// UpsertRemotePost creates or updates a remote post
func (r *RemotePostRepository) UpsertRemotePost(ctx context.Context, remotePost *models.RemotePost) error {
	remotePost.UpdatedAt = time.Now()

	opts := options.Update().SetUpsert(true)
	update := bson.M{
		"$set": bson.M{
			"origin_instance": remotePost.OriginInstance,
			"author":          remotePost.Author,
			"author_actor_id": remotePost.AuthorActorID,
			"content":         remotePost.Content,
			"visibility":      remotePost.Visibility,
			"like_count":      remotePost.LikeCount,
			"comment_count":   remotePost.CommentCount,
			"created_at":      remotePost.CreatedAt,
			"updated_at":      remotePost.UpdatedAt,
		},
		"$setOnInsert": bson.M{
			"received_at": time.Now(),
		},
	}

	result, err := r.remotePosts.UpdateOne(
		ctx,
		bson.M{"remote_post_id": remotePost.RemotePostID},
		update,
		opts,
	)
	if err != nil {
		return err
	}

	// If upserted, get the ID
	if result.UpsertedID != nil {
		remotePost.ID = result.UpsertedID.(primitive.ObjectID)
	}

	return nil
}

// GetRemotePostByID retrieves a remote post by its remote post ID
func (r *RemotePostRepository) GetRemotePostByID(ctx context.Context, remotePostID string) (*models.RemotePost, error) {
	var remotePost models.RemotePost
	err := r.remotePosts.FindOne(ctx, bson.M{"remote_post_id": remotePostID}).Decode(&remotePost)
	if err != nil {
		return nil, err
	}
	return &remotePost, nil
}

// GetFederatedFeed retrieves remote posts sorted by received time (newest first)
func (r *RemotePostRepository) GetFederatedFeed(ctx context.Context, limit int64) ([]models.RemotePost, error) {
	opts := options.Find().
		SetSort(bson.D{{Key: "received_at", Value: -1}}).
		SetLimit(limit)

	cursor, err := r.remotePosts.Find(ctx, bson.M{"visibility": "public"}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var posts []models.RemotePost
	if err := cursor.All(ctx, &posts); err != nil {
		return nil, err
	}
	return posts, nil
}

// GetRemotePostsByInstance retrieves remote posts from a specific instance
func (r *RemotePostRepository) GetRemotePostsByInstance(ctx context.Context, instance string, limit int64) ([]models.RemotePost, error) {
	opts := options.Find().
		SetSort(bson.D{{Key: "received_at", Value: -1}}).
		SetLimit(limit)

	cursor, err := r.remotePosts.Find(ctx, bson.M{"origin_instance": instance}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var posts []models.RemotePost
	if err := cursor.All(ctx, &posts); err != nil {
		return nil, err
	}
	return posts, nil
}

// DeleteRemotePost deletes a remote post by remote post ID
func (r *RemotePostRepository) DeleteRemotePost(ctx context.Context, remotePostID string) error {
	_, err := r.remotePosts.DeleteOne(ctx, bson.M{"remote_post_id": remotePostID})
	return err
}

// DeleteRemotePostByLocalID deletes a remote post by its local MongoDB ObjectID.
func (r *RemotePostRepository) DeleteRemotePostByLocalID(ctx context.Context, id primitive.ObjectID) error {
	_, err := r.remotePosts.DeleteOne(ctx, bson.M{"_id": id})
	return err
}

// GetRemotePostByObjectID retrieves a remote post by its MongoDB _id (ObjectID).
// This is used when the frontend sends the MongoDB id of a cached remote post
// for actions like liking or commenting.
func (r *RemotePostRepository) GetRemotePostByObjectID(ctx context.Context, id primitive.ObjectID) (*models.RemotePost, error) {
	var remotePost models.RemotePost
	err := r.remotePosts.FindOne(ctx, bson.M{"_id": id}).Decode(&remotePost)
	if err != nil {
		return nil, err
	}
	return &remotePost, nil
}

// IncrementLikeCount atomically increments the cached like_count for a remote post.
func (r *RemotePostRepository) IncrementLikeCount(ctx context.Context, remotePostID string) error {
	_, err := r.remotePosts.UpdateOne(
		ctx,
		bson.M{"remote_post_id": remotePostID},
		bson.M{"$inc": bson.M{"like_count": 1}},
	)
	return err
}

// DecrementLikeCount atomically decrements the cached like_count for a remote post.
func (r *RemotePostRepository) DecrementLikeCount(ctx context.Context, remotePostID string) error {
	_, err := r.remotePosts.UpdateOne(
		ctx,
		bson.M{"remote_post_id": remotePostID},
		bson.M{"$inc": bson.M{"like_count": -1}},
	)
	return err
}

// DeleteRemotePostsByInstance deletes all remote posts from a specific instance
func (r *RemotePostRepository) DeleteRemotePostsByInstance(ctx context.Context, instance string) error {
	_, err := r.remotePosts.DeleteMany(ctx, bson.M{"origin_instance": instance})
	return err
}

// GetRemotePostsByAuthors retrieves remote posts authored by specific actor IDs
func (r *RemotePostRepository) GetRemotePostsByAuthors(ctx context.Context, actorIDs []string, limit int64) ([]models.RemotePost, error) {
	filter := bson.M{"author_actor_id": bson.M{"$in": actorIDs}}
	opts := options.Find().
		SetSort(bson.D{{Key: "created_at", Value: -1}}).
		SetLimit(limit)

	cursor, err := r.remotePosts.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var posts []models.RemotePost
	if err := cursor.All(ctx, &posts); err != nil {
		return nil, err
	}
	return posts, nil
}
