package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// User represents a user account in the system
// It contains all personal, security, and profile information for a registered user.
type User struct {
	ID           primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	Username     string             `json:"username" bson:"username"` // Unique identifier for the user
	Email        string             `json:"email" bson:"email"`       // Unique email address
	PasswordHash string             `json:"-" bson:"password_hash"`   // Bcrypt hash of t`he password, never exposed in JSON
	DisplayName  string             `json:"display_name" bson:"display_name"`
	Bio          string             `json:"bio" bson:"bio"`
	AvatarURL    string             `json:"avatar_url" bson:"avatar_url"`

	// Privacy settings
	ProfileVisibility string `json:"profile_visibility" bson:"profile_visibility"` // "public" or "followers" // "public" or "followers" - controls who can see detailed profile info

	// Account status
	IsActive       bool   `json:"is_active" bson:"is_active"`             // True if the user has verified email/is approved
	IsDeactivated  bool   `json:"is_deactivated" bson:"is_deactivated"`   // True if user or admin has deactivated the account
	Is2FAEnabled   bool   `json:"is_2fa_enabled" bson:"is_2fa_enabled"`   // True if Two-Factor Authentication is enabled
	IsDiscoverable bool   `json:"is_discoverable" bson:"is_discoverable"` // True if user opts-in to global directory
	Role           string `json:"role" bson:"role"`                       // "user" or "admin" - determines access privileges

	// Timestamps
	CreatedAt interface{} `json:"created_at" bson:"created_at"`
	UpdatedAt interface{} `json:"updated_at" bson:"updated_at"`

	// Instance info for federation
	InstanceID        string   `json:"instance_id" bson:"instance_id"`
	JoinedCommunities []string `json:"joined_communities" bson:"joined_communities"`

	// ActivityPub RSA keypair — never exposed in JSON, stored in DB only
	PublicKeyPem  string `json:"-" bson:"public_key_pem,omitempty"`
	PrivateKeyPem string `json:"-" bson:"private_key_pem,omitempty"`
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
	Role              string             `json:"role"`
	FollowersCount    int64              `json:"followers_count"`
	FollowingCount    int64              `json:"following_count"`
	PostsCount        int64              `json:"posts_count"`
	IsFollowing       bool               `json:"is_following"`
	CanViewDetails    bool               `json:"can_view_details"`
	Is2FAEnabled      *bool              `json:"is_2fa_enabled,omitempty"` // Only visible to self
	InstanceID        string             `json:"instance"`                 // home instance domain
}

// PrivateUser represents user data visible to the owner (includes email)
type PrivateUser struct {
	PublicUser
	Email             string   `json:"email"`
	InstanceID        string   `json:"instance_id"`
	JoinedCommunities []string `json:"joined_communities"`
	IsDiscoverable    bool     `json:"is_discoverable"`
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
	role := u.Role
	if role == "" {
		role = "user"
	}
	return PublicUser{
		ID:                u.ID,
		Username:          u.Username,
		DisplayName:       u.DisplayName,
		Bio:               u.Bio,
		AvatarURL:         u.AvatarURL,
		ProfileVisibility: u.ProfileVisibility,
		CreatedAt:         u.CreatedAt,
		Role:              role,
		Is2FAEnabled:      &isEnabled,
		FollowersCount:    0,
		FollowingCount:    0,
		PostsCount:        0,
		CanViewDetails:    true,
		InstanceID:        u.InstanceID,
	}
}

// ToPrivateUser converts User to PrivateUser (for owner)
func (u *User) ToPrivateUser() PrivateUser {
	return PrivateUser{
		PublicUser:        u.ToPublicUser(),
		Email:             u.Email,
		InstanceID:        u.InstanceID,
		JoinedCommunities: u.JoinedCommunities,
		IsDiscoverable:    u.IsDiscoverable,
	}
}
