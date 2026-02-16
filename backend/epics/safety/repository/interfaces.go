package repository

import (
	"context"
	"federated-social/backend/epics/safety/models"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type BlockRepositoryInterface interface {
	BlockUser(ctx context.Context, block *models.Block) error
	UnblockUser(ctx context.Context, blockerID, blockedID primitive.ObjectID) error
	IsBlocked(ctx context.Context, blockerID, blockedID primitive.ObjectID) (bool, error)
	GetBlockedUsers(ctx context.Context, blockerID primitive.ObjectID) ([]models.Block, error)
	GetBidirectionalBlockedIDs(ctx context.Context, userID primitive.ObjectID) ([]primitive.ObjectID, error)
	CreateIndexes(ctx context.Context) error
}
