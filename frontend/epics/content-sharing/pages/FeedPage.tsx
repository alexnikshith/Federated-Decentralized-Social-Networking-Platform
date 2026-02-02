import React, { useEffect, useState } from 'react';
import { useContentStore } from '../store/contentStore';
import { CreatePost } from '../components/CreatePost';
import { PostCard } from '../components/PostCard';
import { UserSearch } from '../components/UserSearch';
import { NotificationList } from '../components/NotificationList';
import { Button } from '@/components/ui/button';
import {
    Search,
    Bell,
    Rss,
    AlertCircle,
    Loader2,
    WifiOff,
    X
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
            <main className="feed-content-container">
                <div className="feed-layout-grid">
                    {/* Left/Main Column */}
                    <div className="feed-main-col stagger-1">
                        <header className="feed-page-header mb-8">
                            <div>
                                <h1 className="text-gradient-gold">New Post</h1>
                                <p className="text-sm text-muted-foreground">Share your thoughts with the federation</p>
                            </div>

                            <div className="flex items-center gap-2">
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

                        <div className="create-post-container max-w-2xl mx-auto">
                            <CreatePost />
                        </div>
                    </div>

                    {/* Overlay */}
                    {sidebarType && (
                        <div
                            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 transition-all duration-300"
                            onClick={() => setSidebarType(null)}
                        />
                    )}

                    {/* Right Column / Sidebar */}
                    <div className={cn(
                        "feed-sidebar-col",
                        sidebarType ? "active" : ""
                    )}>
                        <div className="sticky top-6 space-y-6">
                            <div className="flex items-center justify-between mb-2 lg:mb-6">
                                <h2 className="font-display font-bold text-xl">
                                    {sidebarType === 'search' ? 'Discover People' : sidebarType === 'notifications' ? 'Notifications' : ''}
                                </h2>
                                <Button variant="ghost" size="icon" onClick={() => setSidebarType(null)} className="rounded-full">
                                    <X className="w-5 h-5" />
                                </Button>
                            </div>

                            {sidebarType === 'search' && (
                                <div className="animate-scale-in">
                                    <UserSearch />
                                </div>
                            )}

                            {sidebarType === 'notifications' && (
                                <div className="animate-scale-in">
                                    <NotificationList />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};
