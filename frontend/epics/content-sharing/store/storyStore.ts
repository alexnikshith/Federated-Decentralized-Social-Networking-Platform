import { create } from 'zustand';
import { useAuthStore } from '../../identity/store/authStore';

interface Story {
    id: string;
    author_id: string;
    author_name: string;
    author_avatar: string;
    media_url: string;
    media_type: 'image' | 'video';
    content?: string;
    likes: string[];  // user IDs who liked
    created_at: string;
    expires_at: string;
}

interface StoryStore {
    stories: Story[];
    loading: boolean;
    error: string | null;
    fetchStories: () => Promise<void>;
    createStory: (media_url: string, media_type: string, content?: string) => Promise<void>;
    deleteStory: (id: string) => Promise<void>;
    likeStory: (id: string) => Promise<void>;
    unlikeStory: (id: string) => Promise<void>;
    markStoryViewed: (id: string) => Promise<void>;
    getViewedStoryIDs: () => Promise<string[]>;
}

const getApiUrl = () => {
    return localStorage.getItem('active_community_url') || import.meta.env.VITE_API_URL || import.meta.env.VITE_COMMUNITY1_URL || 'http://localhost:8080';
};

const getHeaders = () => {
    const token = useAuthStore.getState().token;
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
};

export const useStoryStore = create<StoryStore>((set, get) => ({
    stories: [],
    loading: false,
    error: null,

    fetchStories: async () => {
        set({ loading: true, error: null });
        try {
            const res = await fetch(`${getApiUrl()}/api/stories`, {
                headers: getHeaders()
            });
            if (!res.ok) throw new Error('Failed to fetch stories');
            const data = await res.json();
            set({ stories: (data.data || []).map((s: any) => ({ ...s, likes: s.likes ?? [] })), loading: false });
        } catch (error: any) {
            set({ error: error.message, loading: false });
            console.error(error);
        }
    },

    createStory: async (media_url, media_type, content) => {
        try {
            const res = await fetch(`${getApiUrl()}/api/stories`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ media_url, media_type, content })
            });

            if (!res.ok) throw new Error('Failed to create story');
            const data = await res.json();
            const newStory = { ...data.data, likes: data.data.likes ?? [] };
            set(state => ({ stories: [newStory, ...state.stories] }));
        } catch (error: any) {
            console.error(error);
            throw error;
        }
    },

    deleteStory: async (id) => {
        try {
            const res = await fetch(`${getApiUrl()}/api/stories/${id}`, {
                method: 'DELETE',
                headers: getHeaders()
            });

            if (!res.ok) throw new Error('Failed to delete story');
            set(state => ({ stories: state.stories.filter(s => s.id !== id) }));
        } catch (error: any) {
            console.error(error);
            throw error;
        }
    },

    likeStory: async (id) => {
        const userId = useAuthStore.getState().user?.id;
        if (!userId) return;
        // Optimistic update
        set(state => ({
            stories: state.stories.map(s =>
                s.id === id && !s.likes.includes(userId)
                    ? { ...s, likes: [...s.likes, userId] }
                    : s
            )
        }));
        try {
            const res = await fetch(`${getApiUrl()}/api/stories/${id}/like`, {
                method: 'POST',
                headers: getHeaders()
            });
            if (!res.ok) throw new Error('Failed to like story');
        } catch (error: any) {
            // Rollback on failure
            set(state => ({
                stories: state.stories.map(s =>
                    s.id === id ? { ...s, likes: s.likes.filter(uid => uid !== userId) } : s
                )
            }));
            console.error(error);
        }
    },

    unlikeStory: async (id) => {
        const userId = useAuthStore.getState().user?.id;
        if (!userId) return;
        // Optimistic update
        set(state => ({
            stories: state.stories.map(s =>
                s.id === id ? { ...s, likes: s.likes.filter(uid => uid !== userId) } : s
            )
        }));
        try {
            const res = await fetch(`${getApiUrl()}/api/stories/${id}/like`, {
                method: 'DELETE',
                headers: getHeaders()
            });
            if (!res.ok) throw new Error('Failed to unlike story');
        } catch (error: any) {
            // Rollback on failure
            set(state => ({
                stories: state.stories.map(s =>
                    s.id === id && !s.likes.includes(userId)
                        ? { ...s, likes: [...s.likes, userId] }
                        : s
                )
            }));
            console.error(error);
        }
    },

    // Fire-and-forget: records a story view on the server (idempotent)
    markStoryViewed: async (id) => {
        try {
            await fetch(`${getApiUrl()}/api/stories/${id}/view`, {
                method: 'POST',
                headers: getHeaders()
            });
        } catch (error: any) {
            // Non-critical — just log
            console.warn('Failed to record story view:', error);
        }
    },

    // Fetches all story IDs the current user has viewed (from server)
    getViewedStoryIDs: async () => {
        try {
            const res = await fetch(`${getApiUrl()}/api/stories/viewed`, {
                headers: getHeaders()
            });
            if (!res.ok) return [];
            const data = await res.json();
            return (data.data as string[]) ?? [];
        } catch {
            return [];
        }
    },
}));
