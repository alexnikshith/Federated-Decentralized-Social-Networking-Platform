import { vi } from 'vitest';

// Access the global mock state initialized in setupTests.ts
export const mockState = (globalThis as any).__MOCK_STATE__ || {
    auth: { user: null, token: null, isAuthenticated: false },
    content: { notifications: [], posts: [], loading: false, error: null, unreadCount: 0 }
};

export const resetMockState = () => {
    mockState.auth.user = { id: 'user-1', username: 'testuser', displayName: 'Test User' };
    mockState.auth.token = 'fake-token';
    mockState.auth.isAuthenticated = true;
    mockState.content.notifications = [];
    mockState.content.posts = [];
    mockState.content.loading = false;
    mockState.content.error = null;
    mockState.content.unreadCount = 0;
};

// Also export the store mocks if tests need to track calls on them
// Note: These are the same objects used in setupTests.ts
export const mockAuthStore = {
    get user() { return mockState.auth.user; },
    get token() { return mockState.auth.token; },
    get isAuthenticated() { return mockState.auth.isAuthenticated; },
    setUser: (user: any) => { mockState.auth.user = user; },
    clearAuth: vi.fn(),
};

export const mockContentStore = {
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

// Mock Axios API Client
vi.mock('../api/client', () => ({
    createPost: vi.fn(),
    getFeed: vi.fn(),
    getUserPosts: vi.fn(),
    likePost: vi.fn(),
    unlikePost: vi.fn(),
    deletePost: vi.fn(),
    createComment: vi.fn(),
    getComments: vi.fn(),
    followUser: vi.fn(),
    unfollowUser: vi.fn(),
    getNotifications: vi.fn(),
    searchUsers: vi.fn(),
    getPostById: vi.fn(),
    getPostLikers: vi.fn(),
    getFollowers: vi.fn(),
    markNotificationAsRead: vi.fn(),
    markAllNotificationsAsRead: vi.fn(),
    getUnreadCount: vi.fn(),
}));

// Mock Messaging API
vi.mock('../../messaging/api/client', () => ({
    messagingApi: {
        sendMessage: vi.fn(),
    },
}));
