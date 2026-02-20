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
}

const getApiUrl = () => {
    return localStorage.getItem('active_community_url') || import.meta.env.VITE_API_URL || 'http://localhost:8080';
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
            set({ stories: data.data || [], loading: false });
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
            // Prefix to the list locally
            const newStory = data.data;
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
    }
}));
