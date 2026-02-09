import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../identity/store/authStore';

const API_URL = localStorage.getItem('active_community_url') || import.meta.env.VITE_API_URL || 'http://localhost:8080';

// DailyActivity represents time spent on the platform
export interface DailyActivity {
    date: string;
    minutes: number;
}

// ActivityReport aggregates daily activity
export interface ActivityReport {
    total_hours: number;
    daily_stats: DailyActivity[];
}

// DailyInteraction represents actions taken/received (likes, comments, etc)
export interface DailyInteraction {
    date: string;
    likes: number;
    comments: number;
    follows: number;
    posts: number;
}

export interface InteractionReport {
    total_likes: number;
    total_comments: number;
    total_follows: number;
    total_posts: number;
    daily_stats: DailyInteraction[];
}

export const useReportsApi = () => {
    const { token } = useAuthStore();
    const queryClient = useQueryClient();

    const api = axios.create({
        baseURL: localStorage.getItem('active_community_url') || API_URL,
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    const sendHeartbeat = async () => {
        await api.post('/api/reports/heartbeat');
    };

    const fetchActivity = async (startDate?: string, endDate?: string): Promise<ActivityReport> => {
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);

        const response = await api.get('/api/reports/activity', { params });
        return response.data;
    };

    const submitReport = async (data: { reported_id: string; reason: string; description?: string }) => {
        await api.post('/api/reports/user', data);
    };

    const getAdminReports = async (): Promise<any[]> => {
        const response = await api.get('/api/reports/admin/list');
        return response.data;
    };

    // Fetches interactions RECEIVED by the user
    const fetchInteractions = async (startDate?: string, endDate?: string): Promise<InteractionReport> => {
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);

        const response = await api.get('/api/reports/interactions', { params });
        return response.data;
    };

    return {
        useHeartbeat: () => useMutation({
            mutationFn: sendHeartbeat,
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: ['activity-report'] });
            }
        }),
        useActivityReport: (startDate?: string, endDate?: string) => useQuery({
            queryKey: ['activity-report', startDate, endDate],
            queryFn: () => fetchActivity(startDate, endDate),
            enabled: !!token
        }),
        useSubmitReport: () => useMutation({
            mutationFn: submitReport,
            onSuccess: () => {
                // queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
            }
        }),
        useAdminReports: () => useQuery({
            queryKey: ['admin-reports'],
            queryFn: getAdminReports,
            enabled: !!token
        }),
        useInteractionReport: (startDate?: string, endDate?: string) => useQuery({
            queryKey: ['interaction-report', startDate, endDate],
            queryFn: () => fetchInteractions(startDate, endDate),
            enabled: !!token
        }),
        useInteractionMadeReport: (startDate?: string, endDate?: string) => useQuery({
            queryKey: ['interaction-made-report', startDate, endDate],
            queryFn: async () => {
                const params = new URLSearchParams();
                if (startDate) params.append('start_date', startDate);
                if (endDate) params.append('end_date', endDate);
                const response = await api.get('/api/reports/interactions-made', { params });
                return response.data;
            },
            enabled: !!token
        })
    };
};
