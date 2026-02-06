import { useEffect } from 'react';
import { useAuthStore } from '../../epics/identity/store/authStore';
import { useReportsApi } from '../../epics/reports/api/reportsApi';

export const useActivityHeartbeat = () => {
    const { isAuthenticated } = useAuthStore();
    const { useHeartbeat } = useReportsApi();
    const { mutate: sendHeartbeat } = useHeartbeat();

    // Effect to send heartbeat periodically
    // This maintains "last_active" status in the backend and tracks engagement minutes
    useEffect(() => {
        if (!isAuthenticated) return;

        // Send heartbeat immediately on mount/login to mark start of session
        sendHeartbeat();

        // Send heartbeat every minute to count active minutes
        const interval = setInterval(() => {
            // Check if document is visible (user is actually looking at the page)
            // We only count minutes when the user is active on the tab
            if (document.visibilityState === 'visible') {
                sendHeartbeat();
            }
        }, 60000);

        return () => clearInterval(interval);
    }, [isAuthenticated, sendHeartbeat]);
};
