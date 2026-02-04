import { api } from '../../identity/api/client';
import { AdminStats, UserStatusUpdate, AdminPost } from '../types';
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

    toggleUserStatus: async (data: UserStatusUpdate): Promise<void> => {
        await api.post('/api/admin/users/status', data);
    },

    updateUserRole: async (userId: string, role: string): Promise<void> => {
        await api.post('/api/admin/users/role', { user_id: userId, role });
    },

    deletePost: async (postId: string): Promise<void> => {
        await api.delete(`/api/admin/posts?id=${postId}`);
    },

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
};
