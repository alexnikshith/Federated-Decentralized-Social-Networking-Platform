package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Block represents a block relationship between two users
type Block struct {
	ID        primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	BlockerID primitive.ObjectID `json:"blocker_id" bson:"blocker_id"`
	BlockedID primitive.ObjectID `json:"blocked_id" bson:"blocked_id"`
	CreatedAt time.Time          `json:"created_at" bson:"created_at"`
}
