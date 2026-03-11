import { api } from '../../identity/api/client';
import { AdminStats, UserStatusUpdate, AdminPost, TrafficReport } from '../types';
import { User } from '../../identity/types';

export const adminApi = {
    getStats: async (): Promise<AdminStats> => {
        const response = await api.get('/api/admin/stats');
        return response.data;
    },

    listUsers: async (): Promise<User[]> => {
        const response = await api.get('/api/admin/users');
        return response.data;
    },

    // Deactivates/Reactivates a user account
    // If reason is provided, it may be sent via email
    toggleUserStatus: async (data: UserStatusUpdate): Promise<void> => {
        await api.post('/api/admin/users/status', data);
    },

    // Promotes/Demotes users (e.g. user -> admin)
    updateUserRole: async (userId: string, role: string): Promise<void> => {
        await api.post('/api/admin/users/role', { user_id: userId, role });
    },

    // Force deletion of a post (moderation)
    deletePost: async (postId: string): Promise<void> => {
        await api.delete(`/api/admin/posts?id=${postId}`);
    },

    // Permanently nukes a user
    deleteUser: async (userId: string): Promise<void> => {
        await api.delete(`/api/admin/users?id=${userId}`);
    },

    listReports: async (): Promise<any[]> => {
        const response = await api.get('/api/admin/reports');
        return response.data;
    },

    resolveReport: async (reportId: string): Promise<void> => {
        await api.delete(`/api/admin/reports/resolve?id=${reportId}`);
    },

    resolveUserReport: async (reportId: string): Promise<void> => {
        await api.delete(`/api/reports/admin/resolve?id=${reportId}`);
    },

    getTraffic: async (start_date?: string, end_date?: string): Promise<TrafficReport> => {
        const response = await api.get('/api/admin/traffic', {
            params: { start_date, end_date }
        });
        return response.data;
    },
};
