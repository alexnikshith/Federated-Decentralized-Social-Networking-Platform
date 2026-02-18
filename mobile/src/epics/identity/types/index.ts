// User represents the core user profile entity
export interface User {
    id: string;
    username: string;
    email?: string;
    display_name: string;
    bio: string;
    avatar_url: string;
    profile_visibility: 'public' | 'private';
    is_discoverable?: boolean;
    created_at: string;
    location?: string;
    website?: string;
    followers_count?: number;
    following_count?: number;
    posts_count?: number;
    is_following?: boolean;
    can_view_details?: boolean;
    instance?: string;
    is_2fa_enabled?: boolean;
    role?: 'user' | 'admin';
    is_active?: boolean;
    joined_communities?: string[];
}

// ActivityLog tracks security-relevant user actions (login, updates, etc.)
export interface ActivityLog {
    id: string;
    user_id: string;
    action: string;
    details: string;
    ip_address: string;
    user_agent: string;
    timestamp: string;
}

// Request/Response DTOs
export interface LoginRequest {
    email: string;
    password: string;
}

export interface VerifyOTPRequest {
    email: string;
    code: string;
}

export interface SignupRequest {
    username: string;
    email: string;
    password: string;
    display_name?: string;
    instance?: string;
    is_discoverable?: boolean;
}

export interface LoginResponse {
    token: string;
    expires_at: string;
    user: User;
}

export interface UpdateProfileRequest {
    username?: string;
    display_name?: string;
    bio?: string;
    avatar_url?: string;
    profile_visibility?: 'public' | 'private';
    is_discoverable?: boolean;
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
