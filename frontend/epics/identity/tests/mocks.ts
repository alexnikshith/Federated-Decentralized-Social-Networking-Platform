import { vi } from 'vitest';

// Mock Auth Store
export const mockAuthStore = {
    user: { id: 'user-1', username: 'testuser', displayName: 'Test User' },
    token: 'fake-token',
    isAuthenticated: true,
    clearAuth: vi.fn(),
};

vi.mock('../../identity/store/authStore', () => ({
    useAuthStore: {
        getState: () => mockAuthStore,
        subscribe: vi.fn(),
    },
}));

// Mock Content Store
export const mockContentStore = {
    posts: [],
    loading: false,
    error: null,
    setPosts: vi.fn(),
    addPost: vi.fn(),
    updatePost: vi.fn(),
    removePost: vi.fn(),
};

vi.mock('../../content-sharing/store/contentStore', () => ({
    useContentStore: {
        getState: () => mockContentStore,
        subscribe: vi.fn(),
    },
}));

// Mock Axios API Client
vi.mock('../../content-sharing/api/client', () => ({
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
}));
