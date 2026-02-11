import React, { useEffect, useState } from 'react';
import { useContentStore } from '../store/contentStore';
import { useAuthStore } from '../../../epics/identity/store/authStore';
import { CreatePost } from '../components/CreatePost';
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

// FeedPage is the main content stream
// It combines Post creation, Feed display, Search, and Notifications
export const FeedPage: React.FC = () => {
    const { user } = useAuthStore();
    const { loading, error, fetchFeed, fetchUnreadCount, unreadCount } = useContentStore();
    const activeCommunityId = localStorage.getItem('active_community_id');
    const [sidebarType, setSidebarType] = useState<'notifications' | 'search' | null>(null);
    const [showGuidelines, setShowGuidelines] = useState(false);
    const [showDrafts, setShowDrafts] = useState(false);

    useEffect(() => {
        // Initial Fetch
        fetchFeed();
        fetchUnreadCount();

        // Polling for unread count
        const interval = setInterval(() => {
            fetchUnreadCount();
        }, 30000);

        // Refetch on Window Focus (Real-time feel)
        const onFocus = () => {
            fetchFeed();
            fetchUnreadCount();
        };
        window.addEventListener('focus', onFocus);

        return () => {
            clearInterval(interval);
            window.removeEventListener('focus', onFocus);
        };
    }, [fetchFeed, fetchUnreadCount, user?.id, activeCommunityId]);

    const toggleSidebar = (type: 'notifications' | 'search') => {
        setSidebarType(prev => prev === type ? null : type);
    };

    return (
        <div className="feed-page-wrapper">
            <main className="feed-content-container">
                <div className="feed-layout-grid">
                    {/* Left/Main Column */}
                    <div className="feed-main-col stagger-1 max-w-2xl mx-auto w-full">
                        <header className="feed-page-header mb-8">
                            <div>
                                <h1 className="text-gradient-gold">New Post</h1>
                                <p className="text-sm text-muted-foreground">Share your thoughts with the federation</p>
                            </div>
                        </header>

                        <div className="create-post-container mb-8">
                            <CreatePost />
                        </div>

                        {/* Posting Tools */}
                        <div className="space-y-4">
                            <div className="flex gap-4">
                                <Button
                                    variant={showDrafts ? "default" : "outline"}
                                    onClick={() => { setShowDrafts(!showDrafts); setShowGuidelines(false); }}
                                    className="flex-1"
                                >
                                    {showDrafts ? 'Hide Drafts' : 'View Drafts'}
                                </Button>
                                <Button
                                    variant={showGuidelines ? "default" : "outline"}
                                    onClick={() => { setShowGuidelines(!showGuidelines); setShowDrafts(false); }}
                                    className="flex-1"
                                >
                                    {showGuidelines ? 'Hide Guidelines' : 'Posting Guidelines'}
                                </Button>
                            </div>

                            {/* Drafts Section */}
                            {showDrafts && (
                                <div className="bg-card/50 border border-border rounded-xl p-4 animate-in fade-in slide-in-from-top-2">
                                    <h3 className="font-bold mb-3 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-yellow-500" />
                                        Saved Drafts
                                    </h3>
                                    <div className="space-y-2">
                                        <div className="p-3 rounded-lg bg-background/50 hover:bg-background/80 transition-colors cursor-pointer border border-border/50">
                                            <p className="font-medium truncate">Thoughts on the decentralized web...</p>
                                            <p className="text-xs text-muted-foreground mt-1">Saved 2 hours ago</p>
                                        </div>
                                        <div className="p-3 rounded-lg bg-background/50 hover:bg-background/80 transition-colors cursor-pointer border border-border/50">
                                            <p className="font-medium truncate">Project update: implementation details</p>
                                            <p className="text-xs text-muted-foreground mt-1">Saved yesterday</p>
                                        </div>
                                        <p className="text-xs text-center text-muted-foreground pt-2">Select a draft to continue editing</p>
                                    </div>
                                </div>
                            )}

                            {/* Guidelines Section */}
                            {showGuidelines && (
                                <div className="bg-card/50 border border-border rounded-xl p-4 animate-in fade-in slide-in-from-top-2">
                                    <h3 className="font-bold mb-3 flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 text-primary" />
                                        Community Standards
                                    </h3>
                                    <ul className="space-y-2 text-sm text-muted-foreground">
                                        <li className="flex gap-2">
                                            <span className="font-bold text-foreground">1.</span>
                                            Be respectful and constructive in your discussions.
                                        </li>
                                        <li className="flex gap-2">
                                            <span className="font-bold text-foreground">2.</span>
                                            No hate speech, harassment, or illegal content.
                                        </li>
                                        <li className="flex gap-2">
                                            <span className="font-bold text-foreground">3.</span>
                                            Use appropriate credentials for sensitive claims.
                                        </li>
                                        <li className="flex gap-2">
                                            <span className="font-bold text-foreground">4.</span>
                                            Keep personal information private.
                                        </li>
                                    </ul>
                                </div>
                            )}
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
                </div >
            </main >
        </div >
    );
};
