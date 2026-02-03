package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Post represents a user post
type Post struct {
	ID           primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	AuthorID     primitive.ObjectID `json:"author_id" bson:"author_id"`
	Content      string             `json:"content" bson:"content"`
	LikeCount    int                `json:"like_count" bson:"like_count"`
	CommentCount int                `json:"comment_count" bson:"comment_count"`
	CreatedAt    time.Time          `json:"created_at" bson:"created_at"`
	UpdatedAt    time.Time          `json:"updated_at" bson:"updated_at"`
}

// Like represents a like on a post
type Like struct {
	ID        primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	PostID    primitive.ObjectID `json:"post_id" bson:"post_id"`
	UserID    primitive.ObjectID `json:"user_id" bson:"user_id"`
	CreatedAt time.Time          `json:"created_at" bson:"created_at"`
}

// Comment represents a comment on a post
type Comment struct {
	ID        primitive.ObjectID  `json:"id" bson:"_id,omitempty"`
	PostID    primitive.ObjectID  `json:"post_id" bson:"post_id"`
	UserID    primitive.ObjectID  `json:"user_id" bson:"user_id"`
	Content   string              `json:"content" bson:"content"`
	ParentID  *primitive.ObjectID `json:"parent_id,omitempty" bson:"parent_id,omitempty"`
	CreatedAt time.Time           `json:"created_at" bson:"created_at"`
}

// Follow represents a follow relationship
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
	Type                 string              `json:"type" bson:"type"`                                                         // "like", "comment", "follow"
	RelatedEntityID      primitive.ObjectID  `json:"related_entity_id" bson:"related_entity_id"`                               // PostID or CommentID
	RelatedUserID        primitive.ObjectID  `json:"related_user_id" bson:"related_user_id"`                                   // User who triggered the notification
	CommentContent       string              `json:"comment_content,omitempty" bson:"comment_content,omitempty"`               // Content of the comment (for comment notifications)
	ParentCommentID      *primitive.ObjectID `json:"parent_comment_id,omitempty" bson:"parent_comment_id,omitempty"`           // ID of parent comment (for replies)
	ParentCommentContent string              `json:"parent_comment_content,omitempty" bson:"parent_comment_content,omitempty"` // Content of parent comment
	ParentUserName       string              `json:"parent_user_name,omitempty" bson:"parent_user_name,omitempty"`             // Username of parent comment author
	IsRead               bool                `json:"is_read" bson:"is_read"`
	CreatedAt            time.Time           `json:"created_at" bson:"created_at"`
}
