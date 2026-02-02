import React, { useState, useMemo } from 'react';
import {
    format,
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth,
    addWeeks,
    subWeeks,
    addMonths,
    subMonths
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { useReportsApi } from '../api/reportsApi';
import TimeUsageChart from '../components/TimeUsageChart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const RefinedReportsPage: React.FC = () => {
    const { useActivityReport } = useReportsApi();

    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<'weekly' | 'monthly'>('weekly');

    // Calculate range based on view mode and current date
    const range = useMemo(() => {
        if (viewMode === 'weekly') {
            return {
                start: startOfWeek(currentDate, { weekStartsOn: 1 }), // Monday
                end: endOfWeek(currentDate, { weekStartsOn: 1 })
            };
        } else {
            return {
                start: startOfMonth(currentDate),
                end: endOfMonth(currentDate)
            };
        }
    }, [currentDate, viewMode]);

    // Navigation handlers
    const handlePrev = () => {
        if (viewMode === 'weekly') {
            setCurrentDate(d => subWeeks(d, 1));
        } else {
            setCurrentDate(d => subMonths(d, 1));
        }
    };

    const handleNext = () => {
        if (viewMode === 'weekly') {
            setCurrentDate(d => addWeeks(d, 1));
        } else {
            setCurrentDate(d => addMonths(d, 1));
        }
    };

    // Format dates for API
    const startDateStr = format(range.start, 'yyyy-MM-dd');
    const endDateStr = format(range.end, 'yyyy-MM-dd');

    const { data: report, isLoading, error } = useActivityReport(startDateStr, endDateStr);

    return (
        <div className="container mx-auto p-6 space-y-8">

            {/* 1. Full-width Title Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Time Usage Reports</h1>
                <p className="text-muted-foreground">
                    Monitor your activity and usage patterns over time.
                </p>
            </div>

            {isLoading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Loading...</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold animate-pulse bg-gray-200 h-8 w-24 rounded"></div>
                        </CardContent>
                    </Card>
                </div>
            ) : error ? (
                <div className="p-4 rounded-md bg-destructive/10 text-destructive">
                    Error loading report data. Please try again later.
                </div>
            ) : (
                /* 2. Side-by-side layout: Stats Card + Chart */
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* "Total Time" Card - takes up 1 column on large screens */}
                    <div className="lg:col-span-1">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total time spent</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {Math.floor(report?.total_hours || 0)}h {Math.round(((report?.total_hours || 0) % 1) * 60)}m
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Total activity in selected period
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Chart - takes up 3 columns on large screens */}
                    <div className="lg:col-span-3">
                        <TimeUsageChart
                            data={report?.daily_stats || []}
                            view={viewMode}
                            startDate={range.start}
                            endDate={range.end}
                            onPrevClick={handlePrev}
                            onNextClick={handleNext}
                            currentLabel={viewMode === 'weekly'
                                ? `${format(range.start, 'MMM d')} - ${format(range.end, 'MMM d')}`
                                : format(currentDate, 'MMMM yyyy')
                            }
                            onViewChange={(v) => setViewMode(v)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default RefinedReportsPage;
