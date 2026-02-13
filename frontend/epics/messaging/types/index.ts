// Message represents an individual text or media message
export interface Message {
    id: string;
    conversation_id: string;
    sender_id: string;
    content: string;
    type: 'text' | 'image' | 'video' | 'file';
    media_url?: string;
    file_name?: string;
    created_at: string;
    is_read: boolean;
}

// Conversation groups messages between participants
export interface Conversation {
    id: string;
    participants: Participant[];
    last_message?: Message;
    updated_at: string;
    unread_count?: number;
}

// Participant represents a user in a conversation
export interface Participant {
    id: string;
    username: string;
    display_name?: string;
    avatar_url: string;
    instance?: string;
    community_url?: string;
    community_name?: string;
    is_deleted?: boolean;
    is_deactivated?: boolean;
}

// SendMessageRequest DTO for creating new messages
export interface SendMessageRequest {
    receiver_id: string;
    content: string;
    type: 'text' | 'image' | 'video' | 'file';
    media_url?: string;
    file_name?: string;
    receiver_community_url?: string;
}
