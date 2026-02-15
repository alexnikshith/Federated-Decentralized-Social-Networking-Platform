import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, describe, vi, beforeEach } from 'vitest';
import { CreatePost } from '../../../content-sharing/components/CreatePost';
import { mockContentStore, mockAuthStore } from '../mocks';

// Setup Vitest environment
describe('CreatePost Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the creation textarea', () => {
        render(<CreatePost />);
        expect(screen.getByPlaceholderText(/Share something with the federation/i)).toBeInTheDocument();
    });

    it('updates content on change', async () => {
        const user = userEvent.setup();
        render(<CreatePost />);
        const textarea = screen.getByPlaceholderText(/Share something with the federation/i);

        await user.type(textarea, 'Hello Federated World');
        expect(textarea).toHaveValue('Hello Federated World');
    });

    it('calls createPost when Submit button is clicked', async () => {
        const user = userEvent.setup();
        render(<CreatePost />);
        const textarea = screen.getByPlaceholderText(/Share something with the federation/i);
        const submitButton = screen.getByRole('button', { name: /Publish/i });

        await user.type(textarea, 'New Post Content');
        await user.click(submitButton);

        expect(mockContentStore.createPost).toHaveBeenCalledWith('New Post Content', undefined, undefined);
    });

    it('disables publish button when content is empty', () => {
        render(<CreatePost />);
        const submitButton = screen.getByRole('button', { name: /Publish/i });
        expect(submitButton).toBeDisabled();
    });

    it('shows hashtag suggestions when hashtag button is clicked', async () => {
        render(<CreatePost />);
        const hashtagButton = screen.getByTitle('Add Hashtag');

        fireEvent.click(hashtagButton);

        expect(screen.getByText('Trending Hashtags')).toBeInTheDocument();
        expect(screen.getByText('#federation')).toBeInTheDocument();
    });

    it('inserts hashtag into content when clicked', async () => {
        render(<CreatePost />);
        const hashtagButton = screen.getByTitle('Add Hashtag');
        fireEvent.click(hashtagButton);

        const hashtagOption = screen.getByText('#federation');
        fireEvent.click(hashtagOption);

        const textarea = screen.getByPlaceholderText(/Share something with the federation/i);
        expect(textarea.value).toContain('#federation');
    });
});
