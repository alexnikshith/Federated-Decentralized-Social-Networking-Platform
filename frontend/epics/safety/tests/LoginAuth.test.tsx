import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LoginUI from '../../identity/pages/LoginUI';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as identityApi from '../../identity/api/client';

// Mock Identity API
vi.mock('../../identity/api/client', () => ({
  authApi: {
    login: vi.fn(),
    verifyOTP: vi.fn(),
  },
  profileApi: {
    getProfile: vi.fn(),
    getMyProfile: vi.fn(),
  },
  api: {
    get: vi.fn(),
    post: vi.fn(),
    interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() }
    }
  }
}));

// Mock useNavigate
const mockedNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockedNavigate,
    };
});

vi.mock('@/config/communities', () => ({
    COMMUNITIES: [{ id: '1', name: 'Local', url: 'http://localhost' }],
    DEFAULT_COMMUNITY: { id: '1', name: 'Local', url: 'http://localhost' }
}));

const queryClient = new QueryClient();

describe('US4.0.1 & US4.0.2 Login Interface', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it('renders login form', () => {
        render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter>
                    <LoginUI />
                </MemoryRouter>
            </QueryClientProvider>
        );
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    });

    it('handles successful login (No OTP)', async () => {
        const loginMock = vi.mocked(identityApi.authApi.login);
        loginMock.mockResolvedValue({
            token: 'fake-jwt-token',
            user: { id: '1', email: 'test@example.com' }
        });

        const { container } = render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter>
                    <LoginUI />
                </MemoryRouter>
            </QueryClientProvider>
        );

        await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com');
        await userEvent.type(screen.getByLabelText(/password/i), 'password123');
        
        fireEvent.submit(container.querySelector('form')!);

        await waitFor(() => {
            expect(loginMock).toHaveBeenCalled();
        });
    });

    it('handles OTP requirement (US4.0.1)', async () => {
        const loginMock = vi.mocked(identityApi.authApi.login);
        loginMock.mockResolvedValue({
            message: "OTP Sent" 
        });

        const { container } = render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter>
                    <LoginUI />
                </MemoryRouter>
            </QueryClientProvider>
        );

        await userEvent.type(screen.getByLabelText(/email/i), 'otp@example.com');
        await userEvent.type(screen.getByLabelText(/password/i), 'password123');
        
        fireEvent.submit(container.querySelector('form')!);

        await waitFor(() => {
             expect(loginMock).toHaveBeenCalled();
        }, { timeout: 3000 });
        
        // Use a looser matcher for the text or check for the OTP input presence
        await waitFor(() => {
            expect(screen.getByPlaceholderText(/code/i)).toBeInTheDocument();
        });
    });
});
