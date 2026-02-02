import React, { useState } from 'react';
import { format, subDays } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';

import { useReportsApi } from '../api/reportsApi';
import TimeUsageChart from '../components/TimeUsageChart';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const RefinedReportsPage: React.FC = () => {
    const { useActivityReport } = useReportsApi();

    // Default to last 30 days
    const [date, setDate] = useState<DateRange | undefined>({
        from: subDays(new Date(), 30),
        to: new Date(),
    });

    const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('daily');

    // Format dates for API
    const startDateStr = date?.from ? format(date.from, 'yyyy-MM-dd') : undefined;
    const endDateStr = date?.to ? format(date.to, 'yyyy-MM-dd') : undefined;

    const { data: report, isLoading, error } = useActivityReport(startDateStr, endDateStr);

    return (
        <div className="container mx-auto p-6 space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Time Usage Reports</h1>
                    <p className="text-muted-foreground">
                        Monitor your activity and usage patterns over time.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                id="date"
                                variant={"outline"}
                                className={cn(
                                    "w-[300px] justify-start text-left font-normal",
                                    !date && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {date?.from ? (
                                    date.to ? (
                                        <>
                                            {format(date.from, "LLL dd, y")} -{" "}
                                            {format(date.to, "LLL dd, y")}
                                        </>
                                    ) : (
                                        format(date.from, "LLL dd, y")
                                    )
                                ) : (
                                    <span>Pick a date range</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={date?.from}
                                selected={date}
                                onSelect={setDate}
                                numberOfMonths={2}
                            />
                        </PopoverContent>
                    </Popover>

                    <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="w-[400px]">
                        <TabsList>
                            <TabsTrigger value="daily">Daily</TabsTrigger>
                            <TabsTrigger value="weekly">Weekly</TabsTrigger>
                            <TabsTrigger value="monthly">Monthly</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
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
                <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {report?.total_hours.toFixed(1)}h
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Total activity in selected period
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <TimeUsageChart data={report?.daily_stats || []} view={viewMode} />
                </div>
            )}
        </div>
    );
};

export default RefinedReportsPage;
