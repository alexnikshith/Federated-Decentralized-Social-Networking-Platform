import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function resolveMediaUrl(url: string | undefined): string {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('blob:')) return url;
    if (url.startsWith('/avatars/')) return url; // Frontend-served preset
    
    const baseUrl = localStorage.getItem('active_community_url') 
        || import.meta.env.VITE_API_URL 
        || import.meta.env.VITE_COMMUNITY1_URL 
        || 'http://localhost:8080';
        
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const cleanUrl = url.startsWith('/') ? url : `/${url}`;
    
    return `${cleanBaseUrl}${cleanUrl}`;
}
