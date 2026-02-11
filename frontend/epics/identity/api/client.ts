import axios, { AxiosError } from 'axios';
import type {
    LoginRequest,
    SignupRequest,
    LoginResponse,
    User,
    UpdateProfileRequest,
    ChangePasswordRequest,
    ActivityLog,
    ApiResponse,
    ApiError,
    VerifyOTPRequest,
} from '../types';
import { useAuthStore } from '../store/authStore';

const API_URL = localStorage.getItem('active_community_url') || import.meta.env.VITE_API_URL || 'http://localhost:8080';

// Create axios instance with base configuration
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor: Injects the Bearer token into headers
api.interceptors.request.use((config) => {
    config.baseURL = localStorage.getItem('active_community_url') || config.baseURL;
    const token = useAuthStore.getState().token;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response Interceptor: Handles global error states (401 Unauthorized, 403 Forbidden)
api.interceptors.response.use(
    (response) => response,
    (error: AxiosError<ApiError>) => {
        // Check if error is 401 and NOT from login/verify endpoints (avoid loops)
        if (error.response?.status === 401 &&
            !error.config?.url?.includes('/auth/login') &&
            !error.config?.url?.includes('/auth/verify-otp') &&
            !error.config?.url?.includes('/auth/google')) {
            // Token expired or invalid
            const store = useAuthStore.getState();
            store.clearAuth();
        }

        // Handle Account Deactivation (403)
        // If the backend signals deactivation, force logout and redirect
        if (error.response?.status === 403) {
            const data = error.response.data;
            const msg = typeof data === 'string' ? data : (data as any)?.error || '';
            const isDeactivated = msg.includes("deactivated") || msg.includes("Deactivated");

            if (isDeactivated) {
                useAuthStore.getState().clearAuth();
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

// Auth API - Handles authentication flows
export const authApi = {
    // Registers a new user
    signup: async (data: SignupRequest): Promise<ApiResponse<User>> => {
        const response = await api.post('/api/auth/signup', data);
        return response.data;
    },

    // Authenticates a user
    login: async (data: LoginRequest): Promise<LoginResponse> => {
        const response = await api.post('/api/auth/login', data);
        return response.data;
    },

    // Verifies OTP for 2FA or Login
    verifyOTP: async (data: VerifyOTPRequest): Promise<LoginResponse> => {
        const response = await api.post('/api/auth/verify-otp', data);
        return response.data;
    },

    // Enables/Disables 2FA
    toggle2FA: async (enable: boolean): Promise<ApiResponse<null>> => {
        const response = await api.post('/api/auth/2fa', { enable });
        return response.data;
    },

    // Logs out the current user server-side
    logout: async (): Promise<ApiResponse<null>> => {
        const response = await api.post('/api/auth/logout');
        return response.data;
    },

    // Changes user password
    changePassword: async (data: ChangePasswordRequest): Promise<ApiResponse<null>> => {
        const response = await api.post('/api/auth/change-password', data);
        return response.data;
    },

    // Syncs session data (token validity check)
    syncSession: async (): Promise<LoginResponse> => {
        const response = await api.get('/api/auth/me');
        return response.data;
    },

    // Checks if email is already taken
    checkEmail: async (email: string): Promise<boolean> => {
        const response = await api.post('/api/auth/check-email', { email });
        return response.data.exists;
    },

    // Checks if username is already taken
    checkUsername: async (username: string): Promise<boolean> => {
        const response = await api.post('/api/auth/check-username', { username });
        return response.data.exists;
    },
};

// Profile API - Handles user profile management
export const profileApi = {
    getMyProfile: async (): Promise<User> => {
        const response = await api.get('/api/profile/me');
        return response.data;
    },

    getProfile: async (userId: string): Promise<User> => {
        const response = await api.get(`/api/profile/${userId}`);
        return response.data;
    },

    updateProfile: async (data: UpdateProfileRequest): Promise<ApiResponse<User>> => {
        const response = await api.put('/api/profile/me', data);
        return response.data;
    },

    deactivateAccount: async (): Promise<ApiResponse<null>> => {
        const response = await api.post('/api/profile/me/deactivate');
        return response.data;
    },

    deleteAccount: async (): Promise<ApiResponse<null>> => {
        const response = await api.delete('/api/profile/me');
        return response.data;
    },

    getActivity: async (limit: number = 50): Promise<ActivityLog[]> => {
        const response = await api.get(`/api/profile/me/activity?limit=${limit}`);
        return response.data;
    },
};

export { api };
