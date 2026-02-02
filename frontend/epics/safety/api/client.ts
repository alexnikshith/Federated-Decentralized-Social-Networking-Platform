import axios from 'axios';
import type { Block, BlockResponse } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

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
    return response.data;
};
