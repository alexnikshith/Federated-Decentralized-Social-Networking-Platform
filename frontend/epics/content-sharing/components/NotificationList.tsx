import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, isToday, isYesterday } from 'date-fns';
import { useContentStore } from '../store/contentStore';
import { useAuthStore } from '../../identity/store/authStore';
import { Notification as AppNotification } from '../types';
import { PostDetailDialog } from './PostDetailDialog';
import {
    Heart,
    MessageSquare,
    UserPlus,
    Circle,
    BellOff
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const NotificationList: React.FC = () => {
    const navigate = useNavigate();
    const { notifications, fetchNotifications, markAsRead, fetchUnreadCount } =
        useContentStore();
    const { user: currentUser } = useAuthStore();
    const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
    const [showPostDialog, setShowPostDialog] = useState(false);
    const [openCommentsOnPost, setOpenCommentsOnPost] = useState(false);

    useEffect(() => {
        fetchNotifications();
        fetchUnreadCount();
    }, []);

    const handleMarkAsRead = (notificationId: string) => {
        markAsRead(notificationId);
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'like':
                return <Heart className="w-4 h-4 text-destructive fill-current" />;
            case 'comment':
                return <MessageSquare className="w-4 h-4 text-primary fill-current" />;
            case 'follow':
                return <UserPlus className="w-4 h-4 text-accent fill-current" />;
            default:
                return <Circle className="w-4 h-4 text-muted-foreground" />;
        }
    };

    const formatNotificationDate = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return "";

            if (isToday(date)) {
                return `Today at ${format(date, 'h:mm a')}`;
            } else if (isYesterday(date)) {
                return `Yesterday at ${format(date, 'h:mm a')}`;
            } else {
                return format(date, 'MMM dd, yyyy');
            }
        } catch {
            return "";
        }
    };

    const getNotificationText = (notif: AppNotification) => {
        const handleUserClick = (e: React.MouseEvent) => {
            e.stopPropagation();
            navigate(`/profile/${notif.related_user_name}`);
        };

        const usernameElement = (
            <b
                className="text-foreground hover:text-primary hover:underline cursor-pointer transition-colors"
                onClick={handleUserClick}
            >
                {notif.related_user_name}
            </b>
        );

        // Helper function to truncate text
        const truncateText = (text: string, maxLength: number = 50) => {
            if (text.length <= maxLength) return text;
            return text.substring(0, maxLength) + '...';
        };

        switch (notif.type) {
            case 'like':
                return <span>{usernameElement} liked your post</span>;
            case 'comment':
                // Check if this is a reply to a comment
                if (notif.parent_comment_id && notif.parent_comment_content) {
                    const truncatedParentComment = truncateText(notif.parent_comment_content, 30);
                    return (
                        <span>
                            {usernameElement} replied to your comment{' '}
                            <span className="italic text-muted-foreground">
                                "{truncatedParentComment}"
                            </span>
                        </span>
                    );
                }
                // Regular comment on post
                if (notif.comment_content) {
                    const truncatedComment = truncateText(notif.comment_content);
                    return (
                        <span>
                            {usernameElement} commented{' '}
                            <span className="italic text-muted-foreground">
                                "{truncatedComment}"
                            </span>
                            {' '}on your post
                        </span>
                    );
                }
                // Fallback if no comment content
                return <span>{usernameElement} commented on your post</span>;
            case 'follow':
                return <span>{usernameElement} followed you</span>;
            default:
                return 'New interaction';
        }
    };

    return (
        <div className="space-y-3">
            {notifications.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 opacity-40">
                    <BellOff className="w-8 h-8 mb-2" />
                    <p className="text-xs uppercase tracking-widest font-medium">All caught up</p>
                </div>
            )}

            <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto scrollbar-hide">
                {notifications.map((notif) => (
                    <div
                        key={notif.id}
                        onClick={() => {
                            if (!notif.is_read) handleMarkAsRead(notif.id);

                            if (notif.type === 'follow') {
                                navigate(`/profile/${notif.related_user_name}`);
                            } else if (notif.type === 'like') {
                                // Open post in dialog
                                setSelectedPostId(notif.related_entity_id);
                                setOpenCommentsOnPost(false);
                                setShowPostDialog(true);
                            } else if (notif.type === 'comment') {
                                // Open post in dialog with comments expanded
                                setSelectedPostId(notif.related_entity_id);
                                setOpenCommentsOnPost(true);
                                setShowPostDialog(true);
                            }
                        }}
                        className={cn(
                            "group relative flex gap-3 p-3 rounded-xl transition-all cursor-pointer border border-transparent",
                            notif.is_read
                                ? "bg-transparent hover:bg-secondary/30"
                                : "bg-primary/5 hover:bg-primary/10 border-primary/20 shadow-sm"
                        )}
                    >
                        <div className="relative flex-shrink-0">
                            {notif.related_user_avatar ? (
                                <img
                                    src={notif.related_user_avatar}
                                    alt={notif.related_user_name}
                                    className="w-10 h-10 rounded-full object-cover border border-border/50"
                                />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground border border-border/50">
                                    {notif.related_user_name[0]?.toUpperCase()}
                                </div>
                            )}
                            <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-1 border border-border/50">
                                {getNotificationIcon(notif.type)}
                            </div>
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="text-xs text-muted-foreground leading-snug mb-1">
                                {getNotificationText(notif)}
                            </div>
                            <span className="text-[10px] text-muted-foreground/60 uppercase tracking-tight">
                                {formatNotificationDate(notif.created_at)}
                            </span>
                        </div>

                        {!notif.is_read && (
                            <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                        )}
                    </div>
                ))}
            </div>

            {/* Post Detail Dialog */}
            <PostDetailDialog
                postId={selectedPostId}
                open={showPostDialog}
                onOpenChange={setShowPostDialog}
                initialShowComments={openCommentsOnPost}
            />
        </div>
    );
};
