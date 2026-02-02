import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../../epics/identity/store/authStore';
import { useContentStore } from '../store/contentStore';
import { PostCard } from '../components/PostCard';
import { UserSearch } from '../components/UserSearch';
import { NotificationList } from '../components/NotificationList';
import { Button } from '@/components/ui/button';
import {
    Rss,
    Bell,
    Users,
    Globe,
    Search,
    X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import './Dashboard.css';

export const DashboardPage: React.FC = () => {
    const { user } = useAuthStore();
    const { posts, loading, error, fetchFeed, fetchUnreadCount, unreadCount } = useContentStore();
    const [sidebarType, setSidebarType] = useState<'notifications' | 'search' | null>(null);
    const [searchParams, setSearchParams] = useSearchParams();

    useEffect(() => {
        if (searchParams.get('search') === 'true') {
            setSidebarType('search');
            // Optional: clear param if you want 'one-time' trigger, or keep it to allow back-button behavior
            // setSearchParams({});
        }
    }, [searchParams]);

    useEffect(() => {
        fetchFeed();
        fetchUnreadCount();

        // Refresh periodically
        const interval = setInterval(() => {
            fetchUnreadCount();
        }, 30000);

        return () => clearInterval(interval);
    }, [fetchFeed, fetchUnreadCount]);

    const toggleSidebar = (type: 'notifications' | 'search') => {
        setSidebarType(prev => prev === type ? null : type);
        // Clear param when manually toggling to keep state clean (optional but recommended)
        if (searchParams.get('search')) setSearchParams({});
    };

    return (
        <div className="dashboard-container">
            <main className="dashboard-content">
                <header className="welcome-header stagger-1 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-gradient-gold">
                            Welcome, {user?.display_name || user?.username}!
                        </h1>
                    </div>

                </header>

                <div className="dashboard-grid">
                    {/* Main Feed Section */}
                    <div className="feed-section stagger-2">
                        <h2 className="section-title">
                            <Rss className="w-5 h-5 text-primary" />
                            Your Feed
                        </h2>

                        <div className="space-y-4">
                            {loading && posts.length === 0 && (
                                <div className="feed-loading">
                                    <div className="animate-pulse">Loading your feed...</div>
                                </div>
                            )}

                            {error && (
                                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                                    {error}
                                </div>
                            )}

                            {!loading && posts.length === 0 && (
                                <div className="glass-card rounded-xl empty-state">
                                    <Globe className="empty-state-icon" />
                                    <h3 className="font-display font-semibold mb-2">No posts yet</h3>
                                    <p className="text-muted-foreground mb-4">
                                        Your feed is empty.
                                    </p>
                                </div>
                            )}

                            {posts
                                .map((post, index) => (
                                    <div key={post.id} className="opacity-0 animate-fade-in-up" style={{ animationDelay: `${index * 0.1}s` }}>
                                        <div className="glass-card rounded-xl overflow-hidden">
                                            <PostCard post={post} />
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>

                    {/* Overlay */}
                    {sidebarType && (
                        <div
                            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 transition-all duration-300"
                            onClick={() => setSidebarType(null)}
                        />
                    )}

                    {/* Sidebar section */}
                    <div className={cn(
                        "sidebar-section stagger-3",
                        sidebarType ? "active" : ""
                    )}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-display font-bold text-xl">
                                {sidebarType === 'search' ? 'Discover People' : sidebarType === 'notifications' ? 'Notifications' : ''}
                            </h2>
                            <Button variant="ghost" size="icon" onClick={() => setSidebarType(null)} className="rounded-full">
                                <X className="w-5 h-5" />
                            </Button>
                        </div>



                        {sidebarType === 'search' && (
                            <div className="glass-card rounded-xl p-6 animate-scale-in">
                                <div className="flex items-center gap-2 mb-6 border-b border-border/50 pb-4">
                                    <Users className="w-5 h-5 text-accent" />
                                    <h2 className="font-display font-bold">Discover</h2>
                                </div>
                                <UserSearch />
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div >
    );
};
