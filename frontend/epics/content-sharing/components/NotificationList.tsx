import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContentStore } from '../store/contentStore';
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

    const getNotificationText = (notif: any) => {
        switch (notif.type) {
            case 'like':
                return <span><b className="text-foreground">{notif.related_user_name}</b> liked your post</span>;
            case 'comment':
                return <span><b className="text-foreground">{notif.related_user_name}</b> commented on your post</span>;
            case 'follow':
                return <span><b className="text-foreground">{notif.related_user_name}</b> followed you</span>;
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
                            navigate(`/profile/${notif.related_user_name}`);
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
                                {new Date(notif.created_at).toLocaleDateString()}
                            </span>
                        </div>

                        {!notif.is_read && (
                            <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
