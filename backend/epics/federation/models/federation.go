package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Instance represents a known federated instance
type Instance struct {
	ID         primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	Domain     string             `json:"domain" bson:"domain"`             // e.g., "server2.com" or "localhost:8081"
	InboxURL   string             `json:"inbox_url" bson:"inbox_url"`       // e.g., "http://localhost:8081/federation/inbox"
	TrustLevel string             `json:"trust_level" bson:"trust_level"`   // "trusted", "limited", "blocked"
	LastSeenAt time.Time          `json:"last_seen_at" bson:"last_seen_at"` // Last time we received activity from this instance
	CreatedAt  time.Time          `json:"created_at" bson:"created_at"`
	UpdatedAt  time.Time          `json:"updated_at" bson:"updated_at"`
}

// RemoteUser represents a user from a remote federated instance (cached locally)
type RemoteUser struct {
	ID          primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	ActorID     string             `json:"actor_id" bson:"actor_id"`         // e.g., "https://server2.com/users/akhil"
	Username    string             `json:"username" bson:"username"`         // e.g., "akhil"
	DisplayName string             `json:"display_name" bson:"display_name"` // e.g., "Akhil Kumar"
	Instance    string             `json:"instance" bson:"instance"`         // e.g., "server2.com"
	AvatarURL   string             `json:"avatar_url" bson:"avatar_url"`
	Bio         string             `json:"bio" bson:"bio"`
	FetchedAt   time.Time          `json:"fetched_at" bson:"fetched_at"` // Last time we fetched this user's data
	CreatedAt   time.Time          `json:"created_at" bson:"created_at"`
}

// RemotePost represents a post from a remote federated instance (cached locally)
type RemotePost struct {
	ID             primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	RemotePostID   string             `json:"remote_post_id" bson:"remote_post_id"`   // e.g., "https://server2.com/posts/123"
	OriginInstance string             `json:"origin_instance" bson:"origin_instance"` // e.g., "server2.com"
	Author         string             `json:"author" bson:"author"`                   // e.g., "akhil@server2.com"
	AuthorActorID  string             `json:"author_actor_id" bson:"author_actor_id"` // e.g., "https://server2.com/users/akhil"
	Content        string             `json:"content" bson:"content"`                 // Post content
	Visibility     string             `json:"visibility" bson:"visibility"`           // "public", "followers"
	LikeCount      int                `json:"like_count" bson:"like_count"`           // Cached like count
	CommentCount   int                `json:"comment_count" bson:"comment_count"`     // Cached comment count
	ReceivedAt     time.Time          `json:"received_at" bson:"received_at"`         // When we received this post
	CreatedAt      time.Time          `json:"created_at" bson:"created_at"`           // Original creation time on remote instance
	UpdatedAt      time.Time          `json:"updated_at" bson:"updated_at"`           // Last update time
}

// RemoteFollow represents a local user following a remote user
type RemoteFollow struct {
	ID            primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	LocalUserID   primitive.ObjectID `json:"local_user_id" bson:"local_user_id"`
	RemoteActorID string             `json:"remote_actor_id" bson:"remote_actor_id"` // Who they follow
	RemoteUsername string            `json:"remote_username" bson:"remote_username"` // Cached username
	RemoteInstance string            `json:"remote_instance" bson:"remote_instance"` // The server domain
	CreatedAt     time.Time          `json:"created_at" bson:"created_at"`
}

// RemoteFollower represents a remote user following a local user
type RemoteFollower struct {
	ID            primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	LocalUserID   primitive.ObjectID `json:"local_user_id" bson:"local_user_id"`   // Who is being followed
	RemoteActorID string             `json:"remote_actor_id" bson:"remote_actor_id"` // Who is following
	RemoteInstance string            `json:"remote_instance" bson:"remote_instance"` // Their server
	CreatedAt     time.Time          `json:"created_at" bson:"created_at"`
}

// FederationEvent represents an outgoing federation event (queued for delivery)
type FederationEvent struct {
	ID             primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	Type           string             `json:"type" bson:"type"`                                       // "CreatePost", "Follow", "Like", "Comment", "Delete"
	TargetInstance string             `json:"target_instance" bson:"target_instance"`                 // e.g., "server2.com"
	Payload        bson.M             `json:"payload" bson:"payload"`                                 // Activity envelope as BSON document
	Status         string             `json:"status" bson:"status"`                                   // "pending", "sent", "failed"
	RetryCount     int                `json:"retry_count" bson:"retry_count"`                         // Number of retry attempts
	LastAttempt    *time.Time         `json:"last_attempt" bson:"last_attempt"`                       // Last delivery attempt time
	ErrorMessage   string             `json:"error_message,omitempty" bson:"error_message,omitempty"` // Last error message
	CreatedAt      time.Time          `json:"created_at" bson:"created_at"`
	UpdatedAt      time.Time          `json:"updated_at" bson:"updated_at"`
}

// ActivityEnvelope represents a standard ActivityPub-inspired activity format
type ActivityEnvelope struct {
	Type      string    `json:"type" bson:"type"`           // "CreatePost", "Follow", "Like", "Comment", "Delete"
	Actor     string    `json:"actor" bson:"actor"`         // e.g., "https://server1.com/users/username"
	Object    bson.M    `json:"object" bson:"object"`       // Activity-specific payload
	Origin    string    `json:"origin" bson:"origin"`       // e.g., "server1.com"
	Timestamp time.Time `json:"timestamp" bson:"timestamp"` // When the activity was created
}
