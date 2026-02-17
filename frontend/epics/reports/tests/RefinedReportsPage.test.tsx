import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RefinedReportsPage from '../pages/RefinedReportsPage';
import * as reportsApi from '../api/reportsApi';

// Mock Recharts to avoid rendering issues in JSDOM
vi.mock('recharts', () => ({
    ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
    BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
    Bar: () => <div data-testid="bar" />,
    XAxis: () => <div data-testid="x-axis" />,
    YAxis: () => <div data-testid="y-axis" />,
    Tooltip: () => <div data-testid="tooltip" />,
    CartesianGrid: () => <div data-testid="cartesian-grid" />,
}));

// Mock the API hook
vi.mock('../api/reportsApi', () => ({
    useReportsApi: vi.fn(),
}));

describe('RefinedReportsPage', () => {
    const mockUseActivityReport = vi.fn();
    const mockUseInteractionReport = vi.fn();
    const mockUseInteractionMadeReport = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();

        // Default mock implementation
        (reportsApi.useReportsApi as any).mockReturnValue({
            useActivityReport: mockUseActivityReport,
            useInteractionReport: mockUseInteractionReport,
            useInteractionMadeReport: mockUseInteractionMadeReport,
        });

        // Default success responses
        mockUseActivityReport.mockReturnValue({
            data: { total_hours: 10, daily_stats: [] },
            isLoading: false,
            error: null,
        });

        mockUseInteractionReport.mockReturnValue({
            data: { total_likes: 5, total_comments: 2, total_follows: 1, daily_stats: [] },
            isLoading: false,
            error: null,
        });

        mockUseInteractionMadeReport.mockReturnValue({
            data: { total_likes: 8, total_comments: 3, total_follows: 0, total_posts: 4, daily_stats: [] },
            isLoading: false,
            error: null,
        });
    });

    it('renders the page title and default tab (User Story: Reports Dashboard)', () => {
        render(<RefinedReportsPage />);
        expect(screen.getByText('Reports')).toBeInTheDocument();
        expect(screen.getByText('Monitor your activity and usage patterns over time.')).toBeInTheDocument();
        expect(screen.getByText('Time Usage')).toBeInTheDocument();
        expect(screen.getByText('Interactions')).toBeInTheDocument();
        expect(screen.getByText('Posts')).toBeInTheDocument();
    });

    it('renders Time Usage data by default (User Story: View Activity Reports)', () => {
        render(<RefinedReportsPage />);
        expect(screen.getByText('Total time spent till date')).toBeInTheDocument();
        // Use getAllByText as there might be multiple instances or broken up text
        expect(screen.getAllByText(/10h\s*0m/)[0]).toBeInTheDocument();
    });

    it('switches to Interactions tab and shows received data (User Story: View Interaction Stats Received)', async () => {
        const user = userEvent.setup();
        render(<RefinedReportsPage />);

        const interactionsMainTab = screen.getByRole('tab', { name: /^Interactions$/ });
        await user.click(interactionsMainTab);

        const receivedTab = await screen.findByRole('tab', { name: /Interactions Received/i });
        expect(receivedTab).toBeInTheDocument();

        expect(await screen.findByText(/Total interactions Received till date/i)).toBeInTheDocument();
        expect(screen.getByText('8')).toBeInTheDocument(); // 5+2+1
    });

    it('switches to Interactions Made section (User Story: View Interaction Stats Made)', async () => {
        const user = userEvent.setup();
        render(<RefinedReportsPage />);

        await user.click(screen.getByRole('tab', { name: /^Interactions$/ }));

        const madeTab = await screen.findByRole('tab', { name: /Interactions Made/i });
        await user.click(madeTab);

        expect(await screen.findByText(/Total interactions made till date/i)).toBeInTheDocument();
        expect(screen.getByText('11')).toBeInTheDocument(); // 8+3+0
    });

    it('switches to Posts tab (User Story: View Content Metrics)', async () => {
        const user = userEvent.setup();
        render(<RefinedReportsPage />);

        const postsTab = screen.getByRole('tab', { name: /Posts/i });
        await user.click(postsTab);

        expect(await screen.findByText(/Total Posts \(All Time\)/i)).toBeInTheDocument();
        expect(screen.getAllByText('4')[0]).toBeInTheDocument();
    });

    it('shows loading state (User Story: UI Feedback)', () => {
        mockUseActivityReport.mockReturnValue({
            data: null,
            isLoading: true,
            error: null,
        });

        render(<RefinedReportsPage />);
        expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('shows error state (User Story: Error Handling)', () => {
        mockUseActivityReport.mockReturnValue({
            data: null,
            isLoading: false,
            error: new Error('Failed to fetch'),
        });

        render(<RefinedReportsPage />);
        expect(screen.getByText('Error loading report data. Please try again later.')).toBeInTheDocument();
    });
});
