import React from 'react';
import { useReportsApi } from '../api/reportsApi';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export const ActivityStats: React.FC = () => {
    const { useActivityReport } = useReportsApi();
    const { data: report, isLoading, error } = useActivityReport();

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    if (error) {
        return <div className="text-red-500">Failed to load activity stats</div>;
    }

    if (!report) return null;

    // Process data for chart
    const chartData = report.daily_stats.map(stat => ({
        date: new Date(stat.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
        hours: (stat.minutes / 60).toFixed(1)
    }));

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Total Time Spent</CardTitle>
                    <CardDescription>Your total activity on the platform</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-4xl font-bold">
                        {report.total_hours.toFixed(1)} <span className="text-lg font-normal text-muted-foreground">hours</span>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Activity History</CardTitle>
                    <CardDescription>Daily usage breakdown</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}
                                itemStyle={{ color: 'var(--foreground)' }}
                            />
                            <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
};
