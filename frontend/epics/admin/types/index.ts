import { User } from '../../identity/types';

// Basic stats for the admin dashboard
export interface AdminStats {
    total_users: number;
    total_posts: number;
    daily_activity: number;
}

// DTO for blocking/unblocking users
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

export interface DailyTraffic {
    date: string;
    users: number;
    deleted_users?: number;
    posts: number;
}

export interface TrafficReport {
    daily_stats: DailyTraffic[];
}
