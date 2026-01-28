import React, { useEffect, useState } from 'react';
import { useContentStore } from '../store/contentStore';
import { CreatePost } from '../components/CreatePost';
import { PostCard } from '../components/PostCard';
import { UserSearch } from '../components/UserSearch';
import { NotificationList } from '../components/NotificationList';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import {
    Search,
    Bell,
    Rss,
    AlertCircle,
    Loader2,
    WifiOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import './Feed.css';

export const FeedPage: React.FC = () => {
    const { posts, loading, error, fetchFeed, fetchUnreadCount, unreadCount } = useContentStore();
    const [sidebarType, setSidebarType] = useState<'notifications' | 'search' | null>(null);

    useEffect(() => {
        fetchFeed();
        fetchUnreadCount();

        const interval = setInterval(() => {
            fetchUnreadCount();
        }, 30000);

        return () => clearInterval(interval);
    }, [fetchFeed, fetchUnreadCount]);

    const toggleSidebar = (type: 'notifications' | 'search') => {
        setSidebarType(prev => prev === type ? null : type);
    };

    return (
        <div className="feed-page-wrapper">
            <Header />

            <main className="feed-content-container">
                <div className="feed-layout-grid">
                    {/* Left/Main Column */}
                    <div className="feed-main-col stagger-1">
                        <header className="feed-page-header">
                            <div>
                                <h1 className="text-gradient-gold">Global Feed</h1>
                                <p className="text-sm text-muted-foreground">Catch up with the federation</p>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    variant={sidebarType === 'search' ? 'hero' : 'secondary'}
                                    size="sm"
                                    onClick={() => toggleSidebar('search')}
                                    className="gap-2 rounded-full"
                                >
                                    <Search className="w-4 h-4" />
                                    <span className="hidden sm:inline">Search</span>
                                </Button>
                                <Button
                                    variant={sidebarType === 'notifications' ? 'hero' : 'secondary'}
                                    size="sm"
                                    onClick={() => toggleSidebar('notifications')}
                                    className="gap-2 rounded-full relative"
                                >
                                    <Bell className="w-4 h-4" />
                                    <span className="hidden sm:inline">Notifications</span>
                                    {unreadCount > 0 && (
                                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-destructive rounded-full border-2 border-background" />
                                    )}
                                </Button>
                            </div>
                        </header>

                        <div className="create-post-container mb-12">
                            <CreatePost />
                        </div>

                        {error && (
                            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-3 mb-8">
                                <WifiOff className="w-5 h-5 flex-shrink-0" />
                                <p>{error}</p>
                                <Button variant="ghost" size="sm" onClick={() => fetchFeed()} className="ml-auto text-xs uppercase font-bold tracking-wider">
                                    Retry
                                </Button>
                            </div>
                        )}

                        <div className="flex items-center gap-4 mb-8">
                            <div className="h-px flex-1 bg-border/50" />
                            <h2 className="font-display font-bold text-xs uppercase tracking-[0.3em] text-muted-foreground/60 whitespace-nowrap">
                                Federated Timeline
                            </h2>
                            <div className="h-px flex-1 bg-border/50" />
                        </div>

                        <div className="space-y-6">
                            {loading && posts.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-20 animate-in fade-in">
                                    <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
                                    <p className="text-sm text-muted-foreground uppercase tracking-widest font-medium">Syncing Feed...</p>
                                </div>
                            )}

                            {!loading && posts.length === 0 && !error && (
                                <div className="glass-card rounded-xl py-20 px-6 text-center">
                                    <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-4 opacity-20" />
                                    <h3 className="text-lg font-display font-bold mb-1">Silence in the Federation</h3>
                                    <p className="text-sm text-muted-foreground">There are no global posts yet. Be the first to start the conversation!</p>
                                </div>
                            )}

                            {posts.map((post, index) => (
                                <div
                                    key={post.id}
                                    className="opacity-0 animate-fade-in-up"
                                    style={{ animationDelay: `${index * 0.05}s` }}
                                >
                                    <PostCard post={post} />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Column / Sidebar */}
                    <div className={cn(
                        "feed-sidebar-col stagger-2",
                        sidebarType ? "active" : "inactive"
                    )}>
                        <div className="sticky top-24 space-y-6">
                            {sidebarType === 'search' && (
                                <div className="glass-card rounded-xl p-6 animate-scale-in">
                                    <div className="flex items-center gap-2 mb-6 border-b border-border/50 pb-4">
                                        <Search className="w-5 h-5 text-primary" />
                                        <h2 className="font-display font-bold">Discover People</h2>
                                    </div>
                                    <UserSearch />
                                </div>
                            )}

                            {sidebarType === 'notifications' && (
                                <div className="glass-card rounded-xl p-6 animate-scale-in">
                                    <div className="flex items-center gap-2 mb-6 border-b border-border/50 pb-4">
                                        <Bell className="w-5 h-5 text-accent" />
                                        <h2 className="font-display font-bold">Recent Activity</h2>
                                    </div>
                                    <NotificationList />
                                </div>
                            )}

                            {!sidebarType && (
                                <div className="hidden lg:block space-y-6">
                                    <div className="glass-card rounded-xl p-6 bg-gradient-gold/5 border-primary/20">
                                        <div className="flex items-center gap-3 mb-3">
                                            <Rss className="w-6 h-6 text-primary" />
                                            <h3 className="font-display font-bold">Federated View</h3>
                                        </div>
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            You are currently viewing the global federated feed. Posts from all connected instances are synchronized here in real-time.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
};
