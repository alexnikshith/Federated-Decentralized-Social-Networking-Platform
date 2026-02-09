import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User } from '../types';
import { COMMUNITIES } from '../../../src/config/communities';

interface Session {
    user: User;
    token: string | null; // null if signed out
    lastActivity: number;
    communityId: string;
}

interface AuthState {
    // Current active state
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    lastActivity: number | null;

    // Multi-session state
    sessions: Session[];

    // Actions
    setAuth: (user: User, token: string) => void;
    clearAuth: (logoutAll?: boolean) => void;
    updateUser: (user: User) => void;
    updateActivity: () => void;
    checkAutoLogout: () => boolean;

    // Multi-session actions
    switchAccount: (userId: string, intentToLogin?: boolean) => void;
    switchCommunity: (communityId: string) => void; // New Action
    removeAccount: (userId: string) => void;
    pauseSession: () => void;
    clearAllSessions: () => void;
}

const AUTO_LOGOUT_TIME = 30 * 60 * 1000; // 30 minutes
const DEFAULT_COMMUNITY_ID = 'community-1'; // Hardcoded fallback match config

// useAuthStore uses Zustand with persistent storage logic
// It manages:
// 1. Current Active Session (user, token)
// 2. Multi-session background state (stored in `sessions[]`)
// 3. Activity tracking for auto-logout
export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            lastActivity: null,
            sessions: [],

            // setAuth logs in a user and updates the session registry
            setAuth: (user, token) => {
                const now = Date.now();
                // Capture the context in which this auth happened
                const currentCommunityId = localStorage.getItem('active_community_id') || DEFAULT_COMMUNITY_ID;

                set((state) => {
                    // Update or add session for this COMMUNITY + USER combination
                    const existingIndex = state.sessions.findIndex(s =>
                        s.communityId === currentCommunityId && s.user.id === user.id
                    );
                    const newSessions = [...state.sessions];

                    if (existingIndex >= 0) {
                        newSessions[existingIndex] = { user, token, lastActivity: now, communityId: currentCommunityId };
                    } else {
                        newSessions.push({ user, token, lastActivity: now, communityId: currentCommunityId });
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

            // clearAuth logs out the current user or all users
            clearAuth: (logoutAll: boolean = false) => {
                if (logoutAll) {
                    get().clearAllSessions();
                    return;
                }

                // Logout active user: keep in sessions but nullify token
                // Identify via current active community
                const currentCommunityId = localStorage.getItem('active_community_id') || DEFAULT_COMMUNITY_ID;
                const state = get();

                const newSessions = state.sessions.map(s =>
                    s.communityId === currentCommunityId
                        ? { ...s, token: null }
                        : s
                );

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
            },

            // clearAllSessions removes everything locally
            clearAllSessions: () => {
                localStorage.clear();
                set({
                    user: null,
                    token: null,
                    isAuthenticated: false,
                    lastActivity: null,
                    sessions: []
                });
            },

            // pauseSession deactivates UI but keeps token valid (for switching)
            pauseSession: () => {
                set({
                    user: null,
                    token: null,
                    isAuthenticated: false,
                    lastActivity: null
                });
            },

            updateUser: (user) => {
                set((state) => {
                    const currentCommunityId = localStorage.getItem('active_community_id') || DEFAULT_COMMUNITY_ID;
                    const newSessions = state.sessions.map(s =>
                        s.communityId === currentCommunityId
                            ? { ...s, user }
                            : s
                    );

                    return {
                        sessions: newSessions,
                        user: state.user // Update active user usually handled by session restore
                    };
                });
            },

            updateActivity: () => {
                const now = Date.now();
                set((state) => {
                    if (!state.isAuthenticated) return {};

                    const currentCommunityId = localStorage.getItem('active_community_id') || DEFAULT_COMMUNITY_ID;
                    const newSessions = state.sessions.map(s =>
                        s.communityId === currentCommunityId
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

            // switchAccount moves a background session to active state
            switchAccount: (userId: string, intentToLogin: boolean = false) => {
                const state = get();
                const session = state.sessions.find(s => s.user.id === userId);

                if (session && session.token) {
                    // Update active community context
                    const comm = COMMUNITIES.find(c => c.id === session.communityId);
                    if (comm) {
                        localStorage.setItem('active_community_id', comm.id);
                        localStorage.setItem('active_community_url', comm.url);
                    }

                    set({
                        user: session.user,
                        token: session.token,
                        isAuthenticated: true,
                        lastActivity: Date.now()
                    });
                } else if (intentToLogin) {
                    // Prepare for login: clear current auth but keep sessions
                    // If we know the community, set it
                    if (session) {
                        const comm = COMMUNITIES.find(c => c.id === session.communityId);
                        if (comm) {
                            localStorage.setItem('active_community_id', comm.id);
                            localStorage.setItem('active_community_url', comm.url);
                        }
                    }
                    set({ user: null, token: null, isAuthenticated: false });
                } else {
                    set({ user: null, token: null, isAuthenticated: false });
                }
            },

            switchCommunity: (communityId: string) => {
                const state = get();
                // Find the most recently active session for this community
                const session = state.sessions
                    .filter(s => s.communityId === communityId && s.token)
                    .sort((a, b) => b.lastActivity - a.lastActivity)[0];

                if (session) {
                    // Restore session
                    set({
                        user: session.user,
                        token: session.token,
                        isAuthenticated: true,
                        lastActivity: Date.now()
                    });
                } else {
                    // No valid session for this community
                    set({
                        user: null,
                        token: null,
                        isAuthenticated: false,
                        lastActivity: null
                    });
                }
            },

            removeAccount: (userId: string) => {
                set((state) => ({
                    sessions: state.sessions.filter(s => s.user.id !== userId)
                }));
            }
        }),
        {
            name: 'auth-storage',
            storage: createJSONStorage(() => localStorage),
            version: 3, // Migrating to V3 for Community Support
            migrate: (persistedState: unknown, version: number) => {
                if (version < 3) {
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
