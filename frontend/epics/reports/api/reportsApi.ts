import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../identity/store/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export interface DailyActivity {
    date: string;
    minutes: number;
}

export interface ActivityReport {
    total_hours: number;
    daily_stats: DailyActivity[];
}

export interface DailyInteraction {
    date: string;
    likes: number;
    comments: number;
    follows: number;
}

export interface InteractionReport {
    total_likes: number;
    total_comments: number;
    total_follows: number;
    daily_stats: DailyInteraction[];
}

export const useReportsApi = () => {
    const { token } = useAuthStore();
    const queryClient = useQueryClient();

    const api = axios.create({
        baseURL: API_URL,
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
        useInteractionReport: (startDate?: string, endDate?: string) => useQuery({
            queryKey: ['interaction-report', startDate, endDate],
            queryFn: () => fetchInteractions(startDate, endDate),
            enabled: !!token
        })
    };
};

