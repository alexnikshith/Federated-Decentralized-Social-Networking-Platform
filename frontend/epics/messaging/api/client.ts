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

    async getMessages(conversationId: string): Promise<Message[]> {
        const response = await api.get(`/api/messages/conversations/${conversationId}`);
        return response.data.data || [];
    },

    async uploadMedia(formData: FormData): Promise<{ url: string; fileName: string; type: string }> {
        const response = await api.post('/api/messages/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data.data;
    },

    sendMessage: async (data: SendMessageRequest): Promise<Message> => {
        const response = await api.post('/api/messages', data);
        return response.data.data;
    },

    deleteMessage: async (messageId: string): Promise<void> => {
        await api.delete(`/api/messages/${messageId}`);
    },

    deleteConversation: async (conversationId: string): Promise<void> => {
        await api.delete(`/api/messages/conversations/${conversationId}`);
    },
};
