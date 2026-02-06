package repository

import (
	"context"
	"errors"
	"federated-social/backend/database"
	"federated-social/backend/epics/safety/models"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type BlockRepository struct {
	collection *mongo.Collection
}

func NewBlockRepository() *BlockRepository {
	return &BlockRepository{
		collection: database.GetCollection("blocks"),
	}
}

// BlockUser creates a new block record
func (r *BlockRepository) BlockUser(ctx context.Context, block *models.Block) error {
	block.CreatedAt = time.Now()

	// Check if already blocked
	count, err := r.collection.CountDocuments(ctx, bson.M{
		"blocker_id": block.BlockerID,
		"blocked_id": block.BlockedID,
	})
	if err != nil {
		return err
	}
	if count > 0 {
		return errors.New("user already blocked")
	}

	result, err := r.collection.InsertOne(ctx, block)
	if err != nil {
		return err
	}

	block.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

// UnblockUser removes a block record
func (r *BlockRepository) UnblockUser(ctx context.Context, blockerID, blockedID primitive.ObjectID) error {
	result, err := r.collection.DeleteOne(ctx, bson.M{
		"blocker_id": blockerID,
		"blocked_id": blockedID,
	})
	if err != nil {
		return err
	}
	if result.DeletedCount == 0 {
		return errors.New("block not found")
	}
	return nil
}

// IsBlocked checks if a user is blocked by another
func (r *BlockRepository) IsBlocked(ctx context.Context, blockerID, blockedID primitive.ObjectID) (bool, error) {
	count, err := r.collection.CountDocuments(ctx, bson.M{
		"blocker_id": blockerID,
		"blocked_id": blockedID,
	})
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

// GetBlockedUsers returns a list of users blocked by the blocker
func (r *BlockRepository) GetBlockedUsers(ctx context.Context, blockerID primitive.ObjectID) ([]models.Block, error) {
	cursor, err := r.collection.Find(ctx, bson.M{"blocker_id": blockerID})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var blocks []models.Block
	if err = cursor.All(ctx, &blocks); err != nil {
		return nil, err
	}
	return blocks, nil
}

// GetBidirectionalBlockedIDs returns a list of User IDs that should be hidden from the given user.
// This includes:
// 1. Users that userID has blocked.
// 2. Users that have blocked userID.
func (r *BlockRepository) GetBidirectionalBlockedIDs(ctx context.Context, userID primitive.ObjectID) ([]primitive.ObjectID, error) {
	// Find where I am the blocker
	cursor1, err := r.collection.Find(ctx, bson.M{"blocker_id": userID})
	if err != nil {
		return nil, err
	}

	// Find where I am the blocked one
	cursor2, err := r.collection.Find(ctx, bson.M{"blocked_id": userID})
	if err != nil {
		cursor1.Close(ctx) // Clean up first cursor
		return nil, err
	}

	defer cursor1.Close(ctx)
	defer cursor2.Close(ctx)

	uniqueIDs := make(map[primitive.ObjectID]bool)

	var blocks1 []models.Block
	if err = cursor1.All(ctx, &blocks1); err != nil {
		return nil, err
	}
	for _, b := range blocks1 {
		uniqueIDs[b.BlockedID] = true
	}

	var blocks2 []models.Block
	if err = cursor2.All(ctx, &blocks2); err != nil {
		return nil, err
	}
	for _, b := range blocks2 {
		uniqueIDs[b.BlockerID] = true
	}

	var ids []primitive.ObjectID
	for id := range uniqueIDs {
		ids = append(ids, id)
	}

	return ids, nil
}

// CreateIndexes creates necessary database indexes
func (r *BlockRepository) CreateIndexes(ctx context.Context) error {
	indexes := []mongo.IndexModel{
		{
			Keys:    bson.D{bson.E{Key: "blocker_id", Value: 1}, bson.E{Key: "blocked_id", Value: 1}},
			Options: options.Index().SetUnique(true),
		},
		{
			Keys: bson.D{bson.E{Key: "blocker_id", Value: 1}},
		},
		{
			Keys: bson.D{bson.E{Key: "blocked_id", Value: 1}},
		},
	}

	_, err := r.collection.Indexes().CreateMany(ctx, indexes)
	return err
}
