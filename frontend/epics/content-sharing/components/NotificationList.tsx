import React, { useEffect } from 'react';
import { useContentStore } from '../store/contentStore';

export const NotificationList: React.FC = () => {
    const { notifications, unreadCount, fetchNotifications, markAsRead, fetchUnreadCount } =
        useContentStore();

    useEffect(() => {
        fetchNotifications();
        fetchUnreadCount();
    }, []);

    const handleMarkAsRead = (notificationId: string) => {
        markAsRead(notificationId);
    };

    const getNotificationText = (notif: any) => {
        switch (notif.type) {
            case 'like':
                return `${notif.related_user_name} liked your post`;
            case 'comment':
                return `${notif.related_user_name} commented on your post`;
            case 'follow':
                return `${notif.related_user_name} started following you`;
            default:
                return 'New notification';
        }
    };

    return (
        <div className="notification-list">
            <div className="notification-header">
                <h3>Notifications</h3>
                {unreadCount > 0 && <span className="unread-badge">{unreadCount}</span>}
            </div>

            <div className="notifications">
                {notifications.length === 0 && (
                    <div className="no-notifications">No notifications yet</div>
                )}
                {notifications.map((notif) => (
                    <div
                        key={notif.id}
                        className={`notification-item ${notif.is_read ? 'read' : 'unread'}`}
                        onClick={() => !notif.is_read && handleMarkAsRead(notif.id)}
                    >
                        <div className="notification-content">
                            {notif.related_user_avatar && (
                                <img
                                    src={notif.related_user_avatar}
                                    alt={notif.related_user_name}
                                    className="avatar-small"
                                />
                            )}
                            {!notif.related_user_avatar && (
                                <div className="avatar-small-placeholder">
                                    {notif.related_user_name[0]?.toUpperCase()}
                                </div>
                            )}
                            <div className="notification-text">
                                <p>{getNotificationText(notif)}</p>
                                <span className="notification-time">
                                    {new Date(notif.created_at).toLocaleString()}
                                </span>
                            </div>
                        </div>
                        {!notif.is_read && <div className="unread-indicator">•</div>}
                    </div>
                ))}
            </div>
        </div>
    );
};
