package repository

import (
	"context"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type MessageRepositoryInterface interface {
	DeleteConversationsByUser(ctx context.Context, userID primitive.ObjectID) error
	DeleteMessagesByUser(ctx context.Context, userID primitive.ObjectID) error
	CreateIndexes(ctx context.Context) error
}
