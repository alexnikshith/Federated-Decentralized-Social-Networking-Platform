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
import { useReportsApi } from '../../reports/api/reportsApi';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useQueryClient } from '@tanstack/react-query';

// AdminDashboard provides a comprehensive view for platform administrators
// Features: User Management, Content Moderation (Reports), Statistics
const AdminDashboard: React.FC = () => {
    // Top-level state
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Hooks
    const { useAdminReports } = useReportsApi();
    const { data: userReports } = useAdminReports();
    const queryClient = useQueryClient();

    // Deactivation Dialog State
    const [deactivateId, setDeactivateId] = useState<string | null>(null);
    const [deactivateReason, setDeactivateReason] = useState("");
    const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false);

    // Initial Data Fetch
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

    // Active/Deactivate User Handler
    const handleToggleStatus = async (userId: string, currentStatus: boolean, reason?: string) => {
        try {
            await adminApi.toggleUserStatus({ user_id: userId, is_active: !currentStatus, reason });
            toast.success(`User successfully ${!currentStatus ? 'activated' : 'deactivated'}`);
            fetchData(); // Refresh data
            queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
            setIsDeactivateDialogOpen(false);
            setDeactivateId(null);
            setDeactivateReason("");
        } catch (error) {
            toast.error('Failed to update user status');
        }
    };

    const initiateDeactivation = (userId: string) => {
        setDeactivateId(userId);
        setIsDeactivateDialogOpen(true);
    };

    const confirmDeactivation = () => {
        if (deactivateId) {
            handleToggleStatus(deactivateId, true, deactivateReason); // Passing true as current status means it becomes false
        }
    };

    // Hard Delete User Handler
    const handleDeleteUser = async (userId: string) => {
        try {
            await adminApi.deleteUser(userId);
            toast.success('User and all associated data permanently deleted');
            fetchData();
        } catch (error) {
            toast.error('Failed to delete user');
        }
    };

    // Report Resolution Handler (Just dismiss report)
    const handleResolveReport = async (reportId: string) => {
        try {
            await adminApi.resolveReport(reportId);
            toast.success('Report resolved');
            fetchData();
        } catch (error) {
            toast.error('Failed to resolve report');
        }
    };

    // Delete Post Handler (Confirm valid report)
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
                            <TabsTrigger value="reports" className="gap-2">
                                <Flag className="h-4 w-4" />
                                Reports
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
                            onToggleStatus={(id, status) => handleToggleStatus(id, status)} // Simple toggle for user table, or update to use dialog too? Keeping simple for now as requested for reports tab mainly.
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

                    <TabsContent value="reports" className="mt-0">
                        <div className="space-y-4">
                            {!userReports || userReports.length === 0 ? (
                                <div className="text-center p-8 text-muted-foreground">No reports found</div>
                            ) : (
                                userReports.map((report: any) => (
                                    <div key={report.id} className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 border border-border/40 rounded-xl bg-card/20 gap-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-destructive">{report.reason}</span>
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">{report.status}</span>
                                            </div>
                                            <div className="text-sm flex items-center gap-2">
                                                <span className="text-muted-foreground">Reported User:</span>
                                                <span className="font-medium text-foreground">{report.user_details?.display_name || 'Unknown'} (@{report.user_details?.username || 'unknown'})</span>
                                            </div>
                                            <p className="text-sm text-foreground/80 italic">
                                                "{report.description || 'No description provided'}"
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {format(new Date(report.created_at), 'PPP p')}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => window.open(`/profile/${report.user_details?.username}`, '_blank')}
                                            >
                                                View Profile
                                            </Button>

                                            {report.user_details?.is_active ? (
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => initiateDeactivation(report.reported_id)}
                                                >
                                                    Deactivate User
                                                </Button>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    variant="default" // or a 'success' variant if available, default is primary
                                                    className="bg-green-600 hover:bg-green-700"
                                                    onClick={() => handleToggleStatus(report.reported_id, false)} // status is false (inactive), so !false = true (active)
                                                >
                                                    Activate User
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </div>

            <Dialog open={isDeactivateDialogOpen} onOpenChange={setIsDeactivateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Deactivate User</DialogTitle>
                        <DialogDescription>
                            Please provide a reason for deactivating this user. This action will be recorded and sent to the user.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                        <textarea
                            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            rows={4}
                            placeholder="Reason for deactivation..."
                            value={deactivateReason}
                            onChange={(e) => setDeactivateReason(e.target.value)}
                        />
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setIsDeactivateDialogOpen(false)}>Cancel</Button>
                            <Button variant="destructive" onClick={confirmDeactivation}>Deactivate</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AdminDashboard;
