import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { format, parseISO, eachDayOfInterval } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DailyActivity } from '../api/reportsApi';

interface TimeUsageChartProps {
    data: DailyActivity[];
    view: 'weekly' | 'monthly';
    startDate?: Date;
    endDate?: Date;
    onPrevClick: () => void;
    onNextClick: () => void;
    currentLabel: string;
    onViewChange: (view: 'weekly' | 'monthly') => void;
    isNextDisabled?: boolean;
    periodTotal?: number;
}

interface ChartData {
    name: string;
    minutes: number;
    fullDate?: string;
}

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const value = payload[0].value;
        const h = Math.floor(value / 60);
        const m = value % 60;
        return (
            <div className="bg-popover border border-border p-3 rounded-lg shadow-lg">
                <p className="text-muted-foreground text-[11px] mb-1 font-medium">{payload[0].payload.fullDate}</p>
                <div className="flex items-center gap-1.5 mt-1">
                    <div className="flex flex-col items-center">
                        <span className="text-popover-foreground font-bold text-base leading-none">{h.toString().padStart(2, '0')}</span>
                        <span className="text-[9px] text-muted-foreground/60 font-medium mt-1">hh</span>
                    </div>
                    <span className="text-sm font-bold leading-none text-muted-foreground/30 pb-3">:</span>
                    <div className="flex flex-col items-center">
                        <span className="text-popover-foreground font-bold text-base leading-none">{m.toString().padStart(2, '0')}</span>
                        <span className="text-[9px] text-muted-foreground/60 font-medium mt-1">mm</span>
                    </div>
                </div>
                <p className="text-[10px] text-primary mt-2 uppercase tracking-wider font-bold">Time Spent</p>
            </div>
        );
    }
    return null;
};

const TimeUsageChart: React.FC<TimeUsageChartProps> = ({
    data,
    view,
    startDate,
    endDate,
    onPrevClick,
    onNextClick,
    currentLabel,
    onViewChange,
    isNextDisabled = false,
    periodTotal
}) => {

    const processData = (): ChartData[] => {
        // Since we now always want a daily breakdown (regardless of whether the "view" is Weekly or Monthly),
        // we essentially treat everything as a "Daily" chart over a specific range.

        // If the parent didn't provide dates (legacy fallback), utilize the data we have.
        if (!startDate || !endDate) {
            if (!data || data.length === 0) return [];
            const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            return sortedData.map(item => ({
                name: format(parseISO(item.date), 'MMM d'),
                minutes: item.minutes,
                fullDate: item.date
            }));
        }

        // 1. Create a map of existing data for quick lookup
        const dataMap = new Map<string, number>();
        (data || []).forEach(item => {
            const key = format(parseISO(item.date), 'yyyy-MM-dd');
            dataMap.set(key, item.minutes);
        });

        // 2. Generate every single day in the interval
        let days: Date[] = [];
        try {
            days = eachDayOfInterval({ start: startDate, end: endDate });
        } catch (e) {
            console.error("Invalid date interval", e);
            return [];
        }

        // 3. Map each day to a bar
        return days.map(day => {
            const dateKey = format(day, 'yyyy-MM-dd');

            // Format labels differently based on view context
            // Weekly: "Mon", "Tue" (or "Mon 2")
            // Monthly: "1", "2" (or "Oct 1")
            let label = '';
            if (view === 'weekly') {
                label = format(day, 'EEE'); // Mon, Tue, Wed
            } else {
                label = format(day, 'd'); // 1, 2, 3
            }

            return {
                name: label,
                minutes: dataMap.get(dateKey) || 0, // Fill 0 if no data
                fullDate: format(day, 'MMM d, yyyy') // For tooltip
            };
        });
    };

    const chartData = processData();

    const maxMinutes = Math.max(...chartData.map(d => d.minutes), 0);
    // Determine ticks: at least every 30 mins, covering max value
    const tickStep = 30; // 0.5 hours
    const calculatedMax = Math.ceil(maxMinutes / tickStep) * tickStep;

    // Default to at least 1 hour (60 minutes) if data is smaller
    const finalMax = Math.max(calculatedMax, 60);

    // Generate ticks array: 0, 30, 60, ... finalMax
    const ticks = [];
    for (let i = 0; i <= finalMax; i += tickStep) {
        ticks.push(i);
    }

    return (
        <Card className="w-full">
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-4 md:space-y-0 pb-8">
                <div>
                    <CardTitle>Activity Overview</CardTitle>
                    <CardDescription>
                        {view === 'weekly' && 'Daily usage for the selected week'}
                        {view === 'monthly' && 'Daily usage for the selected month'}
                    </CardDescription>
                    {periodTotal !== undefined && (
                        <div className="mt-2">
                            <div className="flex items-center gap-1.5">
                                {(() => {
                                    const h = Math.floor(periodTotal).toString().padStart(2, '0');
                                    const m = Math.round((periodTotal % 1) * 60).toString().padStart(2, '0');
                                    return (
                                        <>
                                            <div className="flex flex-col items-center">
                                                <span className="text-2xl font-bold leading-none">{h}</span>
                                                <span className="text-[10px] text-muted-foreground/60 font-medium mt-1">hh</span>
                                            </div>
                                            <span className="text-xl font-bold leading-none text-muted-foreground/40 pb-4">:</span>
                                            <div className="flex flex-col items-center">
                                                <span className="text-2xl font-bold leading-none">{m}</span>
                                                <span className="text-[10px] text-muted-foreground/60 font-medium mt-1">mm</span>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                            <span className="text-sm text-muted-foreground mt-2 block">
                                total this {view === 'weekly' ? 'week' : 'month'}
                            </span>
                        </div>
                    )}
                </div>

                <div className="flex flex-col sm:flex-row gap-4 items-center w-full md:w-auto">
                    <div className="flex items-center gap-2 bg-secondary/50 p-1 rounded-lg">
                        <Button variant="ghost" size="icon" onClick={onPrevClick} className="h-8 w-8 hover:bg-background">
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-medium min-w-[140px] text-center">
                            {currentLabel}
                        </span>
                        <Button variant="ghost" size="icon" onClick={onNextClick} disabled={isNextDisabled} className="h-8 w-8 hover:bg-background">
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>

                    <Tabs value={view} onValueChange={(v) => onViewChange(v as 'weekly' | 'monthly')} className="w-[200px]">
                        <TabsList className="grid w-full grid-cols-2 h-10">
                            <TabsTrigger value="weekly">Weekly</TabsTrigger>
                            <TabsTrigger value="monthly">Monthly</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
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
                                    ticks={ticks}
                                    domain={[0, finalMax]}
                                    tickFormatter={(value: number) => {
                                        const h = Math.floor(value / 60);
                                        const m = value % 60;
                                        return `${h}:${m.toString().padStart(2, '0')}`;
                                    }}
                                />
                                <Tooltip
                                    cursor={{
                                        fill: 'hsl(var(--muted) / 0.4)',
                                    }}
                                    content={<CustomTooltip />}
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
