import React, { useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { format, parseISO, eachDayOfInterval } from 'date-fns';
import { ChevronLeft, ChevronRight, Heart, MessageCircle, FileText, UserPlus } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DailyInteraction } from '../api/reportsApi';

interface InteractionsChartProps {
    data: DailyInteraction[];
    view: 'weekly' | 'monthly';
    startDate?: Date;
    endDate?: Date;
    onPrevClick: () => void;
    onNextClick: () => void;
    currentLabel: string;
    onViewChange: (view: 'weekly' | 'monthly') => void;
}

interface ChartData {
    name: string;
    posts: number;
    likes: number;
    comments: number;
    follows: number;
    fullDate?: string;
}

type MetricType = 'likes' | 'comments' | 'posts' | 'follows';

const InteractionsChart: React.FC<InteractionsChartProps> = ({
    data,
    view,
    startDate,
    endDate,
    onPrevClick,
    onNextClick,
    currentLabel,
    onViewChange
}) => {
    const [selectedMetric, setSelectedMetric] = useState<MetricType>('likes');

    const processData = (): ChartData[] => {
        if (!startDate || !endDate) {
            if (!data || data.length === 0) return [];
            const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            return sortedData.map(item => ({
                name: format(parseISO(item.date), 'MMM d'),
                posts: item.posts,
                likes: item.likes,
                comments: item.comments,
                follows: item.follows,
                fullDate: item.date
            }));
        }

        const dataMap = new Map<string, DailyInteraction>();
        (data || []).forEach(item => {
            const key = format(parseISO(item.date), 'yyyy-MM-dd');
            dataMap.set(key, item);
        });

        let days: Date[] = [];
        try {
            days = eachDayOfInterval({ start: startDate, end: endDate });
        } catch (e) {
            console.error("Invalid date interval", e);
            return [];
        }

        return days.map(day => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayData = dataMap.get(dateKey);

            let label = '';
            if (view === 'weekly') {
                label = format(day, 'EEE');
            } else {
                label = format(day, 'd');
            }

            return {
                name: label,
                posts: dayData?.posts || 0,
                likes: dayData?.likes || 0,
                comments: dayData?.comments || 0,
                follows: dayData?.follows || 0,
                fullDate: format(day, 'MMM d, yyyy')
            };
        });
    };

    const chartData = processData();

    // Match TimeUsageChart scaling: default to 10, step of 2
    const maxValue = Math.max(
        ...chartData.map(d => d[selectedMetric]),
        0
    );
    const tickStep = 2; // Fixed step of 2
    const calculatedMax = Math.ceil(maxValue / tickStep) * tickStep;
    const finalMax = Math.max(calculatedMax, 10); // Default minimum of 10

    const ticks = [];
    for (let i = 0; i <= finalMax; i += tickStep) {
        ticks.push(i);
    }

    const metricConfig = {
        likes: { icon: Heart, color: '#3b82f6', label: 'Likes' },
        comments: { icon: MessageCircle, color: '#10b981', label: 'Comments' },
        posts: { icon: FileText, color: '#8b5cf6', label: 'Posts' },
        follows: { icon: UserPlus, color: '#f59e0b', label: 'Follows' }
    };

    return (
        <Card className="w-full">
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-4 md:space-y-0 pb-8">
                <div>
                    <CardTitle>Interactions Overview</CardTitle>
                    <CardDescription>
                        {view === 'weekly' && 'Daily interactions for the selected week'}
                        {view === 'monthly' && 'Daily interactions for the selected month'}
                    </CardDescription>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 items-center w-full md:w-auto">
                    <div className="flex items-center gap-2 bg-secondary/50 p-1 rounded-lg">
                        <Button variant="ghost" size="icon" onClick={onPrevClick} className="h-8 w-8 hover:bg-background">
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-medium min-w-[140px] text-center">
                            {currentLabel}
                        </span>
                        <Button variant="ghost" size="icon" onClick={onNextClick} className="h-8 w-8 hover:bg-background">
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
                <div className="flex gap-4">
                    {/* Vertical Metric Selector */}
                    <div className="flex flex-col gap-2 bg-secondary/30 p-2 rounded-lg">
                        {(Object.keys(metricConfig) as MetricType[]).map((metric) => {
                            const config = metricConfig[metric];
                            const Icon = config.icon;
                            const isSelected = selectedMetric === metric;

                            return (
                                <Button
                                    key={metric}
                                    variant={isSelected ? "default" : "ghost"}
                                    size="icon"
                                    onClick={() => setSelectedMetric(metric)}
                                    className={`h-10 w-10 ${isSelected ? '' : 'hover:bg-secondary'}`}
                                    style={isSelected ? { backgroundColor: config.color } : {}}
                                    title={config.label}
                                >
                                    <Icon className="h-5 w-5" />
                                </Button>
                            );
                        })}
                    </div>

                    {/* Chart */}
                    <div className="flex-1 h-[300px]">
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
                                    />
                                    <Tooltip
                                        cursor={{
                                            fill: 'hsl(var(--muted) / 0.4)',
                                        }}
                                        contentStyle={{
                                            borderRadius: '8px',
                                            border: '1px solid hsl(var(--border))',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                            backgroundColor: 'hsl(var(--popover))',
                                            color: 'hsl(var(--popover-foreground))',
                                            padding: '12px'
                                        }}
                                        labelStyle={{
                                            color: 'hsl(var(--muted-foreground))',
                                            marginBottom: '4px'
                                        }}
                                        itemStyle={{
                                            color: 'hsl(var(--popover-foreground))',
                                            fontWeight: 500
                                        }}
                                        labelFormatter={(label, payload) => {
                                            if (payload && payload.length > 0) {
                                                return payload[0].payload.fullDate;
                                            }
                                            return label;
                                        }}
                                    />
                                    <Bar
                                        dataKey={selectedMetric}
                                        fill={metricConfig[selectedMetric].color}
                                        radius={[4, 4, 0, 0]}
                                        name={metricConfig[selectedMetric].label}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                                No interaction data for this period
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default InteractionsChart;
