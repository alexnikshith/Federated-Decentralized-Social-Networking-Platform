import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import TimeUsageChart from '../components/TimeUsageChart';

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

describe('TimeUsageSummary', () => {
    const mockProps = {
        data: [],
        view: 'weekly' as const,
        onPrevClick: vi.fn(),
        onNextClick: vi.fn(),
        currentLabel: 'Current Week',
        onViewChange: vi.fn(),
        periodTotal: 120.5 // hours
    };

    it('renders dropdown selection updates data (Tabs)', async () => {
        const onViewChange = vi.fn();
        const user = userEvent.setup();
        render(<TimeUsageChart {...mockProps} onViewChange={onViewChange} />);

        // Check if Weekly/Monthly tabs exist
        expect(screen.getByText('Weekly')).toBeInTheDocument();
        expect(screen.getByText('Monthly')).toBeInTheDocument();

        // Click tabs (using userEvent)
        await user.click(screen.getByText('Monthly'));
        expect(onViewChange).toHaveBeenCalledWith('monthly');
    });

    it('renders total period time', () => {
        render(<TimeUsageChart {...mockProps} periodTotal={5.5} />); // 5.5 hours
        expect(screen.getByText('05')).toBeInTheDocument();
        expect(screen.getByText('30')).toBeInTheDocument();
    });
});
