import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface SettingsState {
    timeLimitMinutes: number | null; // 15, 30, 45, 60, 120
    dailyUsageMinutes: number;
    lastUsageDate: string | null;
    isLimitIgnoredToday: boolean;

    setTimeLimit: (minutes: number | null) => void;
    updateDailyUsage: (minutesToAdd: number) => void;
    setDailyUsage: (minutes: number) => void;
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

            setTimeLimit: (minutes) => set({ timeLimitMinutes: minutes, isLimitIgnoredToday: false }),

            updateDailyUsage: (minutesToAdd) => {
                const d = new Date();
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                const today = `${year}-${month}-${day}`;

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

            setDailyUsage: (minutes) => set({ dailyUsageMinutes: minutes }),

            ignoreLimit: () => set({ isLimitIgnoredToday: true }),

            resetUsage: () => set({ dailyUsageMinutes: 0, isLimitIgnoredToday: false }),
        }),
        {
            name: 'nexus-settings-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
