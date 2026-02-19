import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, describe, vi, beforeEach } from 'vitest';
import { UserSearch } from '../components/UserSearch';
import { FollowButton } from '../components/FollowButton';
import { resetMockState } from './mocks';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';

// Mock axios for federated search
vi.mock('axios', async (importOriginal) => {
    const actual = await importOriginal() as any;
    return {
        default: {
            ...actual,
            create: vi.fn(() => ({
                interceptors: {
                    request: { use: vi.fn(), eject: vi.fn() },
                    response: { use: vi.fn(), eject: vi.fn() },
                },
                get: vi.fn(),
                post: vi.fn(),
                put: vi.fn(),
                delete: vi.fn(),
            })),
            get: vi.fn(),
        },
        get: vi.fn(),
    };
});

describe('UserSearch and Follow Interactions', () => {
    beforeEach(() => {
        resetMockState();
        vi.clearAllMocks();
    });

    describe('UserSearch Component', () => {
        it('renders search input', () => {
            render(
                <MemoryRouter>
                    <UserSearch />
                </MemoryRouter>
            );
            expect(screen.getByPlaceholderText(/Search the federation/i)).toBeInTheDocument();
        });

        it('calls federated search as typing', async () => {
            const user = userEvent.setup();

            // Mocking axios.get for the search logic in UserSearch.tsx
            vi.mocked(axios.get).mockResolvedValue({
                data: {
                    data: [
                        { id: 'u1', username: 'found_user', display_name: 'Found User', avatar_url: '', is_following: false }
                    ]
                }
            });

            render(
                <MemoryRouter>
                    <UserSearch />
                </MemoryRouter>
            );
            const input = screen.getByPlaceholderText(/Search the federation/i);

            await user.type(input, 'found');

            await waitFor(() => {
                expect(axios.get).toHaveBeenCalled();
                expect(screen.getByText(/Found User/i)).toBeInTheDocument();
            });
        });
    });

    describe('FollowButton Component', () => {
        it('renders follow state when not following', () => {
            render(
                <MemoryRouter>
                    <FollowButton userId="u1" initialFollowing={false} />
                </MemoryRouter>
            );
            expect(screen.getByText(/Follow/i)).toBeInTheDocument();
            expect(screen.queryByText(/^Following$/i)).not.toBeInTheDocument();
        });

        it('renders following state when following', () => {
            render(
                <MemoryRouter>
                    <FollowButton userId="u1" initialFollowing={true} />
                </MemoryRouter>
            );
            // Matches exact text "Following"
            expect(screen.getByText(/^Following$/i)).toBeInTheDocument();
        });
    });
});
