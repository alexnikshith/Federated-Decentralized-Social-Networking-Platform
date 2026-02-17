
import { describe, it, expect, beforeEach, vi } from 'vitest';
vi.unmock('../store/authStore');
import { useAuthStore } from '../store/authStore';
import { act } from '@testing-library/react';
import type { User } from '../types';

// Mock localStorage to ensure clean state
const localStorageMock = (function () {
    let store: Record<string, string> = {};
    return {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => {
            store[key] = value.toString();
        }),
        clear: vi.fn(() => {
            store = {};
        }),
        removeItem: vi.fn((key: string) => {
            delete store[key];
        })
    };
})();

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock
});

describe('useAuthStore', () => {
    const initialState = useAuthStore.getState();

    beforeEach(() => {
        useAuthStore.setState(initialState, true); // Reset state
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('should initially have null user and token', () => {
        const state = useAuthStore.getState();
        expect(state.user).toBeNull();
        expect(state.token).toBeNull();
        expect(state.isAuthenticated).toBe(false);
    });

    it('should set auth state on login', () => {
        const user: User = {
            id: '123',
            email: 'test@example.com',
            username: 'testuser',
            display_name: 'Test User',
            bio: 'Test Bio',
            avatar_url: 'http://example.com/avatar.jpg',
            role: 'user',
            is_active: true,
            is_2fa_enabled: false,
            created_at: new Date().toISOString(),
            profile_visibility: 'public',
            instance: 'local',
            joined_communities: []
        };
        const token = 'fake-jwt-token';

        act(() => {
            useAuthStore.getState().setAuth(user, token);
        });

        const state = useAuthStore.getState();
        expect(state.user).toEqual(user);
        expect(state.token).toBe(token);
        expect(state.isAuthenticated).toBe(true);
        expect(state.sessions).toHaveLength(1);
    });

    it('should clear auth state on logout', () => {
        const user: User = {
            id: '123',
            email: 'test@example.com',
            username: 'testuser',
            display_name: 'Test User',
            bio: 'Test Bio',
            avatar_url: 'http://example.com/avatar.jpg',
            role: 'user',
            is_active: true,
            is_2fa_enabled: false,
            created_at: new Date().toISOString(),
            profile_visibility: 'public',
            instance: 'local',
            joined_communities: []
        };
        const token = 'fake-jwt-token';

        act(() => {
            useAuthStore.getState().setAuth(user, token);
            useAuthStore.getState().clearAuth();
        });

        const state = useAuthStore.getState();
        expect(state.user).toBeNull();
        expect(state.token).toBeNull();
        expect(state.isAuthenticated).toBe(false);
        // Session should remain but with null token
        expect(state.sessions[0].token).toBeNull();
    });

    it('should switch account correctly', () => {
        const user1: User = {
            id: '123', email: 'test1@example.com', username: 'user1', role: 'user',
            is_active: true, is_2fa_enabled: false, created_at: new Date().toISOString(),
            profile_visibility: 'public', instance: 'local', joined_communities: [],
            display_name: 'User 1', bio: '', avatar_url: ''
        };
        const user2: User = {
            id: '456', email: 'test2@example.com', username: 'user2', role: 'user',
            is_active: true, is_2fa_enabled: false, created_at: new Date().toISOString(),
            profile_visibility: 'public', instance: 'local', joined_communities: [],
            display_name: 'User 2', bio: '', avatar_url: ''
        };

        act(() => {
            useAuthStore.getState().setAuth(user1, 'token1');
        });

        // Simulate logging in as another user
        act(() => {
            useAuthStore.getState().setAuth(user2, 'token2');
        });

        const state = useAuthStore.getState();
        expect(state.sessions).toHaveLength(2);
        expect(state.user).toEqual(user2);

        // Switch back to user1
        act(() => {
            useAuthStore.getState().switchAccount(user1.id);
        });

        expect(useAuthStore.getState().user).toEqual(user1);
        expect(useAuthStore.getState().token).toBe('token1');
    });
});
