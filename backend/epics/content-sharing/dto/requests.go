package dto

// CreatePostRequest represents the request to create a post
// Content must be between 1 and 5000 characters.
type CreatePostRequest struct {
	Content   string `json:"content" binding:"required,min=1,max=5000"`
	MediaURL  string `json:"media_url,omitempty"`
	MediaType string `json:"media_type,omitempty"`
}

// CreateCommentRequest represents the request to create a comment
type CreateCommentRequest struct {
	Content  string `json:"content" binding:"required,min=1,max=1000"`
	ParentID string `json:"parent_id,omitempty"`
}

// ReportPostRequest represents the request to report a post
type ReportPostRequest struct {
	Reason string `json:"reason" binding:"required,min=1,max=500"`
}

// PostInteractionRequest represents the request for post interaction
type PostInteractionRequest struct {
	Type string `json:"type" binding:"required,oneof=interested not_interested"`
}
