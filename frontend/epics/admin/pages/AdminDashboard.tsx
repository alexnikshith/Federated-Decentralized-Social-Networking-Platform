import React, { useEffect, useState } from 'react';
import { adminApi } from '../api/adminApi';
import { AdminStats } from '../types';
import { User } from '../../identity/types';
import StatsDashboard from '../components/StatsDashboard';
import UserManagement from '../components/UserManagement';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { RefreshCcw, ShieldAlert, LayoutDashboard, Users, FileText } from 'lucide-react';
import { toast } from 'sonner';

const AdminDashboard: React.FC = () => {
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [statsData, usersData] = await Promise.all([
                adminApi.getStats(),
                adminApi.listUsers(),
            ]);
            setStats(statsData);
            setUsers(usersData);
        } catch (error) {
            console.error('Failed to fetch admin data:', error);
            toast.error('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
        try {
            await adminApi.toggleUserStatus({ user_id: userId, is_active: !currentStatus });
            toast.success(`User successfully ${!currentStatus ? 'activated' : 'deactivated'}`);
            fetchData(); // Refresh data
        } catch (error) {
            toast.error('Failed to update user status');
        }
    };

    return (
        <div className="container mx-auto p-6 space-y-8 min-h-screen bg-transparent">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/40 pb-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <ShieldAlert className="h-6 w-6 text-primary" />
                        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent">
                            Admin Control Center
                        </h1>
                    </div>
                    <p className="text-muted-foreground flex items-center gap-2">
                        Manage platform users, content, and daily activity.
                    </p>
                </div>
                <Button onClick={fetchData} variant="outline" className="gap-2 backdrop-blur-sm bg-background/50">
                    <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Main Content */}
            <div className="space-y-6">
                <StatsDashboard stats={stats} loading={loading} />

                <Tabs defaultValue="users" className="w-full space-y-6">
                    <div className="flex justify-between items-center">
                        <TabsList className="bg-muted/30 backdrop-blur-sm border border-border/40">
                            <TabsTrigger value="overview" className="gap-2">
                                <LayoutDashboard className="h-4 w-4" />
                                Overview
                            </TabsTrigger>
                            <TabsTrigger value="users" className="gap-2">
                                <Users className="h-4 w-4" />
                                User Management
                            </TabsTrigger>
                            <TabsTrigger value="posts" className="gap-2">
                                <FileText className="h-4 w-4" />
                                Content Moderation
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="overview" className="mt-0">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-6">
                            {/* System Status placeholder or charts could go here */}
                            <div className="col-span-4 bg-card/20 border border-border/40 rounded-xl h-[300px] flex items-center justify-center">
                                <p className="text-muted-foreground">Traffic Analysis (Chart Placeholder)</p>
                            </div>
                            <div className="col-span-3 bg-card/20 border border-border/40 rounded-xl h-[300px] flex items-center justify-center">
                                <p className="text-muted-foreground">Active Instances (Map Placeholder)</p>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="users" className="mt-0">
                        <UserManagement
                            users={users}
                            loading={loading}
                            onToggleStatus={handleToggleStatus}
                            onRefresh={fetchData}
                        />
                    </TabsContent>

                    <TabsContent value="posts" className="mt-0">
                        <div className="bg-card/20 border border-border/40 rounded-xl p-8 text-center space-y-4">
                            <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
                            <h3 className="text-xl font-semibold">Content Moderation</h3>
                            <p className="text-muted-foreground max-w-sm mx-auto">
                                Feed is processing metadata. Post management interface will appear here shortly.
                            </p>
                            <Button variant="outline" size="sm">Coming Soon</Button>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};

export default AdminDashboard;
