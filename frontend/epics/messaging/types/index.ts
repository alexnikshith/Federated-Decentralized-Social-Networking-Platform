export interface Message {
    id: string;
    sender_id: string;
    content: string;
    type: 'text' | 'image' | 'doc';
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
}

export interface Participant {
    id: string;
    username: string;
    avatar_url: string;
}

export interface SendMessageRequest {
    receiver_id: string;
    content: string;
    type: 'text' | 'image' | 'doc';
    media_url?: string;
    file_name?: string;
}
