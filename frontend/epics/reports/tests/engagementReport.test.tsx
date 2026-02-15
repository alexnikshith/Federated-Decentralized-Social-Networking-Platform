import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import InteractionsChart from '../components/InteractionsChart';

// Mock Recharts
vi.mock('recharts', () => ({
    ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
    BarChart: ({ children }: any) => <div>{children}</div>,
    Bar: () => <div>Bar</div>,
    XAxis: () => <div>XAxis</div>,
    YAxis: () => <div>YAxis</div>,
    Tooltip: () => <div>Tooltip</div>,
    CartesianGrid: () => <div>CartesianGrid</div>,
}));

describe('EngagementReport', () => {
    const mockProps = {
        data: [],
        view: 'weekly' as const,
        onPrevClick: vi.fn(),
        onNextClick: vi.fn(),
        currentLabel: 'Current Week',
        onViewChange: vi.fn(),
        isInteractionsMade: false, // Received interactions
        allowedMetrics: ['likes', 'comments', 'follows'] as any[],
    };

    it('renders correct total likes', () => {
        // Default selected metric is likely 'likes' since it's first in allowedMetrics?
        // The component sets state in useEffect, so we might need to wait or rely on default.
        render(<InteractionsChart {...mockProps} interactionReport={{ total_likes: 100, total_comments: 50, total_follows: 20 }} />);

        // We expect "Total Likes this week" to be visible initially if likes is default
        expect(screen.getByText(/Total Likes this week/i)).toBeInTheDocument();
        expect(screen.getByText('100')).toBeInTheDocument();
        expect(screen.getByText('Likes received on posts')).toBeInTheDocument();
    });

    it('handles zero engagement', () => {
        render(<InteractionsChart {...mockProps} interactionReport={{ total_likes: 0, total_comments: 0 }} />);
        expect(screen.getByText('0')).toBeInTheDocument();
    });
});
