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

describe('PostActivityReport', () => {
    const mockProps = {
        data: [],
        view: 'weekly' as const,
        onPrevClick: vi.fn(),
        onNextClick: vi.fn(),
        currentLabel: 'Current Week',
        onViewChange: vi.fn(),
        isInteractionsMade: true, // Post activity is usually "Interactions Made" (posts created)
        allowedMetrics: ['posts'] as any[],
    };

    it('renders post count correctly', () => {
        render(<InteractionsChart {...mockProps} interactionReport={{ total_posts: 42 }} />);
        expect(screen.getByText('Total Posts this week')).toBeInTheDocument();
        expect(screen.getByText('42')).toBeInTheDocument();
        expect(screen.getByText('Posts created')).toBeInTheDocument();
    });

    it('handles empty state', () => {
        render(<InteractionsChart {...mockProps} interactionReport={{ total_posts: 0 }} />);
        expect(screen.getByText('0')).toBeInTheDocument();
    });
});
