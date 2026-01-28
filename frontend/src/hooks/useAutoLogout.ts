import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../epics/identity/store/authStore';

/**
 * Hook to handle automatic logout after inactivity
 * Tracks user activity and logs out after 30 minutes of inactivity
 */
export const useAutoLogout = () => {
    const navigate = useNavigate();
    const { isAuthenticated, updateActivity, checkAutoLogout } = useAuthStore();

    const handleActivity = useCallback(() => {
        if (isAuthenticated) {
            updateActivity();
        }
    }, [isAuthenticated, updateActivity]);

    useEffect(() => {
        if (!isAuthenticated) return;

        // Check for auto-logout on mount
        if (checkAutoLogout()) {
            navigate('/login', { replace: true });
            return;
        }

        // Activity events to track
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

        // Add event listeners
        events.forEach(event => {
            window.addEventListener(event, handleActivity);
        });

        // Check for auto-logout every minute
        const interval = setInterval(() => {
            if (checkAutoLogout()) {
                navigate('/login', { replace: true });
            }
        }, 60000); // Check every minute

        // Cleanup
        return () => {
            events.forEach(event => {
                window.removeEventListener(event, handleActivity);
            });
            clearInterval(interval);
        };
    }, [isAuthenticated, handleActivity, checkAutoLogout, navigate]);
};
