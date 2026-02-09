import axios from 'axios';
import { useAuthStore } from '../../identity/store/authStore';
import { Conversation, Message, SendMessageRequest } from '../types';

const API_URL = localStorage.getItem('active_community_url') || import.meta.env.VITE_API_URL || 'http://localhost:8080';

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

// Handle errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Handle Account Deactivation (403)
        if (error.response?.status === 403) {
            const data = error.response.data;
            const msg = typeof data === 'string' ? data : (data as any)?.error || '';
            const isDeactivated = msg.includes("deactivated") || msg.includes("Deactivated") || msg.includes("Account has been deactivated");

            if (isDeactivated) {
                useAuthStore.getState().clearAuth();
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

// Basic API setup - similar to other modules
// ...

export const messagingApi = {
    getConversations: async (): Promise<Conversation[]> => {
        const response = await api.get('/api/messages/conversations');
        return response.data.data || [];
    },

    getUnreadCount: async (): Promise<{ count: number }> => {
        const response = await api.get('/api/messages/unread-count');
        return response.data.data;
    },

    async getMessages(conversationId: string): Promise<Message[]> {
        const response = await api.get(`/api/messages/conversations/${conversationId}`);
        return response.data.data || [];
    },

    // Handles media uploads for messages (image/video/file)
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

    async markConversationAsRead(conversationId: string): Promise<void> {
        await api.post(`/api/messages/conversations/${conversationId}/read`);
    },
};
