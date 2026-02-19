import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { useAuthStore } from '../epics/identity/store/authStore';
import { Platform } from 'react-native';

// Helper to get local IP for development
const getBaseUrl = () => {
    // Initial base URL determination
    if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
    const debuggerHost = Constants.expoConfig?.hostUri;
    const localhost = debuggerHost?.split(':')[0] || 'localhost';
    if (Platform.OS === 'android' && localhost === 'localhost') {
        return 'http://10.0.2.2:8080/api';
    }
    return `http://${localhost}:8080/api`;
};

export const BASE_URL = getBaseUrl();

export const getImageUrl = (path?: string) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;

    // Get current base URL from store if available to ensure correct image host
    let currentBaseUrl = BASE_URL;
    try {
        const state = useAuthStore.getState();
        if (state.activeInstanceUrl) {
            if (Platform.OS === 'android' && state.activeInstanceUrl.includes('localhost')) {
                currentBaseUrl = state.activeInstanceUrl.replace('localhost', '10.0.2.2') + '/api';
            } else {
                currentBaseUrl = state.activeInstanceUrl + '/api';
            }
        }
    } catch (e) {
        // Fallback to default if store access fails
    }

    const host = currentBaseUrl.replace('/api', '');
    return `${host}${path.startsWith('/') ? '' : '/'}${path}`;
};

export const api = axios.create({
    baseURL: BASE_URL,
    timeout: 10000, // 10 seconds timeout
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor to add the auth token AND dynamic base URL
api.interceptors.request.use(
    async (config) => {
        // 1. Handle Dynamic Base URL
        const state = useAuthStore.getState();
        if (state.activeInstanceUrl) {
            let dynamicUrl = state.activeInstanceUrl;
            if (dynamicUrl.includes('localhost')) {
                const debuggerHost = Constants.expoConfig?.hostUri;
                const ip = debuggerHost?.split(':')[0];

                if (ip && ip !== 'localhost') {
                    dynamicUrl = dynamicUrl.replace('localhost', ip);
                } else if (Platform.OS === 'android') {
                    dynamicUrl = dynamicUrl.replace('localhost', '10.0.2.2');
                }
            }
            config.baseURL = dynamicUrl + '/api';
            console.log('API Interceptor: URL rewritten to:', config.baseURL);
        } else {
            console.log('API Interceptor: No active instance URL, using default:', config.baseURL);
        }

        // 2. Handle Auth Token
        const token = await SecureStore.getItemAsync('nexus_auth_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add a response interceptor to handle errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Handle global errors like 401 Unauthorized
        if (error.response?.status === 401) {
            // Potentially trigger a logout here via a callback or event
        }
        return Promise.reject(error);
    }
);
