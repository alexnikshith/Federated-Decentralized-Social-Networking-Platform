import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';

interface Session {
    user: User;
    token: string | null;
    lastActivity: number;
    communityId: string;
}

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    lastActivity: number | null;
    sessions: Session[];

    setAuth: (user: User, token: string) => Promise<void>;
    clearAuth: (logoutAll?: boolean) => Promise<void>;
    updateUser: (user: User) => void;
    updateActivity: () => void;
    switchAccount: (userId: string, communityId?: string) => Promise<void>;
    removeAccount: (userId: string) => void;
    clearAllSessions: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

const TOKEN_KEY = 'nexus_auth_token';
const DEFAULT_COMMUNITY_ID = 'community-1';

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            lastActivity: null,
            sessions: [],

            setAuth: async (user, token) => {
                const now = Date.now();
                // Store token securely
                await SecureStore.setItemAsync(TOKEN_KEY, token);

                set((state) => {
                    const currentCommunityId = DEFAULT_COMMUNITY_ID; // Simplified for MVP
                    const existingIndex = state.sessions.findIndex(s =>
                        s.user.id === user.id
                    );
                    const newSessions = [...state.sessions];

                    const sessionData = { user, token, lastActivity: now, communityId: currentCommunityId };

                    if (existingIndex >= 0) {
                        newSessions[existingIndex] = sessionData;
                    } else {
                        newSessions.push(sessionData);
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

            clearAuth: async (logoutAll = false) => {
                if (logoutAll) {
                    await get().clearAllSessions();
                    return;
                }

                await SecureStore.deleteItemAsync(TOKEN_KEY);

                set((state) => ({
                    user: null,
                    token: null,
                    isAuthenticated: false,
                    lastActivity: null,
                    sessions: state.sessions.map(s =>
                        s.user.id === state.user?.id ? { ...s, token: null } : s
                    )
                }));
            },

            updateUser: (user) => {
                set((state) => ({
                    user,
                    sessions: state.sessions.map(s =>
                        s.user.id === user.id ? { ...s, user } : s
                    )
                }));
            },

            updateActivity: () => {
                const now = Date.now();
                set((state) => ({
                    lastActivity: now,
                    sessions: state.sessions.map(s =>
                        s.user.id === state.user?.id ? { ...s, lastActivity: now } : s
                    )
                }));
            },

            switchAccount: async (userId, communityId) => {
                const state = get();
                const session = state.sessions.find(s => s.user.id === userId);

                if (session && session.token) {
                    await SecureStore.setItemAsync(TOKEN_KEY, session.token);
                    set({
                        user: session.user,
                        token: session.token,
                        isAuthenticated: true,
                        lastActivity: Date.now()
                    });
                }
            },

            removeAccount: (userId) => {
                set((state) => ({
                    sessions: state.sessions.filter(s => s.user.id !== userId)
                }));
            },

            clearAllSessions: async () => {
                await SecureStore.deleteItemAsync(TOKEN_KEY);
                set({
                    user: null,
                    token: null,
                    isAuthenticated: false,
                    lastActivity: null,
                    sessions: []
                });
            },

            refreshUser: async () => {
                const { api } = await import('../../../lib/api');
                try {
                    const response = await api.get('/profile/me');
                    const data = response.data.data || response.data;
                    if (data) {
                        get().updateUser(data);
                    }
                } catch (err) {
                    console.error('Failed to refresh user:', err);
                }
            }
        }),
        {
            name: 'nexus-auth-storage',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                user: state.user,
                sessions: state.sessions,
                isAuthenticated: state.isAuthenticated,
                lastActivity: state.lastActivity
            })
        }
    )
);
