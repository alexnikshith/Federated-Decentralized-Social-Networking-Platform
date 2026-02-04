import axios from 'axios';
import { useAuthStore } from '../../identity/store/authStore';
import { Conversation, Message, SendMessageRequest } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add token to requests
api.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const messagingApi = {
    getConversations: async (): Promise<Conversation[]> => {
        const response = await api.get('/api/messages/conversations');
        return response.data.data || [];
    },

    getMessages: async (conversationId: string, limit = 50): Promise<Message[]> => {
        const response = await api.get(`/api/messages/conversations/${conversationId}?limit=${limit}`);
        return response.data.data || [];
    },

    sendMessage: async (data: SendMessageRequest): Promise<Message> => {
        const response = await api.post('/api/messages', data);
        return response.data.data;
    },
};
