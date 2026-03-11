// URLs are configured via environment variables for production (Render/Vercel).
// Falls back to localhost for local development.
export const COMMUNITIES = [
    {
        id: 'community-1',
        name: 'Nexus.Social',
        url: import.meta.env.VITE_COMMUNITY1_URL || 'http://localhost:8080',
        description: 'The main Federated Social community'
    },
    {
        id: 'community-2',
        name: 'Nexus Community 2',
        url: import.meta.env.VITE_COMMUNITY2_URL || 'http://localhost:8081',
        description: 'The second federated community'
    }
];

export const DEFAULT_COMMUNITY = COMMUNITIES[0];
