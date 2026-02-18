import { api } from '../../../lib/api';
import { Post, FeedResponse, CreatePostRequest, CreateCommentRequest, Comment } from '../types';

export const postApi = {
    // Fetch global/community feed
    getFeed: async (page = 1, limit = 20, type = 'home') => {
        const response = await api.get<any>(`/feed?page=${page}&limit=${limit}&type=${type}`);
        return response.data.data as FeedResponse;
    },

    // Fetch single post
    getPost: async (id: string) => {
        const response = await api.get<any>(`/posts/${id}`);
        return response.data.data as Post;
    },

    // Create a new post
    createPost: async (data: CreatePostRequest) => {
        const response = await api.post<any>('/posts', data);
        return response.data.data as Post;
    },

    // Delete a post
    deletePost: async (id: string) => {
        await api.delete(`/posts/${id}`);
    },

    // Like/Unlike a post
    toggleLike: async (id: string, isLiked: boolean) => {
        if (isLiked) {
            await api.delete(`/posts/${id}/like`);
        } else {
            await api.post(`/posts/${id}/like`);
        }
    },

    // Get comments for a post
    getComments: async (postId: string) => {
        const response = await api.get<any>(`/posts/${postId}/comments`);
        return response.data.data as Comment[];
    },

    // Add a comment
    addComment: async (postId: string, data: CreateCommentRequest) => {
        const response = await api.post<any>(`/posts/${postId}/comments`, data);
        return response.data.data as Comment;
    },

    // Report a post
    reportPost: async (postId: string, reason: string) => {
        await api.post(`/posts/${postId}/report`, { reason });
    }
};
