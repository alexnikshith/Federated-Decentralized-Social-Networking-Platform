
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SettingsPage } from '../pages/SettingsPage';
import { useAuthStore } from '../store/authStore';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { profileApi, authApi } from '../api/client';

// Mock dependencies
vi.mock('../store/authStore');
vi.mock('../api/client', () => ({
    profileApi: {
        updateProfile: vi.fn(),
        getActivity: vi.fn(),
        deactivateAccount: vi.fn(),
        deleteAccount: vi.fn(),
    },
    authApi: {
        changePassword: vi.fn(),
        toggle2FA: vi.fn(),
    }
}));
vi.mock('@/hooks/use-toast', () => ({
    useToast: () => ({
        toast: vi.fn(),
    }),
}));
// Mock UI components if they are complex or cause issues
// For now, assuming they render standard HTML elements or are simple enough

describe('SettingsPage', () => {
    const mockUser = {
        id: '123',
        username: 'testuser',
        display_name: 'Test User',
        bio: 'Hello world',
        profile_visibility: 'public',
        is_discoverable: true,
        is_2fa_enabled: false,
    };

    const mockUpdateUser = vi.fn();
    const mockClearAuth = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        (useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
            user: mockUser,
            updateUser: mockUpdateUser,
            clearAuth: mockClearAuth,
        });
    });

    const queryClient = new QueryClient();

    it('renders profile settings by default', () => {
        render(<QueryClientProvider client={queryClient}><SettingsPage /></QueryClientProvider>);
        expect(screen.getByText('Profile Details')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
        expect(screen.getByDisplayValue('testuser')).toBeInTheDocument();
    });

    it('switches to account settings tab', () => {
        render(<QueryClientProvider client={queryClient}><SettingsPage /></QueryClientProvider>);
        const accountTab = screen.getByText('Account');
        fireEvent.click(accountTab);
        expect(screen.getByText('Account Settings')).toBeInTheDocument();
        expect(screen.getByText('Deactivate Account')).toBeInTheDocument();
    });

    it('handles profile update submission', async () => {
        (profileApi.updateProfile as any).mockResolvedValue({ data: { ...mockUser, display_name: 'Updated Name' } });

        render(<QueryClientProvider client={queryClient}><SettingsPage /></QueryClientProvider>);

        // Click edit profile
        const editButton = screen.getByText('Edit Profile');
        fireEvent.click(editButton);

        const nameInput = screen.getByDisplayValue('Test User');
        fireEvent.change(nameInput, { target: { value: 'Updated Name' } });

        const saveButton = screen.getByText('Save Changes');
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(profileApi.updateProfile).toHaveBeenCalledWith(expect.objectContaining({
                display_name: 'Updated Name'
            }));
            expect(mockUpdateUser).toHaveBeenCalled();
        });
    });

    it('handles account deactivation', async () => {
        // Mock window.confirm
        const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => true);
        (profileApi.deactivateAccount as any).mockResolvedValue({});

        // Mock window.location
        Object.defineProperty(window, 'location', {
            configurable: true,
            value: { href: '' },
        });

        render(<QueryClientProvider client={queryClient}><SettingsPage /></QueryClientProvider>);

        fireEvent.click(screen.getByText('Account'));

        const deactivateButton = screen.getByText('Deactivate My Account');
        fireEvent.click(deactivateButton);

        expect(confirmSpy).toHaveBeenCalled();
        await waitFor(() => {
            expect(profileApi.deactivateAccount).toHaveBeenCalled();
            expect(mockClearAuth).toHaveBeenCalled();
        });

        confirmSpy.mockRestore();
    });

    it('displays activity logs in account tab', async () => {
        const mockActivities = [
            { id: '1', user_id: '123', action: 'login', details: 'Successful login', timestamp: new Date().toISOString() },
            { id: '2', user_id: '123', action: 'profile_update', details: 'Updated display name', timestamp: new Date().toISOString() },
        ];
        (profileApi.getActivity as any).mockResolvedValue(mockActivities);

        render(<QueryClientProvider client={queryClient}><SettingsPage /></QueryClientProvider>);

        // Switch to account tab
        fireEvent.click(screen.getByText('Account'));

        // Click view activity
        const viewActivityButton = screen.getByText('View Activity');
        fireEvent.click(viewActivityButton);

        await waitFor(() => {
            expect(profileApi.getActivity).toHaveBeenCalled();
            expect(screen.getByText('Successful login')).toBeInTheDocument();
            expect(screen.getByText('Updated display name')).toBeInTheDocument();
        });
    });
});
