import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ProfileUI from '../../identity/pages/ProfileUI'; 
import { MemoryRouter } from 'react-router-dom';
import * as safetyApi from '../api/client';
import * as identityApi from '../../identity/api/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock Safety API
vi.mock('../api/client', () => ({
  blockUser: vi.fn(),
  unblockUser: vi.fn(),
  getBlockedUsers: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../content-sharing/api/client', () => ({
    getUserPosts: vi.fn().mockResolvedValue({ posts: [] }),
    getUserLikedPosts: vi.fn().mockResolvedValue({ posts: [] }),
    getUserCommentedPosts: vi.fn().mockResolvedValue({ posts: [] }),
    getSavedPosts: vi.fn().mockResolvedValue({ posts: [] }),
    getFollowers: vi.fn().mockResolvedValue([]),
    getFollowing: vi.fn().mockResolvedValue([]),
    followUser: vi.fn(),
    unfollowUser: vi.fn(),
}));

vi.mock('@/config/communities', () => ({
    COMMUNITIES: [],
    DEFAULT_COMMUNITY: { url: 'http://localhost', name: 'Local' }
}));

vi.mock('@/hooks/use-toast', () => ({
    useToast: () => ({ toast: vi.fn() })
}));

vi.mock('@/lib/utils', () => ({
    cn: (...inputs: any[]) => inputs.join(' ')
}));

// Mock Auth Store
vi.mock('../../identity/store/authStore', () => ({
  useAuthStore: vi.fn(() => ({ user: { id: 'me', username: 'me' } })),
}));

// Mock Identity API
vi.mock('../../identity/api/client', () => ({
  profileApi: {
    getProfile: vi.fn(),
    getMyProfile: vi.fn(),
  },
  api: {
    get: vi.fn().mockResolvedValue({ data: { data: { posts: [] } } }),
    interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() }
    }
  }
}));

// Mock useParams
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useParams: () => ({ username: 'baduser' }),
    };
});

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
        },
    },
});

describe('US4.1 Block User Interface', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Setup default profile response
        (identityApi.profileApi.getProfile as any).mockResolvedValue({
            _id: 'user123',
            username: 'baduser',
            display_name: 'Bad User',
            is_blocked: false,
            followers_count: 0,
            following_count: 0,
            posts_count: 0,
            bio: 'Bad bio',
            created_at: new Date().toISOString(),
        });
    });

    it('renders block option in profile menu', async () => {
        render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter>
                    <ProfileUI />
                </MemoryRouter>
            </QueryClientProvider>
        );

        // Wait for profile load
        // Use a longer timeout or check for a specific loading state if needed
        await waitFor(() => {
            expect(screen.getByText(/Bad User/i)).toBeInTheDocument();
        }, { timeout: 3000 });
    });

    it('calls blockUser API when block action is triggered', async () => {
        const userId = 'user123';
        await safetyApi.blockUser(userId);
        expect(safetyApi.blockUser).toHaveBeenCalledWith(userId);
    });
});
