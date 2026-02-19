import { api } from '../../../lib/api';
import {
    LoginRequest,
    VerifyOTPRequest,
    SignupRequest,
    UpdateProfileRequest,
    ChangePasswordRequest,
    User,
    ActivityLog
} from '../types';
import { Post } from '../../content/types';

export const identityApi = {
    login: async (data: LoginRequest) => {
        const response = await api.post('/auth/login', data);
        return response.data.data || response.data;
    },

    getLikes: async (userId: string): Promise<Post[]> => {
        const response = await api.get(`/users/${userId}/likes`);
        return response.data.data.posts || [];
    },

    getComments: async (userId: string): Promise<Post[]> => {
        const response = await api.get(`/users/${userId}/comments`);
        return response.data.data.posts || [];
    },

    verifyOTP: async (data: VerifyOTPRequest) => {
        const response = await api.post('/auth/verify-otp', data);
        return response.data.data || response.data;
    },

    signup: async (data: SignupRequest) => {
        const response = await api.post('/auth/signup', data);
        return response.data.data || response.data;
    },

    updateProfile: async (data: UpdateProfileRequest) => {
        const response = await api.put('/profile/me', data);
        return response.data.data || response.data;
    },

    changePassword: async (data: ChangePasswordRequest) => {
        const response = await api.post('/auth/change-password', data);
        return response.data.data || response.data;
    },

    deactivateAccount: async () => {
        const response = await api.post('/profile/me/deactivate');
        return response.data.data || response.data;
    },

    deleteAccount: async () => {
        const response = await api.delete('/profile/me');
        return response.data.data || response.data;
    },

    getActivity: async (limit: number = 10): Promise<ActivityLog[]> => {
        const response = await api.get(`/profile/me/activity?limit=${limit}`);
        return response.data.data || response.data;
    },

    toggle2FA: async (enabled: boolean) => {
        const response = await api.post('/auth/2fa', { enabled });
        return response.data.data || response.data;
    },

    getMe: async (): Promise<User> => {
        const response = await api.get('/profile/me');
        return response.data.data || response.data;
    }
};
