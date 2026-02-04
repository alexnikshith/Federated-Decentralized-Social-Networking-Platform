import React, { useEffect, useState } from 'react';
import { adminApi } from '../api/adminApi';
import { AdminStats } from '../types';
import { User } from '../../identity/types';
import StatsDashboard from '../components/StatsDashboard';
import UserManagement from '../components/UserManagement';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { RefreshCcw, ShieldAlert, LayoutDashboard, Users, FileText, Flag } from 'lucide-react';
import { toast } from 'sonner';

const AdminDashboard: React.FC = () => {
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [statsData, usersData, reportsData] = await Promise.all([
                adminApi.getStats(),
                adminApi.listUsers(),
                adminApi.listReports(),
            ]);
            setStats(statsData);
            setUsers(usersData);
            setReports(reportsData);
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

    const handleDeleteUser = async (userId: string) => {
        try {
            await adminApi.deleteUser(userId);
            toast.success('User and all associated data permanently deleted');
            fetchData();
        } catch (error) {
            toast.error('Failed to delete user');
        }
    };

    const handleResolveReport = async (reportId: string) => {
        try {
            await adminApi.resolveReport(reportId);
            toast.success('Report resolved');
            fetchData();
        } catch (error) {
            toast.error('Failed to resolve report');
        }
    };

    const handleDeleteReportedPost = async (postId: string, reportId: string) => {
        try {
            await adminApi.deletePost(postId);
            await adminApi.resolveReport(reportId);
            toast.success('Post deleted and report resolved');
            fetchData();
        } catch (error) {
            toast.error('Failed to delete post');
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
                            onDeleteUser={handleDeleteUser}
                            onRefresh={fetchData}
                        />
                    </TabsContent>

                    <TabsContent value="posts" className="mt-0">
                        <div className="bg-card/20 border border-border/40 rounded-xl p-6 space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-semibold flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-primary" />
                                    Active Reports ({reports.length})
                                </h3>
                            </div>

                            {reports.length > 0 ? (
                                <div className="space-y-4">
                                    {reports.map((report) => (
                                        <div key={report.id} className="p-4 rounded-lg bg-background/50 border border-border/40 space-y-3">
                                            <div className="flex justify-between items-start">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-bold text-orange-500 flex items-center gap-1">
                                                            <Flag className="h-3 w-3" />
                                                            REPORTED
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">•</span>
                                                        <span className="text-xs text-muted-foreground">{new Date(report.created_at).toLocaleString()}</span>
                                                    </div>
                                                    <p className="text-sm font-medium">
                                                        <span className="text-muted-foreground font-normal text-xs uppercase tracking-wider mr-2">Reporter:</span>
                                                        @{report.reporter_name}
                                                    </p>
                                                    <p className="text-sm">
                                                        <span className="text-muted-foreground font-normal text-xs uppercase tracking-wider mr-2">Reason:</span>
                                                        {report.reason}
                                                    </p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button variant="ghost" size="sm" onClick={() => handleResolveReport(report.id)}>
                                                        Dismiss
                                                    </Button>
                                                    <Button variant="destructive" size="sm" onClick={() => handleDeleteReportedPost(report.post_id, report.id)}>
                                                        Delete Post
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="p-3 rounded-md bg-muted/30 border border-border/20">
                                                <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold mb-2">Post Content (by @{report.author_name})</p>
                                                <p className="text-sm italic text-foreground/80">"{report.post_content}"</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 space-y-4">
                                    <ShieldAlert className="h-12 w-12 text-muted-foreground/30 mx-auto" />
                                    <p className="text-muted-foreground">No active reports. The platform is clean!</p>
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};

export default AdminDashboard;
