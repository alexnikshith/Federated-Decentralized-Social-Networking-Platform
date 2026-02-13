package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type MessageType string

const (
	MessageTypeText  MessageType = "text"
	MessageTypeImage MessageType = "image"
	MessageTypeDoc   MessageType = "doc"
)

type Message struct {
	ID             primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	ConversationID primitive.ObjectID `json:"conversation_id" bson:"conversation_id"`
	SenderID       primitive.ObjectID `json:"sender_id" bson:"sender_id"`
	Content        string             `json:"content" bson:"content"`
	Type           MessageType        `json:"type" bson:"type"`
	MediaURL       string             `json:"media_url,omitempty" bson:"media_url,omitempty"`
	FileName       string             `json:"file_name,omitempty" bson:"file_name,omitempty"`
	CreatedAt      time.Time          `json:"created_at" bson:"created_at"`
	IsRead         bool               `json:"is_read" bson:"is_read"`
}

type Conversation struct {
	ID                   primitive.ObjectID   `json:"id" bson:"_id,omitempty"`
	Participants         []primitive.ObjectID `json:"participants" bson:"participants"`
	ParticipantInstances map[string]string    `json:"participant_instances" bson:"participant_instances"` // userID -> communityURL
	ParticipantUsernames map[string]string    `json:"participant_usernames" bson:"participant_usernames"` // userID -> username
	ParticipantDisplayNames map[string]string `json:"participant_display_names" bson:"participant_display_names"` // userID -> displayName
	LastMessage          *Message             `json:"last_message,omitempty" bson:"last_message,omitempty"`
	UpdatedAt            time.Time            `json:"updated_at" bson:"updated_at"`
	CreatedAt            time.Time            `json:"created_at" bson:"created_at"`
}
