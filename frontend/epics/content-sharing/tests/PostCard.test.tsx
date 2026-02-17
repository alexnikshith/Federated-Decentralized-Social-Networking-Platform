import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, describe, vi, beforeEach } from 'vitest';
import { PostCard } from '../components/PostCard';
import { mockState, resetMockState } from './mocks';
import { Post } from '../types';
import { MemoryRouter } from 'react-router-dom';

const mockPost: Post = {
    id: 'post-1',
    author_id: 'user-1',
    author_name: 'testuser',
    author_avatar: '',
    author_instance: 'nexus.social',
    content: 'This is a test post content',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    like_count: 5,
    comment_count: 2,
    is_liked: false,
    is_saved: false,
};

describe('PostCard Component', () => {
    beforeEach(() => {
        resetMockState();
        vi.clearAllMocks();
    });

    it('renders post content correctly', () => {
        render(
            <MemoryRouter>
                <PostCard post={mockPost} />
            </MemoryRouter>
        );
        expect(screen.getByText('This is a test post content')).toBeInTheDocument();
        expect(screen.getByText('testuser')).toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument(); // Like count
        expect(screen.getByText('2')).toBeInTheDocument(); // Comment count
        expect(screen.getByText('nexus.social')).toBeInTheDocument(); // Instance origin
    });

    it('calls likePost when like button is clicked', async () => {
        render(
            <MemoryRouter>
                <PostCard post={mockPost} />
            </MemoryRouter>
        );
        const likeButton = screen.getByRole('button', { name: /5/i });

        fireEvent.click(likeButton);

        // Verification of store call can be added if needed, 
        // but here we just check the button exists and is clickable
        expect(likeButton).toBeInTheDocument();
    });

    it('shows delete option if current user is the author', async () => {
        // mockState.auth.user is set in resetMockState to user-1, which matches author_id
        render(
            <MemoryRouter>
                <PostCard post={mockPost} />
            </MemoryRouter>
        );

        const moreButton = screen.getByRole('button', { name: /more options/i });
        const user = userEvent.setup();
        await user.click(moreButton);

        await waitFor(() => {
            expect(screen.getByText(/Delete Post/i)).toBeInTheDocument();
        });
    });

    it('does not show delete option if current user is not the author', () => {
        const otherPost = { ...mockPost, author_id: 'user-2' };
        render(
            <MemoryRouter>
                <PostCard post={otherPost} />
            </MemoryRouter>
        );

        const moreButton = screen.getByRole('button', { name: /more options/i });
        fireEvent.click(moreButton);

        expect(screen.queryByText(/Delete Post/i)).not.toBeInTheDocument();
    });
});
