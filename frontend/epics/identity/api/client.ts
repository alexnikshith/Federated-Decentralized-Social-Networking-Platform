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

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// Create axios instance
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle errors
api.interceptors.response.use(
    (response) => response,
    (error: AxiosError<ApiError>) => {
        if (error.response?.status === 401) {
            // Token expired or invalid
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Auth API
export const authApi = {
    signup: async (data: SignupRequest): Promise<ApiResponse<User>> => {
        const response = await api.post('/api/auth/signup', data);
        return response.data;
    },

    login: async (data: LoginRequest): Promise<ApiResponse<string>> => {
        const response = await api.post('/api/auth/login', data);
        return response.data;
    },

    verifyOTP: async (data: VerifyOTPRequest): Promise<LoginResponse> => {
        const response = await api.post('/api/auth/verify-otp', data);
        return response.data;
    },

    logout: async (): Promise<ApiResponse<null>> => {
        const response = await api.post('/api/auth/logout');
        return response.data;
    },

    changePassword: async (data: ChangePasswordRequest): Promise<ApiResponse<null>> => {
        const response = await api.post('/api/auth/change-password', data);
        return response.data;
    },
};

// Profile API
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
