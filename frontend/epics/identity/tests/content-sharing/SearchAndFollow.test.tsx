import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, describe, vi, beforeEach } from 'vitest';
import { UserSearch } from '../../../content-sharing/components/UserSearch';
import { FollowButton } from '../../../content-sharing/components/FollowButton';
import { mockContentStore, mockAuthStore } from '../mocks';
import * as apiClient from '../../../content-sharing/api/client';

vi.mock('../../../content-sharing/api/client', () => ({
    searchUsers: vi.fn(),
    followUser: vi.fn(),
    unfollowUser: vi.fn(),
}));

describe('UserSearch and Follow Interactions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('UserSearch Component', () => {
        it('renders search input', () => {
            render(<UserSearch />);
            expect(screen.getByPlaceholderText(/search people/i)).toBeInTheDocument();
        });

        it('calls searchUsers API as typing', async () => {
            const user = userEvent.setup();
            vi.mocked(apiClient.searchUsers).mockResolvedValue([
                { id: 'u1', username: 'found_user', display_name: 'Found User', avatar_url: '', is_following: false }
            ]);

            render(<UserSearch />);
            const input = screen.getByPlaceholderText(/search people/i);

            await user.type(input, 'found');

            await waitFor(() => {
                expect(apiClient.searchUsers).toHaveBeenCalled();
                expect(screen.getByText('found_user')).toBeInTheDocument();
            });
        });
    });

    describe('FollowButton Component', () => {
        it('renders follow state when not following', () => {
            render(<FollowButton userId="u1" isFollowing={false} />);
            expect(screen.getByText(/follow/i)).toBeInTheDocument();
            expect(screen.queryByText(/unfollow/i)).not.toBeInTheDocument();
        });

        it('renders following state when following', () => {
            render(<FollowButton userId="u1" isFollowing={true} />);
            expect(screen.getByText(/following/i)).toBeInTheDocument();
        });

        it('calls followUser API when clicked while not following', async () => {
            const user = userEvent.setup();
            render(<FollowButton userId="u1" isFollowing={false} />);
            const button = screen.getByText(/follow/i);

            await user.click(button);

            expect(apiClient.followUser).toHaveBeenCalledWith('u1');
        });

        it('calls unfollowUser API when clicked while following', async () => {
            const user = userEvent.setup();
            render(<FollowButton userId="u1" isFollowing={true} />);
            const button = screen.getByText(/following/i);

            await user.click(button);

            expect(apiClient.unfollowUser).toHaveBeenCalledWith('u1');
        });
    });
});
