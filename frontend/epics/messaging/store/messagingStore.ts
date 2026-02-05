import { create } from 'zustand';

interface MessagingState {
    unreadMessageCount: number;
    setUnreadMessageCount: (count: number) => void;
    decrementUnreadCount: () => void;
    refreshUnreadCount: () => Promise<void>;
}

export const useMessagingStore = create<MessagingState>((set) => ({
    unreadMessageCount: 0,
    setUnreadMessageCount: (count) => set({ unreadMessageCount: count }),
    decrementUnreadCount: () => set((state) => ({
        unreadMessageCount: Math.max(0, state.unreadMessageCount - 1)
    })),
    refreshUnreadCount: async () => {
        try {
            const { messagingApi } = await import('../api/client');
            const data = await messagingApi.getUnreadCount();
            set({ unreadMessageCount: data.count });
        } catch (error) {
            console.error('Failed to refresh unread count:', error);
        }
    },
}));
