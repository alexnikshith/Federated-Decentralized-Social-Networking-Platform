import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { format, startOfWeek, endOfWeek, startOfMonth, parseISO, eachDayOfInterval, addDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DailyActivity } from '../api/reportsApi';

interface TimeUsageChartProps {
    data: DailyActivity[];
    view: 'daily' | 'weekly' | 'monthly';
}

interface ChartData {
    name: string;
    minutes: number;
    fullDate?: string;
}

const TimeUsageChart: React.FC<TimeUsageChartProps> = ({ data, view }) => {

    const processData = (): ChartData[] => {
        if (!data || data.length === 0) return [];

        const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        if (view === 'daily') {
            return sortedData.map(item => ({
                name: format(parseISO(item.date), 'MMM d'),
                minutes: item.minutes,
                fullDate: item.date
            }));
        }

        if (view === 'weekly') {
            const weeks: { [key: string]: number } = {};
            sortedData.forEach(item => {
                const date = parseISO(item.date);
                const weekStart = startOfWeek(date, { weekStartsOn: 1 });
                const weekKey = format(weekStart, 'yyyy-MM-dd');
                weeks[weekKey] = (weeks[weekKey] || 0) + item.minutes;
            });

            return Object.keys(weeks).map(weekStart => {
                const start = parseISO(weekStart);
                const end = endOfWeek(start, { weekStartsOn: 1 });
                return {
                    name: `${format(start, 'MMM d')} - ${format(end, 'MMM d')}`,
                    minutes: weeks[weekStart]
                };
            });
        }

        if (view === 'monthly') {
            const months: { [key: string]: number } = {};
            sortedData.forEach(item => {
                const date = parseISO(item.date);
                const monthKey = format(startOfMonth(date), 'yyyy-MM');
                months[monthKey] = (months[monthKey] || 0) + item.minutes;
            });

            return Object.keys(months).map(monthKey => {
                const date = parseISO(monthKey + '-01');
                return {
                    name: format(date, 'MMMM yyyy'),
                    minutes: months[monthKey]
                };
            });
        }

        return [];
    };

    const chartData = processData();

    // Fill in gaps if daily view and we have a start/end (optional refinement, skip for now for simplicity, 
    // or just rely on what the API returns. The API returns all days in range usually, ensuring 0s)

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Activity Overview</CardTitle>
                <CardDescription>
                    {view === 'daily' && 'Daily usage statistics'}
                    {view === 'weekly' && 'Weekly usage aggregation'}
                    {view === 'monthly' && 'Monthly usage aggregation'}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    stroke="#888888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#888888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value: number) => {
                                        const hours = Math.floor(value / 60);
                                        return `${hours}h`;
                                    }}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    formatter={(value: number) => [`${Math.floor(value / 60)}h ${value % 60}m`, 'Time Spent']}
                                />
                                <Bar
                                    dataKey="minutes"
                                    fill="currentColor"
                                    radius={[4, 4, 0, 0]}
                                    className="fill-primary"
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                            No activity data for this period
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default TimeUsageChart;
