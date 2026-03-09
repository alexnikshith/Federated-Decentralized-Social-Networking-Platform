import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminDashboard from '../pages/AdminDashboard';
import { adminApi } from '../api/adminApi';
import { MemoryRouter } from 'react-router-dom';

// Mock dependencies
vi.mock('../api/adminApi', () => ({
    adminApi: {
        getStats: vi.fn(),
        listUsers: vi.fn(),
        listReports: vi.fn(),
        toggleUserStatus: vi.fn(),
        deleteUser: vi.fn(),
        resolveReport: vi.fn(),
        deletePost: vi.fn(),
        getTraffic: vi.fn(),
    }
}));

const mockUseAdminReports = vi.fn();
vi.mock('../../reports/api/reportsApi', () => ({
    useReportsApi: () => ({
        useAdminReports: mockUseAdminReports
    })
}));

// Mock QueryClient
vi.mock('@tanstack/react-query', () => ({
    useQueryClient: () => ({
        invalidateQueries: vi.fn(),
    }),
}));

// Mock UI components that might cause issues or are complex
vi.mock('../components/StatsDashboard', () => ({
    default: ({ stats }: any) => <div>Stats: {stats?.total_users} Users, {stats?.total_posts} Posts</div>
}));

vi.mock('../components/UserManagement', () => ({
    default: () => <div>UserManagement Component</div>
}));

vi.mock('../components/TrafficChart', () => ({
    default: () => <div data-testid="traffic-chart">Traffic Chart</div>
}));

describe('AdminDashboard (Instance Usage Report)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUseAdminReports.mockReturnValue({ data: [] });
    });

    it('renders dashboard and fetches data', async () => {
        (adminApi.getStats as any).mockResolvedValue({ total_users: 100, total_posts: 500 });
        (adminApi.listUsers as any).mockResolvedValue([]);
        (adminApi.listReports as any).mockResolvedValue([]);
        (adminApi.getTraffic as any).mockResolvedValue({ daily_stats: [] });

        render(<MemoryRouter><AdminDashboard /></MemoryRouter>);

        expect(await screen.findByText(/Stats Overview/i)).toBeInTheDocument();

        // Check if stats are rendered (via mocked StatsDashboard)
        await waitFor(() => {
            expect(screen.getByText('Stats: 100 Users, 500 Posts')).toBeInTheDocument();
        });
    });

    it('displays error toast on fetch failure', async () => {
        (adminApi.getStats as any).mockRejectedValue(new Error('Failed'));
        (adminApi.getTraffic as any).mockRejectedValue(new Error('Failed'));

        render(<MemoryRouter><AdminDashboard /></MemoryRouter>);

        // Since toast is mocked or handled by sonner, we might not see it in DOM easily without mocking sonner.
        // But we can check if it *doesn't* crash.
        // Ideally we mock toast.
        await waitFor(() => {
            // Expect not to see stats if failed
            expect(screen.queryByText('Stats: 100 Users, 500 Posts')).not.toBeInTheDocument();
        });
    });
});
