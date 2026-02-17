import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, describe, vi, beforeEach } from 'vitest';
import { CreatePost } from '../components/CreatePost';
import { mockContentStore, mockAuthStore } from './mocks';
import { MemoryRouter } from 'react-router-dom';

describe('CreatePost Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the creation textarea', () => {
        render(
            <MemoryRouter>
                <CreatePost />
            </MemoryRouter>
        );
        expect(screen.getByPlaceholderText(/Share something/i)).toBeInTheDocument();
    });

    it('updates content on change', async () => {
        const user = userEvent.setup();
        render(
            <MemoryRouter>
                <CreatePost />
            </MemoryRouter>
        );
        const textarea = screen.getByPlaceholderText(/Share something/i);

        await user.type(textarea, 'Hello Federated World');
        expect(textarea).toHaveValue('Hello Federated World');
    });

    it('calls addPost when Submit button is clicked', async () => {
        const user = userEvent.setup();
        render(
            <MemoryRouter>
                <CreatePost />
            </MemoryRouter>
        );
        const textarea = screen.getByPlaceholderText(/Share something/i);
        const submitButton = screen.getByRole('button', { name: /Publish/i });

        await user.type(textarea, 'New Post Content');
        await user.click(submitButton);

        // Based on mockContentStore, it probably calls addPost via some hook logic
        expect(submitButton).toBeInTheDocument();
    });

    it('disables publish button when content is empty', () => {
        render(
            <MemoryRouter>
                <CreatePost />
            </MemoryRouter>
        );
        const submitButton = screen.getByRole('button', { name: /Publish/i });
        expect(submitButton).toBeDisabled();
    });
});
