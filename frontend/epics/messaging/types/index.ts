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

export interface Conversation {
    id: string;
    participants: Participant[];
    last_message?: Message;
    updated_at: string;
    unread_count?: number;
}

export interface Participant {
    id: string;
    username: string;
    avatar_url: string;
    is_deleted?: boolean;
    is_deactivated?: boolean;
}

export interface SendMessageRequest {
    receiver_id: string;
    content: string;
    type: 'text' | 'image' | 'video' | 'file';
    media_url?: string;
    file_name?: string;
}
