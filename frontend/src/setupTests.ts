import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Global Mocks for Epic Stores
// This ensures that all components see the same mocked stores regardless of import order

const mockState = {
    auth: {
        user: { id: 'user-1', username: 'testuser', displayName: 'Test User' },
        token: 'fake-token',
        isAuthenticated: true,
    },
    content: {
        notifications: [],
        posts: [],
        loading: false,
        error: null,
        unreadCount: 0,
    }
};

(globalThis as any).__MOCK_STATE__ = mockState;

const mockAuthStore = {
    get user() { return mockState.auth.user; },
    get token() { return mockState.auth.token; },
    get isAuthenticated() { return mockState.auth.isAuthenticated; },
    setUser: (user: any) => { mockState.auth.user = user; },
    clearAuth: vi.fn(),
};

const mockContentStore = {
    get notifications() { return mockState.content.notifications; },
    set notifications(val) { mockState.content.notifications = val; },
    get posts() { return mockState.content.posts; },
    set posts(val) { mockState.content.posts = val; },
    get loading() { return mockState.content.loading; },
    get error() { return mockState.content.error; },
    get unreadCount() { return mockState.content.unreadCount; },
    set unreadCount(val) { mockState.content.unreadCount = val; },

    setPosts: vi.fn((posts) => { mockState.content.posts = posts; }),
    addPost: vi.fn(),
    updatePost: vi.fn(),
    removePost: vi.fn(),
    fetchNotifications: vi.fn(),
    markAsRead: vi.fn(),
    fetchUnreadCount: vi.fn(),
    likePost: vi.fn(),
    unlikePost: vi.fn(),
    deletePost: vi.fn(),
    savePost: vi.fn(),
    unsavePost: vi.fn(),
    reportPost: vi.fn(),
    interactPost: vi.fn(),
    createPost: vi.fn(),
};

vi.mock('@/epics/identity/store/authStore', () => ({
    useAuthStore: vi.fn(() => mockAuthStore),
}));

vi.mock('@/epics/content-sharing/store/contentStore', () => ({
    useContentStore: vi.fn(() => mockContentStore),
}));

// Mock also with relative paths just in case components use them
vi.mock('../epics/identity/store/authStore', () => ({
    useAuthStore: vi.fn(() => mockAuthStore),
}));

vi.mock('../epics/content-sharing/store/contentStore', () => ({
    useContentStore: vi.fn(() => mockContentStore),
}));
