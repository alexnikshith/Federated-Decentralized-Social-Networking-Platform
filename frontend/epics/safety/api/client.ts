import axios from 'axios';
import type { Block, BlockResponse, CommunityGuideline, ModerationLog } from '../types';

import { useAuthStore } from '../../identity/store/authStore';

const API_URL = localStorage.getItem('active_community_url') || import.meta.env.VITE_API_URL || import.meta.env.VITE_COMMUNITY1_URL || 'http://localhost:8080';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add token to requests
api.interceptors.request.use((config) => {
    config.baseURL = localStorage.getItem('active_community_url') || config.baseURL;
    const token = useAuthStore.getState().token;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle 401 Unauthorized globally
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            useAuthStore.getState().clearAuth();
        }
        return Promise.reject(error);
    }
);

export const blockUser = async (userId: string): Promise<BlockResponse> => {
    const response = await api.post(`/api/users/${userId}/block`);
    return response.data;
};

export const unblockUser = async (userId: string): Promise<BlockResponse> => {
    const response = await api.delete(`/api/users/${userId}/block`);
    return response.data;
};

export const getBlockedUsers = async (): Promise<Block[]> => {
    const response = await api.get('/api/users/blocked');
    return response.data?.data || [];
};

export const getGuidelines = async (): Promise<CommunityGuideline[]> => {
    const response = await api.get('/api/moderation/guidelines');
    return response.data?.data || [];
};

export const getMyModerationLogs = async (): Promise<ModerationLog[]> => {
    const response = await api.get('/api/moderation/my-logs');
    return response.data?.data || [];
};

export const reportUser = async (userId: string, reason: string): Promise<any> => {
    const response = await api.post(`/api/users/${userId}/report`, { reason });
    return response.data;
};

// Admin Moderation CRUD
export const createGuideline = async (data: any): Promise<any> => {
    const response = await api.post('/api/admin/moderation/guidelines', data);
    return response.data?.data;
};

export const updateGuideline = async (id: string, data: any): Promise<any> => {
    const response = await api.put(`/api/admin/moderation/guidelines/${id}`, data);
    return response.data?.data;
};

export const deleteGuideline = async (id: string): Promise<any> => {
    const response = await api.delete(`/api/admin/moderation/guidelines/${id}`);
    return response.data?.data;
};

export const runRetroactiveScan = async (): Promise<any> => {
    const response = await api.post('/api/admin/moderation/scan');
    return response.data?.data;
};

export const getAllModerationLogs = async (): Promise<ModerationLog[]> => {
    const response = await api.get('/api/admin/moderation/logs');
    return response.data?.data || [];
};
