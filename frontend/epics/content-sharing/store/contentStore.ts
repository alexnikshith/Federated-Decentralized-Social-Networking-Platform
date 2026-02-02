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
    createPost: (content: string) => Promise<void>;
    likePost: (postId: string) => Promise<void>;
    unlikePost: (postId: string) => Promise<void>;
    deletePost: (postId: string) => Promise<void>;
    fetchNotifications: () => Promise<void>;
    markAsRead: (notificationId: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    fetchUnreadCount: () => Promise<void>;
}

export const useContentStore = create<ContentState>((set, get) => ({
    posts: [],
    notifications: [],
    unreadCount: 0,
    loading: false,
    error: null,

    fetchFeed: async () => {
        set({ loading: true, error: null });
        try {
            const feed = await api.getFeed();
            set({ posts: feed.posts, loading: false });
        } catch (error: any) {
            set({ error: error.response?.data?.message || 'Failed to fetch feed', loading: false });
        }
    },

    createPost: async (content: string) => {
        set({ loading: true, error: null });
        try {
            await api.createPost({ content });
            // Refresh the entire feed to get the enriched post with author data
            await get().fetchFeed();
        } catch (error: any) {
            set({ error: error.response?.data?.message || 'Failed to create post', loading: false });
        }
    },

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
        } catch (error: any) {
            set({ error: error.response?.data?.message || 'Failed to like post' });
        }
    },

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
        } catch (error: any) {
            set({ error: error.response?.data?.message || 'Failed to unlike post' });
        }
    },

    deletePost: async (postId: string) => {
        try {
            await api.deletePost(postId);
            set({ posts: get().posts.filter((post) => post.id !== postId) });
        } catch (error: any) {
            set({ error: error.response?.data?.message || 'Failed to delete post' });
        }
    },

    fetchNotifications: async () => {
        try {
            const notifications = await api.getNotifications();
            set({ notifications });
        } catch (error: any) {
            set({ error: error.response?.data?.message || 'Failed to fetch notifications' });
        }
    },

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
        } catch (error: any) {
            // Revert on failure (complex to revert unreadCount perfectly without fetch, 
            // so just fetching is safer or just alerting error)
            set({ error: error.response?.data?.message || 'Failed to mark as read' });
            get().fetchNotifications(); // Revert local state
            get().fetchUnreadCount();
        }
    },

    markAllAsRead: async () => {
        try {
            // Optimistic update
            set((state) => ({
                notifications: state.notifications.map((notif) => ({ ...notif, is_read: true })),
                unreadCount: 0
            }));

            await api.markAllNotificationsAsRead();

            get().fetchUnreadCount();
        } catch (error: any) {
            set({ error: error.message || 'Failed to mark all as read' });
            get().fetchNotifications();
            get().fetchUnreadCount();
        }
    },

    fetchUnreadCount: async () => {
        try {
            const count = await api.getUnreadCount();
            set({ unreadCount: count });
        } catch (error: any) {
            console.error('Failed to fetch unread count:', error);
        }
    },
}));
