package dto

type SendMessageRequest struct {
	ReceiverID           string `json:"receiver_id" binding:"required"`
	Content              string `json:"content" binding:"required"`
	Type                 string `json:"type" default:"text"`
	MediaURL             string `json:"media_url,omitempty"`
	FileName             string `json:"file_name,omitempty"`
	ReceiverCommunityURL string `json:"receiver_community_url,omitempty"`
	DisplayName          string `json:"display_name,omitempty"`
}

type ReceiveRemoteMessageRequest struct {
	SenderID           string `json:"sender_id" binding:"required"`
	SenderUsername     string `json:"sender_username,omitempty"`
	SenderDisplayName  string `json:"sender_display_name,omitempty"`
	SenderCommunityURL string `json:"sender_community_url,omitempty"`
	ReceiverID         string `json:"receiver_id" binding:"required"`
	Content            string `json:"content" binding:"required"`
	Type               string `json:"type" default:"text"`
	MediaURL           string `json:"media_url,omitempty"`
	FileName           string `json:"file_name,omitempty"`
}
type ConversationResponse struct {
	ID           string           `json:"id"`
	Participants []ParticipantDTO `json:"participants"`
	LastMessage  *MessageDTO      `json:"last_message,omitempty"`
	UpdatedAt    string           `json:"updated_at"`
	UnreadCount  int              `json:"unread_count"`
}

type ParticipantDTO struct {
	ID            string `json:"id"`
	Username      string `json:"username"`
	DisplayName   string `json:"display_name,omitempty"`
	AvatarURL     string `json:"avatar_url"`
	IsDeleted     bool   `json:"is_deleted"`
	IsDeactivated bool   `json:"is_deactivated"`
	CommunityURL  string `json:"community_url,omitempty"`
	CommunityName string `json:"community_name,omitempty"`
}

type MessageDTO struct {
	ID             string `json:"id"`
	ConversationID string `json:"conversation_id"`
	SenderID       string `json:"sender_id"`
	Content        string `json:"content"`
	Type           string `json:"type"`
	MediaURL       string `json:"media_url,omitempty"`
	FileName       string `json:"file_name,omitempty"`
	CreatedAt      string `json:"created_at"`
	IsRead         bool   `json:"is_read"`
}
