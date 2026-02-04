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
import InteractionsChart from '../components/InteractionsChart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const RefinedReportsPage: React.FC = () => {
    const { useActivityReport, useInteractionReport, useInteractionMadeReport } = useReportsApi();

    const [activeTab, setActiveTab] = useState<'time-usage' | 'interactions'>('time-usage');
    const [interactionSection, setInteractionSection] = useState<'received' | 'made'>('received');
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

    // Calculate previous period range for comparison
    const previousRange = useMemo(() => {
        if (viewMode === 'weekly') {
            const prevWeekDate = subWeeks(currentDate, 1);
            return {
                start: startOfWeek(prevWeekDate, { weekStartsOn: 1 }),
                end: endOfWeek(prevWeekDate, { weekStartsOn: 1 })
            };
        } else {
            const prevMonthDate = subMonths(currentDate, 1);
            return {
                start: startOfMonth(prevMonthDate),
                end: endOfMonth(prevMonthDate)
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
        // Don't allow navigation to future periods
        if (isNextDisabled) return;

        if (viewMode === 'weekly') {
            setCurrentDate(d => addWeeks(d, 1));
        } else {
            setCurrentDate(d => addMonths(d, 1));
        }
    };

    // Check if next button should be disabled (current period includes today or is in the future)
    const isNextDisabled = useMemo(() => {
        const today = new Date();
        // If the end of the current range is today or in the future, disable next
        return range.end >= today;
    }, [range.end]);

    // Format dates for API - current period
    const startDateStr = format(range.start, 'yyyy-MM-dd');
    const endDateStr = format(range.end, 'yyyy-MM-dd');

    // Format dates for API - previous period
    const prevStartDateStr = format(previousRange.start, 'yyyy-MM-dd');
    const prevEndDateStr = format(previousRange.end, 'yyyy-MM-dd');

    // Fetch current period data
    const { data: report, isLoading, error } = useActivityReport(startDateStr, endDateStr);
    const { data: interactionReport, isLoading: interactionLoading, error: interactionError } = useInteractionReport(startDateStr, endDateStr);
    const { data: interactionMadeReport, isLoading: interactionMadeLoading, error: interactionMadeError } = useInteractionMadeReport(startDateStr, endDateStr);

    // Fetch previous period data for comparison
    const { data: prevReport } = useActivityReport(prevStartDateStr, prevEndDateStr);
    const { data: prevInteractionReport } = useInteractionReport(prevStartDateStr, prevEndDateStr);
    const { data: prevInteractionMadeReport } = useInteractionMadeReport(prevStartDateStr, prevEndDateStr);

    // Calculate percentage change helper
    const calculatePercentageChange = (current: number, previous: number): { percentage: number; isIncrease: boolean } => {
        if (previous === 0) {
            return { percentage: current > 0 ? 100 : 0, isIncrease: current > 0 };
        }
        const change = ((current - previous) / previous) * 100;
        return { percentage: Math.abs(Math.round(change)), isIncrease: change >= 0 };
    };

    return (
        <div className="container mx-auto p-6 space-y-6">

            {/* 1. Full-width Title Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
                <p className="text-muted-foreground">
                    Monitor your activity and usage patterns over time.
                </p>
            </div>

            {/* 2. Full-width Tabs Navigation */}
            <div className="w-full border-b">
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'time-usage' | 'interactions')} className="w-full">
                    <TabsList className="w-full justify-start h-12 bg-transparent border-b-0 rounded-none p-0">
                        <TabsTrigger
                            value="time-usage"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6"
                        >
                            Time Usage
                        </TabsTrigger>
                        <TabsTrigger
                            value="interactions"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6"
                        >
                            Interactions
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>


            {/* Time Usage Tab Content */}
            {activeTab === 'time-usage' && (
                <div className="mt-6">
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
                        <div className="space-y-6">
                            {/* Top Row: Stat Cards */}
                            <div className="grid gap-4 md:grid-cols-2">
                                {/* Total Time Spent */}
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

                                {/* Time Spent Today */}
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Time spent today</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">
                                            {(() => {
                                                const today = new Date();
                                                const todayStr = format(today, 'yyyy-MM-dd');
                                                // Check if today falls within the current selected range
                                                if (today >= range.start && today <= range.end) {
                                                    const todayData = report?.daily_stats?.find(d => d.date === todayStr);
                                                    const todayMinutes = todayData?.minutes || 0;
                                                    return `${Math.floor(todayMinutes / 60)}h ${todayMinutes % 60}m`;
                                                }
                                                return '0h 0m';
                                            })()}
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Activity for {format(new Date(), 'MMM d, yyyy')}
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Bottom Row: Chart with Stat Card */}
                            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                                {/* Weekly/Monthly Total - takes up 1 column on large screens */}
                                <div className="lg:col-span-1">
                                    <Card>
                                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                            <CardTitle className="text-sm font-medium">
                                                {viewMode === 'weekly' ? 'Weekly' : 'Monthly'} total
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold">
                                                {Math.floor(report?.total_hours || 0)}h {Math.round(((report?.total_hours || 0) % 1) * 60)}m
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                {viewMode === 'weekly'
                                                    ? `${format(range.start, 'MMM d')} - ${format(range.end, 'MMM d')}`
                                                    : format(currentDate, 'MMMM yyyy')
                                                }
                                            </p>
                                        </CardContent>
                                    </Card>
                                </div>

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
                                        isNextDisabled={isNextDisabled}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Interactions Tab Content */}
            {activeTab === 'interactions' && (
                <div className="mt-6 space-y-6">
                    {/* Sub-navigation for Made/Received */}
                    <Tabs value={interactionSection} onValueChange={(v) => setInteractionSection(v as 'received' | 'made')}>
                        <TabsList>
                            <TabsTrigger value="received">Interactions Received</TabsTrigger>
                            <TabsTrigger value="made">Interactions Made</TabsTrigger>
                        </TabsList>
                    </Tabs>

                    {/* Interactions Received Section */}
                    {interactionSection === 'received' && (
                        <>
                            {interactionLoading ? (
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
                            ) : interactionError ? (
                                <div className="p-4 rounded-md bg-destructive/10 text-destructive">
                                    Error loading interaction data. Please try again later.
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* Stat Box Row - Only Total Interactions */}
                                    {interactionReport && (
                                        <div className="mb-6">
                                            {/* Combined Total */}
                                            <Card>
                                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                    <CardTitle className="text-sm font-medium">
                                                        Total interactions
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="text-2xl font-bold">
                                                        {(interactionReport?.total_posts || 0) +
                                                            (interactionReport?.total_likes || 0) +
                                                            (interactionReport?.total_comments || 0) +
                                                            (interactionReport?.total_follows || 0)}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">
                                                        Posts: {interactionReport?.total_posts || 0}, Likes: {interactionReport?.total_likes || 0}, Comments: {interactionReport?.total_comments || 0}, Follows: {interactionReport?.total_follows || 0}
                                                    </p>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    )}

                                    {/* Chart with integrated metric selector */}
                                    <InteractionsChart
                                        data={interactionReport?.daily_stats || []}
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
                                        isNextDisabled={isNextDisabled}
                                        interactionReport={interactionReport}
                                        prevInteractionReport={prevInteractionReport}
                                        viewMode={viewMode}
                                        isInteractionsMade={false}
                                    />
                                </div>
                            )}
                        </>
                    )}

                    {/* Interactions Made Section */}
                    {interactionSection === 'made' && (
                        <>
                            {interactionMadeLoading ? (
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
                            ) : interactionMadeError ? (
                                <div className="p-4 rounded-md bg-destructive/10 text-destructive">
                                    Error loading interaction data. Please try again later.
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* Stat Box Row - Only Total Interactions */}
                                    {interactionMadeReport && (
                                        <div className="mb-6">
                                            {/* Combined Total */}
                                            <Card>
                                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                    <CardTitle className="text-sm font-medium">
                                                        Total interactions
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="text-2xl font-bold">
                                                        {(interactionMadeReport?.total_posts || 0) +
                                                            (interactionMadeReport?.total_likes || 0) +
                                                            (interactionMadeReport?.total_comments || 0) +
                                                            (interactionMadeReport?.total_follows || 0)}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">
                                                        Posts: {interactionMadeReport?.total_posts || 0}, Likes: {interactionMadeReport?.total_likes || 0}, Comments: {interactionMadeReport?.total_comments || 0}, Follows: {interactionMadeReport?.total_follows || 0}
                                                    </p>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    )}

                                    {/* Chart with integrated metric selector */}
                                    <InteractionsChart
                                        data={interactionMadeReport?.daily_stats || []}
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
                                        isNextDisabled={isNextDisabled}
                                        interactionReport={interactionMadeReport}
                                        prevInteractionReport={prevInteractionMadeReport}
                                        viewMode={viewMode}
                                        isInteractionsMade={true}
                                    />
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default RefinedReportsPage;
