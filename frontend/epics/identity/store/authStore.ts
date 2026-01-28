import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    lastActivity: number | null;
    setAuth: (user: User, token: string) => void;
    clearAuth: () => void;
    updateUser: (user: User) => void;
    hydrate: () => void;
    updateActivity: () => void;
    checkAutoLogout: () => boolean;
}

const AUTO_LOGOUT_TIME = 30 * 60 * 1000; // 30 minutes in milliseconds

const getInitialState = () => {
    // Check if we have valid auth data in localStorage
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    const lastActivityStr = localStorage.getItem('lastActivity');

    if (token && userStr) {
        try {
            const user = JSON.parse(userStr);
            const lastActivity = lastActivityStr ? parseInt(lastActivityStr) : Date.now();

            // Check if session has expired
            if (Date.now() - lastActivity > AUTO_LOGOUT_TIME) {
                // Clear expired session
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                localStorage.removeItem('lastActivity');
                return { user: null, token: null, isAuthenticated: false, lastActivity: null };
            }

            return { user, token, isAuthenticated: true, lastActivity };
        } catch {
            // Clear bad data
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('lastActivity');
        }
    }

    return { user: null, token: null, isAuthenticated: false, lastActivity: null };
};

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => {
            const initial = getInitialState();
            return {
                ...initial,

                setAuth: (user, token) => {
                    const now = Date.now();
                    localStorage.setItem('token', token);
                    localStorage.setItem('user', JSON.stringify(user));
                    localStorage.setItem('lastActivity', now.toString());
                    set({ user, token, isAuthenticated: true, lastActivity: now });
                },

                clearAuth: () => {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    localStorage.removeItem('lastActivity');
                    set({ user: null, token: null, isAuthenticated: false, lastActivity: null });
                },

                updateUser: (user) => {
                    localStorage.setItem('user', JSON.stringify(user));
                    set({ user });
                },

                hydrate: () => {
                    const initial = getInitialState();
                    set(initial);
                },

                updateActivity: () => {
                    const now = Date.now();
                    localStorage.setItem('lastActivity', now.toString());
                    set({ lastActivity: now });
                },

                checkAutoLogout: () => {
                    const { lastActivity, isAuthenticated } = get();
                    if (!isAuthenticated || !lastActivity) return false;

                    if (Date.now() - lastActivity > AUTO_LOGOUT_TIME) {
                        get().clearAuth();
                        return true;
                    }
                    return false;
                },
            };
        },
        {
            name: 'auth-storage',
            partialize: (state) => ({
                user: state.user,
                token: state.token,
                isAuthenticated: state.isAuthenticated,
                lastActivity: state.lastActivity,
            }),
        }
    )
);
