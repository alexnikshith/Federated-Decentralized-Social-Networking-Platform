import { User } from '../../identity/types';

export interface AdminStats {
    total_users: number;
    total_posts: number;
    daily_activity: number;
}

export interface UserStatusUpdate {
    user_id: string;
    is_active: boolean;
    reason?: string;
}

export interface AdminPost {
    id: string;
    author_id: string;
    content: string;
    like_count: number;
    comment_count: number;
    created_at: string;
}
