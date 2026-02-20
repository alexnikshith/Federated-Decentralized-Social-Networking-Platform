import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../../epics/identity/store/authStore';
import { useContentStore } from '../store/contentStore';
import { PostCard } from '../components/PostCard';
import { UserSearch } from '../components/UserSearch';
import { NotificationList } from '../components/NotificationList';
import { StoriesRow } from '../components/StoriesRow';
import { RightSidebar } from '../components/RightSidebar';
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
    const { posts, loading, error, fetchFeed, fetchUnreadCount, unreadCount, feedType, setFeedType } = useContentStore();
    const [sidebarType, setSidebarType] = useState<'notifications' | 'search' | null>(null);
    const [searchParams, setSearchParams] = useSearchParams();

    useEffect(() => {
        if (searchParams.get('search') === 'true') {
            setSidebarType('search');
            // Optional: clear param if you want 'one-time' trigger, or keep it to allow back-button behavior
            // setSearchParams({});
        }
    }, [searchParams]);

    const activeCommunityId = localStorage.getItem('active_community_id');

    useEffect(() => {
        fetchFeed();
        fetchUnreadCount();

        // Refresh periodically
        const interval = setInterval(() => {
            fetchUnreadCount();
        }, 30000);

        return () => clearInterval(interval);
    }, [fetchFeed, fetchUnreadCount, user?.id, activeCommunityId, feedType]);

    const toggleSidebar = (type: 'notifications' | 'search') => {
        setSidebarType(prev => prev === type ? null : type);
        // Clear param when manually toggling to keep state clean (optional but recommended)
        if (searchParams.get('search')) setSearchParams({});
    };

    return (
        <div className="dashboard-container">
            <main className="dashboard-content">


                <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6 max-w-7xl mx-auto">
                    {/* Main Feed Section */}
                    <div className="feed-section stagger-2 min-w-0">

                        {/* New Top Content Layout */}
                        <StoriesRow />

                        <div className="flex items-center justify-between mb-4">
                            <h2 className="section-title mb-0">
                                <Rss className="w-5 h-5 text-primary" />
                                {feedType === 'home' ? 'For You' : 'Public Feed'}
                            </h2>
                            <div className="flex bg-muted/50 p-1 rounded-lg">
                                <button
                                    onClick={() => setFeedType('home')}
                                    className={cn(
                                        "px-3 py-1 rounded-md text-sm font-medium transition-all",
                                        feedType === 'home' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    Home
                                </button>
                                <button
                                    onClick={() => setFeedType('public')}
                                    className={cn(
                                        "px-3 py-1 rounded-md text-sm font-medium transition-all",
                                        feedType === 'public' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    Public
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {loading && (!posts || posts.length === 0) && (
                                <div className="feed-loading">
                                    <div className="animate-pulse">Loading your feed...</div>
                                </div>
                            )}

                            {error && (
                                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                                    {error}
                                </div>
                            )}

                            {!loading && (!posts || posts.length === 0) && (
                                <div className="glass-card rounded-xl empty-state">
                                    <Globe className="empty-state-icon" />
                                    <h3 className="font-display font-semibold mb-2">No posts yet</h3>
                                    <p className="text-muted-foreground mb-4">
                                        Your feed is empty.
                                    </p>
                                </div>
                            )}

                            {posts && posts
                                .map((post, index) => (
                                    <div key={post.id} className="opacity-0 animate-fade-in-up" style={{ animationDelay: `${index * 0.1}s` }}>
                                        <div className="glass-card rounded-xl overflow-hidden">
                                            <PostCard post={post} />
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>

                    {/* Right Sidebar */}
                    <RightSidebar />

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
