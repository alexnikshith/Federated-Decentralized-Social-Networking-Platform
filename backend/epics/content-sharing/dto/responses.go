package dto

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// PostResponse represents a post with author information
type PostResponse struct {
	ID           primitive.ObjectID `json:"id"`
	AuthorID     primitive.ObjectID `json:"author_id"`
	AuthorName   string             `json:"author_name"`
	AuthorAvatar string             `json:"author_avatar"`
	Content      string             `json:"content"`
	LikeCount    int                `json:"like_count"`
	CommentCount int                `json:"comment_count"`
	IsLiked      bool               `json:"is_liked"` // Whether current user has liked
	CreatedAt    time.Time          `json:"created_at"`
	UpdatedAt    time.Time          `json:"updated_at"`
}

// CommentResponse represents a comment with user information
type CommentResponse struct {
	ID             primitive.ObjectID  `json:"id"`
	PostID         primitive.ObjectID  `json:"post_id"`
	UserID         primitive.ObjectID  `json:"user_id"`
	UserName       string              `json:"user_name"`
	UserAvatar     string              `json:"user_avatar"`
	Content        string              `json:"content"`
	ParentID       *primitive.ObjectID `json:"parent_id,omitempty"`
	ParentUserName string              `json:"parent_user_name,omitempty"`
	Replies        []CommentResponse   `json:"replies,omitempty"`
	CreatedAt      time.Time           `json:"created_at"`
}

// NotificationResponse represents a notification with related user info
type NotificationResponse struct {
	ID                primitive.ObjectID `json:"id"`
	Type              string             `json:"type"`
	RelatedEntityID   primitive.ObjectID `json:"related_entity_id"`
	RelatedUserID     primitive.ObjectID `json:"related_user_id"`
	RelatedUserName   string             `json:"related_user_name"`
	RelatedUserAvatar string             `json:"related_user_avatar"`
	IsRead            bool               `json:"is_read"`
	CreatedAt         time.Time          `json:"created_at"`
}

// FeedResponse represents the feed with posts
type FeedResponse struct {
	Posts []PostResponse `json:"posts"`
	Total int            `json:"total"`
}

// LikerResponse represents a user who liked a post
type LikerResponse struct {
	UserID     primitive.ObjectID `json:"user_id"`
	UserName   string             `json:"user_name"`
	UserAvatar string             `json:"user_avatar"`
}
