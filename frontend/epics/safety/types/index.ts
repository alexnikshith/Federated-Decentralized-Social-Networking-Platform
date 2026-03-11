export interface CommunityGuideline {
    id: string;
    title: string;
    description: string;
    severity: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface ModerationLog {
    id: string;
    target_id: string;
    target_type: 'post' | 'comment' | 'username' | 'display_name' | 'bio';
    content: string;
    is_violation: boolean;
    reason: string;
    score?: number;
    breached_rules?: string[];
    bad_words_found?: string[];
    action_taken: string;
    created_at: string;
}

export interface Block {
    id: string;
    blocker_id: string;
    blocked_id: string;
    created_at: string;
}

export interface BlockResponse {
    success: boolean;
    message: string;
    data?: unknown;
}
