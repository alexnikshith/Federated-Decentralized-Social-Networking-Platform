package dto

import "time"

// CreateStoryRequest is the payload for creating a new story
type CreateStoryRequest struct {
	MediaURL  string `json:"media_url" binding:"required"`
	MediaType string `json:"media_type" binding:"required"`
	Content   string `json:"content"`
}

// StoryResponse represents a formatted story returned to the client
type StoryResponse struct {
	ID         string    `json:"id"`
	AuthorID   string    `json:"author_id"`
	AuthorName string    `json:"author_name"`
	AuthorAvatar string  `json:"author_avatar"`
	MediaURL   string    `json:"media_url"`
	MediaType  string    `json:"media_type"`
	Content    string    `json:"content,omitempty"`
	CreatedAt  time.Time `json:"created_at"`
	ExpiresAt  time.Time `json:"expires_at"`
}
