package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// CommunityGuideline represents a rule that users must follow.
// These are used as context for the AI Moderator.
type CommunityGuideline struct {
	ID          primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	Title       string             `json:"title" bson:"title"`
	Description string             `json:"description" bson:"description"`
	Severity    int                `json:"severity" bson:"severity"` // 1: Low, 2: Medium, 3: High
	CreatedAt   time.Time          `json:"created_at" bson:"created_at"`
	UpdatedAt   time.Time          `json:"updated_at" bson:"updated_at"`
	IsActive    bool               `json:"is_active" bson:"is_active"`
}

// ModerationLog tracks AI moderation decisions and actions taken.
type ModerationLog struct {
	ID            primitive.ObjectID   `json:"id" bson:"_id,omitempty"`
	TargetID      primitive.ObjectID   `json:"target_id" bson:"target_id"`     // ID of the Post or User
	TargetType    string               `json:"target_type" bson:"target_type"` // "post", "username", "display_name", "bio"
	UserID        primitive.ObjectID   `json:"user_id" bson:"user_id"`         // ID of the User who owns the content
	Content       string               `json:"content" bson:"content"`         // The content that was checked
	IsViolation   bool                 `json:"is_violation" bson:"is_violation"`
	Reason        string               `json:"reason" bson:"reason"`               // AI's explanation
	GuidelineIDs  []primitive.ObjectID `json:"guideline_ids" bson:"guideline_ids"` // Guidelines breached
	ActionTaken   string               `json:"action_taken" bson:"action_taken"`   // "none", "warning", "deletion", "suspension"
	RawAIResponse string               `json:"raw_ai_response" bson:"raw_ai_response"`
	CreatedAt     time.Time            `json:"created_at" bson:"created_at"`
}
