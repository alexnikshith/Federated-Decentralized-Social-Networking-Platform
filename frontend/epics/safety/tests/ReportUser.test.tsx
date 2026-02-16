import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ReportModal } from '../../reports/components/ReportModal';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { mockUseReportsApi } = vi.hoisted(() => ({
  mockUseReportsApi: vi.fn(() => ({
    useSubmitReport: () => ({
      mutate: vi.fn(),
      isPending: false
    })
  }))
}));

vi.mock('../../reports/api/reportsApi', () => ({
  useReportsApi: mockUseReportsApi
}));

const queryClient = new QueryClient({
    defaultOptions: {
        queries: { retry: false },
    },
});

// US4.2: Report Content
describe('US4.2 Report Content Interface', () => {
    it('renders report modal correctly', () => {
        const onClose = vi.fn();
        
        render(
            <QueryClientProvider client={queryClient}>
                <ReportModal isOpen={true} onClose={onClose} reportedUser={{ id: 'user123', display_name: 'Test', username: 'test' }} />
            </QueryClientProvider>
        );
        
        expect(screen.getByText(/Report Test/i)).toBeInTheDocument();
        expect(screen.getAllByRole('radio').length).toBeGreaterThan(0);
        expect(screen.getByPlaceholderText(/context/i)).toBeInTheDocument();
    });

    it('submits report with reason and description', async () => {
        const onClose = vi.fn();
        const mutateMock = vi.fn();
        
        // Mock the hook return value specifically for this test
        mockUseReportsApi.mockReturnValue({
             useSubmitReport: () => ({
                 mutate: mutateMock,
                 isPending: false
             })
        });
        
        render(
            <QueryClientProvider client={queryClient}>
                <ReportModal isOpen={true} onClose={onClose} reportedUser={{ id: 'user123', display_name: 'Test', username: 'test' }} />
            </QueryClientProvider>
        );
        
        const descriptionInput = screen.getByPlaceholderText(/context/i);
        await userEvent.type(descriptionInput, 'He is being mean');
        
        const submitBtn = screen.getByRole('button', { name: /submit/i });
        await userEvent.click(submitBtn);
        
        expect(mutateMock).toHaveBeenCalledWith(expect.objectContaining({
            reported_id: 'user123',
            description: 'He is being mean'
        }), expect.any(Object));
    });
});
