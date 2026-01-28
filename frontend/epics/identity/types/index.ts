export interface User {
    id: string;
    username: string;
    email?: string;
    display_name: string;
    bio: string;
    avatar_url: string;
    profile_visibility: 'public' | 'followers' | 'private';
    created_at: string;
    location?: string;
    website?: string;
    followers_count?: number;
    following_count?: number;
    posts_count?: number;
    instance?: string;
}

export interface ActivityLog {
    id: string;
    user_id: string;
    action: string;
    details: string;
    ip_address: string;
    user_agent: string;
    timestamp: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface SignupRequest {
    username: string;
    email: string;
    password: string;
    display_name: string;
}

export interface LoginResponse {
    token: string;
    expires_at: string;
    user: User;
}

export interface UpdateProfileRequest {
    display_name?: string;
    bio?: string;
    avatar_url?: string;
    profile_visibility?: 'public' | 'followers' | 'private';
}

export interface ChangePasswordRequest {
    old_password: string;
    new_password: string;
}

export interface ApiResponse<T> {
    success: boolean;
    message: string;
    data?: T;
}

export interface ApiError {
    error: string;
    message: string;
}
