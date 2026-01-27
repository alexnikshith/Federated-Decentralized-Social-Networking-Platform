export interface User {
    id: string;
    username: string;
    email?: string;
    display_name: string;
    bio: string;
    avatar_url: string;
    profile_visibility: 'public' | 'followers';
    created_at: string;
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
    profile_visibility?: 'public' | 'followers';
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
