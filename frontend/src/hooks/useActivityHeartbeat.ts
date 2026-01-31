import { useEffect } from 'react';
import { useAuthStore } from '../../epics/identity/store/authStore';
import { useReportsApi } from '../../epics/reports/api/reportsApi';

export const useActivityHeartbeat = () => {
    const { isAuthenticated } = useAuthStore();
    const { useHeartbeat } = useReportsApi();
    const { mutate: sendHeartbeat } = useHeartbeat();

    useEffect(() => {
        if (!isAuthenticated) return;

        // Send heartbeat immediately on mount/login
        sendHeartbeat();

        // Send heartbeat every minute
        const interval = setInterval(() => {
            // Check if document is visible (user is actually looking at the page)
            if (document.visibilityState === 'visible') {
                sendHeartbeat();
            }
        }, 60000);

        return () => clearInterval(interval);
    }, [isAuthenticated, sendHeartbeat]);
};
