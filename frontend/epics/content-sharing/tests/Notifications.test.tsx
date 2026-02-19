import { render, screen, waitFor } from '@testing-library/react';
import { expect, it, describe, vi, beforeEach } from 'vitest';
import { NotificationList } from '../components/NotificationList';
import { mockState, resetMockState } from './mocks';
import { Notification } from '../types';
import { MemoryRouter } from 'react-router-dom';

const mockNotifications: Notification[] = [
    {
        id: 'n1',
        type: 'like',
        related_entity_id: 'p1',
        related_user_id: 's1',
        related_user_name: 'Post Lover',
        related_user_avatar: '',
        created_at: new Date().toISOString(),
        is_read: false
    },
    {
        id: 'n2',
        type: 'follow',
        related_entity_id: 's2',
        related_user_id: 's2',
        related_user_name: 'New Follower',
        related_user_avatar: '',
        created_at: new Date().toISOString(),
        is_read: true
    }
];

describe('NotificationList Component', () => {
    beforeEach(() => {
        resetMockState();
        vi.clearAllMocks();
    });

    it('renders notifications from store', async () => {
        mockState.content.notifications = mockNotifications;

        render(
            <MemoryRouter>
                <NotificationList />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText(/Post Lover/i)).toBeInTheDocument();
            expect(screen.getByText(/liked your post/i)).toBeInTheDocument();
            expect(screen.getByText(/New Follower/i)).toBeInTheDocument();
            expect(screen.getByText(/followed you/i)).toBeInTheDocument();
        });
    });

    it('shows empty state when no notifications', async () => {
        mockState.content.notifications = [];

        render(
            <MemoryRouter>
                <NotificationList />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText(/all caught up/i)).toBeInTheDocument();
        });
    });
});
