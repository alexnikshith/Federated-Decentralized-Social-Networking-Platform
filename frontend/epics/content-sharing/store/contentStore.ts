import { create } from 'zustand';
import type { Post, Notification } from '../types';
import * as api from '../api/client';

interface ContentState {
    posts: Post[];
    notifications: Notification[];
    unreadCount: number;
    loading: boolean;
    error: string | null;

    // Actions
    fetchFeed: () => Promise<void>;
    createPost: (content: string, mediaUrl?: string, mediaType?: 'image' | 'video' | string) => Promise<void>;
    likePost: (postId: string) => Promise<void>;
    unlikePost: (postId: string) => Promise<void>;
    deletePost: (postId: string) => Promise<void>;
    fetchNotifications: () => Promise<void>;
    markAllAsRead: () => Promise<void>;
    fetchUnreadCount: () => Promise<void>;
    savePost: (postId: string) => Promise<void>;
    unsavePost: (postId: string) => Promise<void>;
    reportPost: (postId: string, reason: string) => Promise<void>;
    reportUser: (userId: string, reason: string, description?: string) => Promise<void>;
    interactPost: (postId: string, type: 'interested' | 'not_interested') => Promise<void>;
    markAsRead: (notificationId: string) => Promise<void>;
}

// useContentStore manages the state for the feed, posts, and notifications
// It handles optimistic updates for UI responsiveness
export const useContentStore = create<ContentState>((set, get) => ({
    posts: [],
    notifications: [],
    unreadCount: 0,
    loading: false,
    error: null,

    // Fetches the main activity feed
    fetchFeed: async () => {
        set({ loading: true, error: null });
        try {
            const feed = await api.getFeed();
            set({ posts: feed.posts, loading: false });
        } catch (error) {
            set({ error: error.response?.data?.message || 'Failed to fetch feed', loading: false });
        }
    },

    // Creates a new post and refreshes the feed
    createPost: async (content: string, mediaUrl?: string, mediaType?: 'image' | 'video' | string) => {
        set({ loading: true, error: null });
        try {
            await api.createPost({ content, media_url: mediaUrl, media_type: mediaType });
            // Refresh the entire feed to get the enriched post with author data
            await get().fetchFeed();
        } catch (error) {
            set({ error: error.response?.data?.message || 'Failed to create post', loading: false });
        }
    },

    // Optimistically likes a post
    likePost: async (postId: string) => {
        try {
            await api.likePost(postId);
            set({
                posts: get().posts.map((post) =>
                    post.id === postId
                        ? { ...post, is_liked: true, like_count: post.like_count + 1 }
                        : post
                ),
            });
        } catch (error) {
            set({ error: error.response?.data?.message || 'Failed to like post' });
        }
    },

    // Optimistically unlikes a post
    unlikePost: async (postId: string) => {
        try {
            await api.unlikePost(postId);
            set({
                posts: get().posts.map((post) =>
                    post.id === postId
                        ? { ...post, is_liked: false, like_count: Math.max(0, post.like_count - 1) }
                        : post
                ),
            });
        } catch (error) {
            set({ error: error.response?.data?.message || 'Failed to unlike post' });
        }
    },

    // Removes a post from the local feed immediately
    deletePost: async (postId: string) => {
        try {
            await api.deletePost(postId);
            set({ posts: get().posts.filter((post) => post.id !== postId) });
        } catch (error) {
            set({ error: error.response?.data?.message || 'Failed to delete post' });
        }
    },

    fetchNotifications: async () => {
        try {
            const notifications = await api.getNotifications();
            set({ notifications });
        } catch (error) {
            set({ error: error.response?.data?.message || 'Failed to fetch notifications' });
        }
    },

    // Marks a single notification as read with optimistic update
    markAsRead: async (notificationId: string) => {
        try {
            // Optimistic update
            set((state) => ({
                notifications: state.notifications.map((notif) =>
                    notif.id === notificationId ? { ...notif, is_read: true } : notif
                ),
                unreadCount: Math.max(0, state.unreadCount - 1)
            }));

            await api.markNotificationAsRead(notificationId);

            // Re-fetch to confirm sync (optional, but good for consistency)
            get().fetchUnreadCount();
        } catch (error) {
            // Revert on failure
            set({ error: error.response?.data?.message || 'Failed to mark as read' });
            get().fetchNotifications(); // Revert local state
            get().fetchUnreadCount();
        }
    },

    // Marks all notifications as read
    markAllAsRead: async () => {
        try {
            // Optimistic update
            set((state) => ({
                notifications: state.notifications.map((notif) => ({ ...notif, is_read: true })),
                unreadCount: 0
            }));

            await api.markAllNotificationsAsRead();

            get().fetchUnreadCount();
        } catch (error) {
            set({ error: error.message || 'Failed to mark all as read' });
            get().fetchNotifications();
            get().fetchUnreadCount();
        }
    },

    fetchUnreadCount: async () => {
        try {
            const count = await api.getUnreadCount();
            set({ unreadCount: count });
        } catch (error) {
            console.error('Failed to fetch unread count:', error);
        }
    },

    savePost: async (postId: string) => {
        try {
            await api.savePost(postId);
            set({
                posts: get().posts.map((post) =>
                    post.id === postId ? { ...post, is_saved: true } : post
                ),
            });
        } catch (error) {
            set({ error: error.response?.data?.message || 'Failed to save post' });
        }
    },

    unsavePost: async (postId: string) => {
        try {
            await api.unsavePost(postId);
            set({
                posts: get().posts.map((post) =>
                    post.id === postId ? { ...post, is_saved: false } : post
                ),
            });
        } catch (error) {
            set({ error: error.response?.data?.message || 'Failed to unsave post' });
        }
    },

    reportPost: async (postId: string, reason: string) => {
        const previousPosts = get().posts;
        // Optimistic update: Remove immediately
        set({ posts: previousPosts.filter((post) => post.id !== postId) });

        try {
            await api.reportPost(postId, { reason });
        } catch (error) {
            // Revert on failure
            set({
                posts: previousPosts,
                error: error.response?.data?.message || 'Failed to report post'
            });
        }
    },

    reportUser: async (userId: string, reason: string, description?: string) => {
        const previousPosts = get().posts;
        // Optimistic update: Remove all posts from this user immediately
        set({ posts: previousPosts.filter((post) => post.author_id !== userId) });

        try {
            // Call the reports API endpoint
            const API_URL = localStorage.getItem('active_community_url') || import.meta.env.VITE_API_URL || 'http://localhost:8080';
            const token = localStorage.getItem('token');
            await fetch(`${API_URL}/api/reports/user`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    reported_id: userId,
                    reason,
                    description
                })
            });
        } catch (error) {
            // Revert on failure
            set({
                posts: previousPosts,
                error: 'Failed to report user'
            });
        }
    },

    interactPost: async (postId: string, type: 'interested' | 'not_interested') => {
        try {
            await api.interactPost(postId, { type });
            if (type === 'not_interested') {
                // Hide locally
                set({ posts: get().posts.filter((post) => post.id !== postId) });
            }
        } catch (error) {
            set({ error: error.response?.data?.message || 'Failed to track interaction' });
        }
    },
}));
