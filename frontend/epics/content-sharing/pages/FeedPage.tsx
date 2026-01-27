import React, { useEffect } from 'react';
import { useContentStore } from '../store/contentStore';
import { CreatePost } from '../components/CreatePost';
import { PostCard } from '../components/PostCard';
import { UserSearch } from '../components/UserSearch';
import { NotificationList } from '../components/NotificationList';
import './Feed.css';

export const FeedPage: React.FC = () => {
    const { posts, loading, error, fetchFeed, fetchUnreadCount } = useContentStore();
    const [showNotifications, setShowNotifications] = React.useState(false);
    const [showSearch, setShowSearch] = React.useState(false);

    useEffect(() => {
        fetchFeed();
        fetchUnreadCount();

        // Poll for new notifications every 30 seconds
        const interval = setInterval(() => {
            fetchUnreadCount();
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="feed-page">
            <div className="feed-header">
                <h1>Feed</h1>
                <div className="header-actions">
                    <button
                        onClick={() => setShowSearch(!showSearch)}
                        className={`header-btn ${showSearch ? 'active' : ''}`}
                    >
                        🔍 Search
                    </button>
                    <button
                        onClick={() => setShowNotifications(!showNotifications)}
                        className={`header-btn ${showNotifications ? 'active' : ''}`}
                    >
                        🔔 Notifications
                    </button>
                </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="feed-container">
                <div className="feed-main">
                    <CreatePost />

                    {loading && posts.length === 0 && (
                        <div className="loading">Loading feed...</div>
                    )}

                    {!loading && posts.length === 0 && (
                        <div className="empty-feed">
                            <p>No posts yet. Start by creating a post or following some users!</p>
                        </div>
                    )}

                    <div className="posts">
                        {posts.map((post) => (
                            <PostCard key={post.id} post={post} />
                        ))}
                    </div>
                </div>

                {showSearch && (
                    <div className="feed-sidebar">
                        <UserSearch />
                    </div>
                )}

                {showNotifications && (
                    <div className="feed-sidebar">
                        <NotificationList />
                    </div>
                )}
            </div>
        </div>
    );
};
