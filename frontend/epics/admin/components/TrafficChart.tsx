import React, { useState } from 'react';
import {
    Area,
    AreaChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
    CartesianGrid,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DailyTraffic } from '../types';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TrafficChartProps {
    data: DailyTraffic[];
    loading: boolean;
}

type Metric = 'users' | 'posts';

const TrafficChart: React.FC<TrafficChartProps> = ({ data, loading }) => {
    const [activeMetric, setActiveMetric] = useState<Metric>('users');

    const formattedData = data.map(d => ({
        ...d,
        formattedDate: format(parseISO(d.date), 'MMM d'),
        fullDate: format(parseISO(d.date), 'MMMM d, yyyy'),
    }));

    const getMetricColor = (metric: Metric) => {
        switch (metric) {
            case 'users': return '#3b82f6'; // blue
            case 'posts': return '#f97316'; // orange
            default: return '#3b82f6';
        }
    };

    const getMetricLabel = (metric: Metric) => {
        switch (metric) {
            case 'users': return 'New Users';
            case 'posts': return 'New Posts';
            default: return '';
        }
    };

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const date = payload[0].payload.fullDate;
            const value = payload[0].value;
            return (
                <div className="bg-popover border border-border p-3 rounded-lg shadow-lg">
                    <p className="text-muted-foreground text-[11px] mb-1 font-medium">{date}</p>
                    <div className="flex flex-col">
                        <span className="text-popover-foreground font-bold text-lg leading-none">
                            {value}
                        </span>
                        <span className="text-[10px] text-muted-foreground/60 font-medium mt-1 uppercase tracking-wider">
                            {getMetricLabel(activeMetric)}
                        </span>
                    </div>
                </div>
            );
        }
        return null;
    };

    if (loading) {
        return (
            <Card className="col-span-4 bg-card/20 border border-border/40 rounded-xl h-[400px]">
                <CardHeader>
                    <div className="h-6 w-32 bg-muted animate-pulse rounded mb-2" />
                    <div className="h-4 w-48 bg-muted animate-pulse rounded" />
                </CardHeader>
                <CardContent className="flex items-center justify-center h-[280px]">
                    <div className="h-full w-full bg-muted/20 animate-pulse rounded" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="col-span-4 bg-card/20 border border-border/40 rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div className="space-y-1">
                    <CardTitle className="text-xl font-bold">Platform Traffic</CardTitle>
                    <CardDescription>Daily platform growth and activity overview</CardDescription>
                </div>
                <Tabs value={activeMetric} onValueChange={(v) => setActiveMetric(v as Metric)}>
                    <TabsList className="bg-background/50 border border-border/40">
                        <TabsTrigger value="users" className="text-xs">Users</TabsTrigger>
                        <TabsTrigger value="posts" className="text-xs">Posts</TabsTrigger>
                    </TabsList>
                </Tabs>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={getMetricColor(activeMetric)} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={getMetricColor(activeMetric)} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.1} />
                            <XAxis
                                dataKey="formattedDate"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: 'currentColor', opacity: 0.4, fontSize: 10 }}
                                minTickGap={30}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: 'currentColor', opacity: 0.4, fontSize: 10 }}
                                width={30}
                                allowDecimals={false}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: getMetricColor(activeMetric), strokeWidth: 1, strokeDasharray: '4 4' }} />
                            <Area
                                type="monotone"
                                dataKey={activeMetric}
                                stroke={getMetricColor(activeMetric)}
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorMetric)"
                                animationDuration={1000}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
};

export default TrafficChart;
