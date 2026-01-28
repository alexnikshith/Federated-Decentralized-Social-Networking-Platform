import React, { useEffect } from 'react';
import { useAuthStore } from '../../../epics/identity/store/authStore';
import { useContentStore } from '../store/contentStore';
import { CreatePost } from '../components/CreatePost';
import { PostCard } from '../components/PostCard';
import { UserSearch } from '../components/UserSearch';
import { NotificationList } from '../components/NotificationList';
import {
    LayoutDashboard,
    Rss,
    Bell,
    Users,
    Activity,
    Shield,
    Globe
} from 'lucide-react';
import './Dashboard.css';

export const DashboardPage: React.FC = () => {
    const { user } = useAuthStore();
    const { posts, loading, error, fetchFeed, fetchUnreadCount, unreadCount } = useContentStore();

    useEffect(() => {
        fetchFeed();
        fetchUnreadCount();

        // Refresh periodically
        const interval = setInterval(() => {
            fetchUnreadCount();
        }, 30000);

        return () => clearInterval(interval);
    }, [fetchFeed, fetchUnreadCount]);

    return (
        <div className="dashboard-container">
            <main className="dashboard-content">
                <header className="welcome-header stagger-1">
                    <h1 className="text-gradient-gold">
                        Welcome back, {user?.display_name || user?.username}!
                    </h1>
                    <p>Your federated social overview on {user?.instance || 'Nexus'}</p>
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

                            {!loading && posts.filter(post => post.author_id !== user?.id).length === 0 && (
                                <div className="glass-card rounded-xl empty-state">
                                    <Globe className="empty-state-icon" />
                                    <h3 className="font-display font-semibold mb-2">Nothing here yet</h3>
                                    <p className="text-muted-foreground mb-4">
                                        Follow interesting people to see their posts here.
                                    </p>
                                </div>
                            )}

                            {posts
                                .filter(post => post.author_id !== user?.id)
                                .map((post, index) => (
                                    <div key={post.id} className="opacity-0 animate-fade-in-up" style={{ animationDelay: `${index * 0.1}s` }}>
                                        <div className="glass-card rounded-xl overflow-hidden">
                                            <PostCard post={post} />
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>

                    {/* Sidebar section */}
                    <div className="sidebar-section stagger-3">
                        {/* Notifications */}
                        <div className="glass-card rounded-xl p-6">
                            <h2 className="section-title">
                                <Bell className="w-5 h-5 text-primary" />
                                Notifications
                                {unreadCount > 0 && (
                                    <span className="ml-auto bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full node-pulse">
                                        {unreadCount}
                                    </span>
                                )}
                            </h2>
                            <NotificationList />
                        </div>

                        {/* Discover */}
                        <div className="glass-card rounded-xl p-6">
                            <h2 className="section-title">
                                <Users className="w-5 h-5 text-accent" />
                                Discover
                            </h2>
                            <UserSearch />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};
