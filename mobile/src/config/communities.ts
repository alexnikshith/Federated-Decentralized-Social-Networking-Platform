import { Platform } from 'react-native';
import Constants from 'expo-constants';

export const COMMUNITIES = [
    {
        id: 'community-1',
        name: 'Community 1',
        url: 'http://localhost:8080',
        description: 'The main Federated Social community'
    },
    {
        id: 'community-2',
        name: 'Community 2',
        url: 'http://localhost:8081',
        description: 'The second federated community'
    }
];

export const DEFAULT_COMMUNITY = COMMUNITIES[0];

// Helper to get the correct URL for the current platform
export const getCommunityUrl = (url: string) => {
    if (url.includes('localhost')) {
        const debuggerHost = Constants.expoConfig?.hostUri;
        const ip = debuggerHost?.split(':')[0];

        // Prefer LAN IP if available (works for physical & emulator usually)
        if (ip && ip !== 'localhost') {
            return url.replace('localhost', ip);
        }

        // Fallback for Android Emulator standard loopback
        if (Platform.OS === 'android') {
            return url.replace('localhost', '10.0.2.2');
        }
    }
    return url;
};
