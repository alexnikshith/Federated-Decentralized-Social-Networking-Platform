package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// User represents a user account in the system
type User struct {
	ID           primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	Username     string             `json:"username" bson:"username"`
	Email        string             `json:"email" bson:"email"`
	PasswordHash string             `json:"-" bson:"password_hash"` // Never expose in JSON
	DisplayName  string             `json:"display_name" bson:"display_name"`
	Bio          string             `json:"bio" bson:"bio"`
	AvatarURL    string             `json:"avatar_url" bson:"avatar_url"`

	// Privacy settings
	ProfileVisibility string `json:"profile_visibility" bson:"profile_visibility"` // "public" or "followers"

	// Account status
	IsActive      bool `json:"is_active" bson:"is_active"`
	IsDeactivated bool `json:"is_deactivated" bson:"is_deactivated"`
	Is2FAEnabled  bool `json:"is_2fa_enabled" bson:"is_2fa_enabled"`

	// Timestamps
	CreatedAt interface{} `json:"created_at" bson:"created_at"`
	UpdatedAt interface{} `json:"updated_at" bson:"updated_at"`

	// Instance info
	InstanceID string `json:"instance_id" bson:"instance_id"`
}

// ActivityLog represents user activity tracking
type ActivityLog struct {
	ID        primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	UserID    primitive.ObjectID `json:"user_id" bson:"user_id"`
	Action    string             `json:"action" bson:"action"` // "login", "logout", "profile_update", etc.
	Details   string             `json:"details" bson:"details"`
	IPAddress string             `json:"ip_address" bson:"ip_address"`
	UserAgent string             `json:"user_agent" bson:"user_agent"`
	Timestamp time.Time          `json:"timestamp" bson:"timestamp"`
}

// PublicUser represents user data safe to expose publicly
type PublicUser struct {
	ID                primitive.ObjectID `json:"id"`
	Username          string             `json:"username"`
	DisplayName       string             `json:"display_name"`
	Bio               string             `json:"bio"`
	AvatarURL         string             `json:"avatar_url"`
	ProfileVisibility string             `json:"profile_visibility"`
	CreatedAt         interface{}        `json:"created_at"`
	FollowersCount    int64              `json:"followers_count"`
	FollowingCount    int64              `json:"following_count"`
	PostsCount        int64              `json:"posts_count"`
	IsFollowing       bool               `json:"is_following"`
	Is2FAEnabled      *bool              `json:"is_2fa_enabled,omitempty"` // Only visible to self
}

// Session represents an active user session
type Session struct {
	ID        primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	UserID    primitive.ObjectID `json:"user_id" bson:"user_id"`
	Token     string             `json:"token" bson:"token"`
	ExpiresAt time.Time          `json:"expires_at" bson:"expires_at"`
	CreatedAt time.Time          `json:"created_at" bson:"created_at"`
	IsValid   bool               `json:"is_valid" bson:"is_valid"`
}

// ToPublicUser converts User to PublicUser
func (u *User) ToPublicUser() PublicUser {
	isEnabled := u.Is2FAEnabled
	return PublicUser{
		ID:                u.ID,
		Username:          u.Username,
		DisplayName:       u.DisplayName,
		Bio:               u.Bio,
		AvatarURL:         u.AvatarURL,
		ProfileVisibility: u.ProfileVisibility,
		CreatedAt:         u.CreatedAt,
		Is2FAEnabled:      &isEnabled,
		FollowersCount:    0,
		FollowingCount:    0,
		PostsCount:        0,
	}
}
