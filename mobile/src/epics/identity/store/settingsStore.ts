import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsState {
    timeLimitMinutes: number | null; // 15, 30, 45, 60, 120
    dailyUsageMinutes: number;
    lastUsageDate: string | null;
    isLimitIgnoredToday: boolean;

    setTimeLimit: (minutes: number | null) => void;
    updateDailyUsage: (minutesToAdd: number) => void;
    ignoreLimit: () => void;
    resetUsage: () => void;
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set, get) => ({
            timeLimitMinutes: null,
            dailyUsageMinutes: 0,
            lastUsageDate: null,
            isLimitIgnoredToday: false,

            setTimeLimit: (minutes) => set({ timeLimitMinutes: minutes }),

            updateDailyUsage: (minutesToAdd) => {
                const today = new Date().toISOString().split('T')[0];
                const { lastUsageDate, dailyUsageMinutes } = get();

                if (lastUsageDate !== today) {
                    set({
                        dailyUsageMinutes: minutesToAdd,
                        lastUsageDate: today,
                        isLimitIgnoredToday: false
                    });
                } else {
                    set({ dailyUsageMinutes: dailyUsageMinutes + minutesToAdd });
                }
            },

            ignoreLimit: () => set({ isLimitIgnoredToday: true }),

            resetUsage: () => set({ dailyUsageMinutes: 0, isLimitIgnoredToday: false }),
        }),
        {
            name: 'nexus-settings-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
