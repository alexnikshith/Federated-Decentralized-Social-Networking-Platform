import { api } from '../../../lib/api';
import { Post, FeedResponse, CreatePostRequest, CreateCommentRequest, Comment } from '../types';

export const postApi = {
    // Fetch global/community feed
    getFeed: async (page = 1, limit = 20) => {
        const response = await api.get<FeedResponse>(`/posts?page=${page}&limit=${limit}`);
        return response.data;
    },

    // Fetch single post
    getPost: async (id: string) => {
        const response = await api.get<Post>(`/posts/${id}`);
        return response.data;
    },

    // Create a new post
    createPost: async (data: CreatePostRequest) => {
        const response = await api.post<Post>('/posts', data);
        return response.data;
    },

    // Delete a post
    deletePost: async (id: string) => {
        await api.delete(`/posts/${id}`);
    },

    // Like/Unlike a post
    toggleLike: async (id: string) => {
        const response = await api.post(`/posts/${id}/like`);
        return response.data;
    },

    // Get comments for a post
    getComments: async (postId: string) => {
        const response = await api.get<Comment[]>(`/posts/${postId}/comments`);
        return response.data;
    },

    // Add a comment
    addComment: async (postId: string, data: CreateCommentRequest) => {
        const response = await api.post<Comment>(`/posts/${postId}/comments`, data);
        return response.data;
    },

    // Report a post
    reportPost: async (postId: string, reason: string) => {
        await api.post(`/posts/${postId}/report`, { reason });
    }
};
