import axios from 'axios';
import type {
    Post,
    Comment,
    Notification,
    FeedResponse,
    CreatePostRequest,
    CreateCommentRequest,
    PublicUser,
    PostLiker,
} from '../types';
import { useAuthStore } from '../../identity/store/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add token to requests
api.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle 401 Unauthorized globally
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Token expired or server reset
            useAuthStore.getState().clearAuth(); // Use clearAuth to keep session but invalidate token
        }
        return Promise.reject(error);
    }
);


// Posts
export const createPost = async (data: CreatePostRequest): Promise<Post> => {
    const response = await api.post('/api/posts', data);
    return response.data.data;
};

export const getFeed = async (limit = 50): Promise<FeedResponse> => {
    const response = await api.get(`/api/feed?limit=${limit}`);
    return response.data.data;
};

export const getUserPosts = async (userId: string, limit = 50): Promise<FeedResponse> => {
    const response = await api.get(`/api/users/${userId}/posts?limit=${limit}`);
    return response.data.data;
};

export const getUserLikedPosts = async (userId: string, limit = 50): Promise<Post[]> => {
    const response = await api.get(`/api/users/${userId}/likes?limit=${limit}`);
    return response.data.data.posts || [];
};

export const getUserCommentedPosts = async (userId: string, limit = 50): Promise<Post[]> => {
    const response = await api.get(`/api/users/${userId}/comments?limit=${limit}`);
    return response.data.data.posts || [];
};

export const likePost = async (postId: string): Promise<void> => {
    await api.post(`/api/posts/${postId}/like`);
};

export const unlikePost = async (postId: string): Promise<void> => {
    await api.delete(`/api/posts/${postId}/like`);
};

export const deletePost = async (postId: string): Promise<void> => {
    await api.delete(`/api/posts/${postId}`);
};

export const getPostLikers = async (postId: string): Promise<PostLiker[]> => {
    const response = await api.get(`/api/posts/${postId}/likers`);
    return response.data.data;
};

// Comments
export const createComment = async (
    postId: string,
    data: CreateCommentRequest
): Promise<Comment> => {
    const response = await api.post(`/api/posts/${postId}/comments`, data);
    return response.data.data;
};

export const getComments = async (postId: string): Promise<Comment[]> => {
    const response = await api.get(`/api/posts/${postId}/comments`);
    return response.data.data;
};

export const deleteComment = async (commentId: string): Promise<void> => {
    await api.delete(`/api/comments/${commentId}`);
};

// Follow
export const followUser = async (userId: string): Promise<void> => {
    await api.post(`/api/users/${userId}/follow`);
};

export const unfollowUser = async (userId: string): Promise<void> => {
    await api.delete(`/api/users/${userId}/unfollow`);
};

export const getFollowers = async (userId: string): Promise<PublicUser[]> => {
    const response = await api.get(`/api/users/${userId}/followers`);
    return response.data.data;
};

export const getFollowing = async (userId: string): Promise<PublicUser[]> => {
    const response = await api.get(`/api/users/${userId}/following`);
    return response.data.data;
};

// Notifications
export const getNotifications = async (limit = 50): Promise<Notification[]> => {
    const response = await api.get(`/api/notifications?limit=${limit}`);
    return response.data.data;
};

export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
    await api.put(`/api/notifications/${notificationId}/read`);
};

export const markAllNotificationsAsRead = async (): Promise<void> => {
    // Assuming backend endpoint exists. If not, this might 404. 
    // Standard convention or known from context would be preferable.
    // Given the prompt implies user wants it, I'll add the client method.
    await api.put(`/api/notifications/read-all`);
};

export const getUnreadCount = async (): Promise<number> => {
    const response = await api.get('/api/notifications/unread/count');
    return response.data.data.count;
};

// Search
export const searchUsers = async (query: string, limit = 20): Promise<PublicUser[]> => {
    const response = await api.get(`/api/users/search?q=${encodeURIComponent(query)}&limit=${limit}`);
    return response.data.data;
};
