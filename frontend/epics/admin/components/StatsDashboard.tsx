import React from 'react';
import { Users, FileText, Activity, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminStats } from '../types';

interface StatsDashboardProps {
    stats: AdminStats | null;
    loading: boolean;
}

const StatsDashboard: React.FC<StatsDashboardProps> = ({ stats, loading }) => {
    const cards = [
        {
            title: 'Total Users',
            value: stats?.total_users || 0,
            icon: Users,
            color: 'text-blue-500',
            bg: 'bg-blue-500/10',
        },
        {
            title: 'Total Posts',
            value: stats?.total_posts || 0,
            icon: FileText,
            color: 'text-orange-500',
            bg: 'bg-orange-500/10',
        },
    ];

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {cards.map((card, index) => (
                <Card key={index} className="border-border/40 bg-card/50 backdrop-blur-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                        <div className={`p-2 rounded-full ${card.bg}`}>
                            <card.icon className={`h-4 w-4 ${card.color}`} />
                        </div>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="h-8 w-24 animate-pulse bg-muted rounded" />
                        ) : (
                            <div className="text-2xl font-bold">{card.value}</div>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                            Updated just now
                        </p>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
};

export default StatsDashboard;
