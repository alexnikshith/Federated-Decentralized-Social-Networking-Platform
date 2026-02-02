import React from 'react';
import { MainLayout } from '../../../src/components/layout/MainLayout';
import { ActivityStats } from '../components/ActivityStats';

export const ReportsPage: React.FC = () => {
    return (
        <MainLayout>
            <div className="container mx-auto py-8">
                <h1 className="text-3xl font-bold mb-8">User Activity Report</h1>
                <ActivityStats />
            </div>
        </MainLayout>
    );
};
