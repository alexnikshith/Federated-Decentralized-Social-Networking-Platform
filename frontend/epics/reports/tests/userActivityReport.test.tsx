import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActivityStats } from '../components/ActivityStats';

// Mock the API hook
const mockUseActivityReport = vi.fn();

vi.mock('../api/reportsApi', () => ({
  useReportsApi: () => ({
    useActivityReport: mockUseActivityReport
  })
}));

// Mock Recharts to avoid rendering issues in test environment
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  BarChart: ({ children }: any) => <div>{children}</div>,
  Bar: () => <div>Bar</div>,
  XAxis: () => <div>XAxis</div>,
  YAxis: () => <div>YAxis</div>,
  Tooltip: () => <div>Tooltip</div>,
}));

describe('UserActivityReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', () => {
    mockUseActivityReport.mockReturnValue({
      data: null,
      isLoading: true,
      error: null
    });

    render(<ActivityStats />);
    // Initial loading skeletons usually have a class or role, checking for container
    // Using container check or just generic "loading" if text was present.
    // Since Skeleton is used, we can check if it renders without crashing.
    // Ideally we check for specific testid if added, but here we check absence of error/content.
    expect(screen.queryByText('Total Time Spent')).not.toBeInTheDocument();
  });

  it('renders error state', () => {
    mockUseActivityReport.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Failed to fetch')
    });

    render(<ActivityStats />);
    expect(screen.getByText('Failed to load activity stats')).toBeInTheDocument();
  });

  it('displays total hours correctly', async () => {
    mockUseActivityReport.mockReturnValue({
      data: {
        total_hours: 10.5,
        daily_stats: []
      },
      isLoading: false,
      error: null
    });

    render(<ActivityStats />);
    expect(screen.getByText('Total Time Spent')).toBeInTheDocument();
    expect(screen.getByText('10.5')).toBeInTheDocument();
    expect(screen.getByText('hours')).toBeInTheDocument();
  });

  it('handles empty data', () => {
    mockUseActivityReport.mockReturnValue({
      data: {
        total_hours: 0,
        daily_stats: []
      },
      isLoading: false,
      error: null
    });

    render(<ActivityStats />);
    expect(screen.getByText('0.0')).toBeInTheDocument();
  });
});
