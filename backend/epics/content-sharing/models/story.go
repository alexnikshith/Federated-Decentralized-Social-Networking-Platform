package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Story represents a temporary post that expires after 24 hours
type Story struct {
	ID        primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	AuthorID  primitive.ObjectID `json:"author_id" bson:"author_id"` // User who created the story
	MediaURL  string             `json:"media_url" bson:"media_url"` // URL of attached media (image/video)
	MediaType string             `json:"media_type" bson:"media_type"` // Type of media: "image", "video"
	Content   string             `json:"content,omitempty" bson:"content,omitempty"` // Optional text on the story
	ExpiresAt time.Time          `json:"expires_at" bson:"expires_at"` // 24 hours from creation
	CreatedAt time.Time          `json:"created_at" bson:"created_at"`
}
