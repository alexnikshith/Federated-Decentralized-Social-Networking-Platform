import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User } from '../types';

interface Session {
    user: User;
    token: string | null; // null if signed out
    lastActivity: number;
}

interface AuthState {
    // Current active state (backward compatible)
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    lastActivity: number | null;
    // Multi-session state
    sessions: Session[];

    // Actions
    setAuth: (user: User, token: string) => void;
    clearAuth: (logoutAll?: boolean) => void; // Logout current
    updateUser: (user: User) => void;
    updateActivity: () => void;
    checkAutoLogout: () => boolean;

    // Multi-session actions
    switchAccount: (userId: string, intentToLogin?: boolean) => void;
    removeAccount: (userId: string) => void;
    pauseSession: () => void;
    clearAllSessions: () => void;
}

const AUTO_LOGOUT_TIME = 30 * 60 * 1000; // 30 minutes

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            lastActivity: null,
            sessions: [],

            setAuth: (user, token) => {
                const now = Date.now();
                set((state) => {
                    // If there's an active user and it's not the same user we're logging in as,
                    // pause the current session before setting the new one.
                    // This effectively "logs out" the current user from the active state
                    // but keeps their session data (including token) in the sessions array.
                    if (state.user && state.user.id !== user.id) {
                        // Apply pauseSession logic directly
                        state.user = null;
                        state.token = null;
                        state.isAuthenticated = false;
                        state.lastActivity = null;
                    }

                    // Update or add session
                    const existingSessionIndex = state.sessions.findIndex(s => s.user.id === user.id);
                    const newSessions = [...state.sessions];

                    if (existingSessionIndex >= 0) {
                        newSessions[existingSessionIndex] = { user, token, lastActivity: now };
                    } else {
                        newSessions.push({ user, token, lastActivity: now });
                    }

                    return {
                        user,
                        token,
                        isAuthenticated: true,
                        lastActivity: now,
                        sessions: newSessions
                    };
                });
            },

            clearAuth: (logoutAll: boolean = false) => {
                if (logoutAll) {
                    get().clearAllSessions();
                    return;
                }

                // Logout active user: keep in sessions but nullify token
                const state = get();
                const currentUserId = state.user?.id;

                const newSessions = state.sessions.map(s =>
                    s.user.id === currentUserId
                        ? { ...s, token: null }
                        : s
                );

                // Find next active session (first one that isn't the one we just logged out of, although map handled token nulling)
                const nextActiveSession = newSessions.find(s => s.token !== null);

                if (nextActiveSession) {
                    set({
                        user: nextActiveSession.user,
                        token: nextActiveSession.token,
                        isAuthenticated: true,
                        lastActivity: Date.now(),
                        sessions: newSessions
                    });
                    setTimeout(() => window.location.href = '/dashboard', 100);
                } else {
                    set({
                        user: null,
                        token: null,
                        isAuthenticated: false,
                        lastActivity: null,
                        sessions: newSessions
                    });
                    if (window.location.pathname !== '/' && window.location.pathname !== '/register') {
                        setTimeout(() => window.location.href = '/login', 100);
                    }
                }
            },

            clearAllSessions: () => {
                localStorage.clear(); // Hard reset of storage
                set({
                    user: null,
                    token: null,
                    isAuthenticated: false,
                    lastActivity: null,
                    sessions: []
                });
            },

            pauseSession: () => {
                // Deactivate current user but keep session alive (token valid)
                // This allows logging in as someone else while keeping this session in background
                set({
                    user: null,
                    token: null,
                    isAuthenticated: false,
                    lastActivity: null
                });
            },

            updateUser: (user) => {
                set((state) => {
                    const newSessions = state.sessions.map(s =>
                        s.user.id === user.id
                            ? { ...s, user }
                            : s
                    );

                    // If updating current user
                    const isCurrentUser = state.user?.id === user.id;

                    return {
                        sessions: newSessions,
                        user: isCurrentUser ? user : state.user
                    };
                });
            },

            updateActivity: () => {
                const now = Date.now();
                set((state) => {
                    if (!state.user) return {}; // No active user

                    const newSessions = state.sessions.map(s =>
                        s.user.id === state.user?.id
                            ? { ...s, lastActivity: now }
                            : s
                    );

                    return {
                        lastActivity: now,
                        sessions: newSessions
                    };
                });
            },

            checkAutoLogout: () => {
                const { lastActivity, isAuthenticated, clearAuth } = get();
                if (!isAuthenticated || !lastActivity) return false;

                if (Date.now() - lastActivity > AUTO_LOGOUT_TIME) {
                    clearAuth();
                    return true;
                }
                return false;
            },

            switchAccount: (userId: string, intentToLogin: boolean = false) => {
                set((state) => {
                    const session = state.sessions.find(s => s.user.id === userId);

                    if (session && session.token) {
                        // Switch to active session
                        const now = Date.now();
                        const newSessions = state.sessions.map(s =>
                            s.user.id === userId
                                ? { ...s, lastActivity: now }
                                : s
                        );

                        return {
                            user: session.user,
                            token: session.token,
                            isAuthenticated: true,
                            lastActivity: now,
                            sessions: newSessions
                        };
                    } else if (session && intentToLogin) {
                        // Return the user object so the UI can pre-fill email/instance, 
                        // but stay unauthenticated
                        return {
                            user: session.user,
                            token: null,
                            isAuthenticated: false,
                            lastActivity: null
                        };
                    } else if (session) {
                        // Session exists but logged out, and no intent to login via switcher
                        return {
                            user: null,
                            token: null,
                            isAuthenticated: false,
                            lastActivity: null
                        };
                    }
                    return {};
                });
            },

            removeAccount: (userId: string) => {
                set((state) => {
                    const newSessions = state.sessions.filter(s => s.user.id !== userId);
                    const isCurrentUser = state.user?.id === userId;

                    return {
                        sessions: newSessions,
                        ...(isCurrentUser ? {
                            user: null,
                            token: null,
                            isAuthenticated: false,
                            lastActivity: null
                        } : {})
                    };
                });
            }
        }),
        {
            name: 'auth-storage',
            storage: createJSONStorage(() => localStorage),
            version: 2, // Increment version to force clear old state
            migrate: (persistedState: unknown, version: number) => {
                if (version < 2) {
                    // Critical schema change, wipe old state
                    return {
                        user: null,
                        token: null,
                        isAuthenticated: false,
                        lastActivity: null,
                        sessions: []
                    };
                }
                return persistedState as AuthState;
            },
            partialize: (state) => ({
                user: state.user,
                token: state.token,
                isAuthenticated: state.isAuthenticated,
                lastActivity: state.lastActivity,
                sessions: state.sessions,
            }),
        }
    )
);
