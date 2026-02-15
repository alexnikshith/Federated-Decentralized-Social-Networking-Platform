import { render, screen, waitFor } from '@testing-library/react';
import { expect, it, describe, vi, beforeEach } from 'vitest';
import { NotificationList } from '../../../content-sharing/components/NotificationList';
import * as apiClient from '../../../content-sharing/api/client';
import { Notification } from '../../../content-sharing/types';

vi.mock('../../../content-sharing/api/client', () => ({
    getNotifications: vi.fn(),
    markNotificationAsRead: vi.fn(),
}));

const mockNotifications: Notification[] = [
    {
        id: 'n1',
        type: 'like',
        sender_id: 's1',
        sender_username: 'lover',
        sender_display_name: 'Post Lover',
        post_id: 'p1',
        created_at: new Date().toISOString(),
        is_read: false
    },
    {
        id: 'n2',
        type: 'follow',
        sender_id: 's2',
        sender_username: 'follower',
        sender_display_name: 'New Follower',
        created_at: new Date().toISOString(),
        is_read: true
    }
];

describe('NotificationList Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders notifications from API', async () => {
        vi.mocked(apiClient.getNotifications).mockResolvedValue(mockNotifications);

        render(<NotificationList />);

        await waitFor(() => {
            expect(screen.getByText(/Post Lover/i)).toBeInTheDocument();
            expect(screen.getByText(/liked your post/i)).toBeInTheDocument();
            expect(screen.getByText(/New Follower/i)).toBeInTheDocument();
            expect(screen.getByText(/followed you/i)).toBeInTheDocument();
        });
    });

    it('shows empty state when no notifications', async () => {
        vi.mocked(apiClient.getNotifications).mockResolvedValue([]);

        render(<NotificationList />);

        await waitFor(() => {
            expect(screen.getByText(/no notifications yet/i)).toBeInTheDocument();
        });
    });
});
