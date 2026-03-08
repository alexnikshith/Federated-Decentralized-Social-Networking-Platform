package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Post represents a user-created content item
// It is the central entity in the content sharing epic.
type Post struct {
	ID                 primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	AuthorID           primitive.ObjectID `json:"author_id" bson:"author_id"`                       // Reference to the User who created the post
	Content            string             `json:"content" bson:"content"`                           // Text content of the post
	MediaURL           string             `json:"media_url,omitempty" bson:"media_url,omitempty"`   // URL of attached media (image/video)
	MediaType          string             `json:"media_type,omitempty" bson:"media_type,omitempty"` // Type of media: "image", "video"
	LikeCount          int                `json:"like_count" bson:"like_count"`
	CommentCount       int                `json:"comment_count" bson:"comment_count"`
	Status             string             `json:"status,omitempty" bson:"status,omitempty"`   // "active", "under_review", "deleted"
	ModerationStatus   string             `json:"moderation_status" bson:"moderation_status"` // "pending", "approved", "flagged"
	MentionedUsernames []string           `json:"mentioned_usernames,omitempty" bson:"mentioned_usernames,omitempty"`
	CreatedAt          time.Time          `json:"created_at" bson:"created_at"`
	UpdatedAt          time.Time          `json:"updated_at" bson:"updated_at"`
}

// Like represents a user's positive reaction to a post
type Like struct {
	ID        primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	PostID    primitive.ObjectID `json:"post_id" bson:"post_id"` // Reference to the liked Post
	UserID    primitive.ObjectID `json:"user_id" bson:"user_id"` // Reference to the User who liked the post
	CreatedAt time.Time          `json:"created_at" bson:"created_at"`
}

// Comment represents a user's textual response to a post or another comment
type Comment struct {
	ID        primitive.ObjectID  `json:"id" bson:"_id,omitempty"`
	PostID    primitive.ObjectID  `json:"post_id" bson:"post_id"`
	UserID    primitive.ObjectID  `json:"user_id" bson:"user_id"`
	Content   string              `json:"content" bson:"content"`
	ParentID  *primitive.ObjectID `json:"parent_id,omitempty" bson:"parent_id,omitempty"` // Nullable for top-level comments
	CreatedAt time.Time           `json:"created_at" bson:"created_at"`
}

// Follow represents a directional relationship between two users
type Follow struct {
	ID          primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	FollowerID  primitive.ObjectID `json:"follower_id" bson:"follower_id"`   // User who follows
	FollowingID primitive.ObjectID `json:"following_id" bson:"following_id"` // User being followed
	CreatedAt   time.Time          `json:"created_at" bson:"created_at"`
}

// Notification represents a user notification
type Notification struct {
	ID                   primitive.ObjectID  `json:"id" bson:"_id,omitempty"`
	UserID               primitive.ObjectID  `json:"user_id" bson:"user_id"`                                                   // User receiving the notification
	Type                 string              `json:"type" bson:"type"`                                                         // "like", "comment", "follow", "mention"
	RelatedEntityID      primitive.ObjectID  `json:"related_entity_id" bson:"related_entity_id"`                               // PostID or CommentID
	RelatedUserID        primitive.ObjectID  `json:"related_user_id" bson:"related_user_id"`                                   // User who triggered the notification
	RelatedUserName      string              `json:"related_user_name,omitempty" bson:"related_user_name,omitempty"`           // Optional for federation
	RelatedUserAvatar    string              `json:"related_user_avatar,omitempty" bson:"related_user_avatar,omitempty"`       // Optional for federation
	CommentContent       string              `json:"comment_content,omitempty" bson:"comment_content,omitempty"`               // Content of the comment (for comment notifications)
	ParentCommentID      *primitive.ObjectID `json:"parent_comment_id,omitempty" bson:"parent_comment_id,omitempty"`           // ID of parent comment (for replies)
	ParentCommentContent string              `json:"parent_comment_content,omitempty" bson:"parent_comment_content,omitempty"` // Content of parent comment
	ParentUserName       string              `json:"parent_user_name,omitempty" bson:"parent_user_name,omitempty"`             // Username of parent comment author
	IsRead               bool                `json:"is_read" bson:"is_read"`
	CreatedAt            time.Time           `json:"created_at" bson:"created_at"`
}

// SavedPost represents a post saved by a user
type SavedPost struct {
	ID        primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	UserID    primitive.ObjectID `json:"user_id" bson:"user_id"`
	PostID    primitive.ObjectID `json:"post_id" bson:"post_id"`
	CreatedAt time.Time          `json:"created_at" bson:"created_at"`
}

// ReportedPost represents a post reported by a user
type ReportedPost struct {
	ID         primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	ReporterID primitive.ObjectID `json:"reporter_id" bson:"reporter_id"`
	PostID     primitive.ObjectID `json:"post_id" bson:"post_id"`
	Reason     string             `json:"reason" bson:"reason"`
	Status     string             `json:"status" bson:"status"` // "pending", "resolved", "dismissed"
	CreatedAt  time.Time          `json:"created_at" bson:"created_at"`
}

// PostInteraction represents a user's interaction sentiment with a post
type PostInteraction struct {
	ID        primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	UserID    primitive.ObjectID `json:"user_id" bson:"user_id"`
	PostID    primitive.ObjectID `json:"post_id" bson:"post_id"`
	Type      string             `json:"type" bson:"type"` // "interested", "not_interested"
	CreatedAt time.Time          `json:"created_at" bson:"created_at"`
}
