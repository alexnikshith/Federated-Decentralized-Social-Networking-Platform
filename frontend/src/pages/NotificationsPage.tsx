import React, { useEffect, useState } from 'react';
import { NotificationList } from '../../epics/content-sharing/components/NotificationList';
import { Button } from '@/components/ui/button';
import { useContentStore } from '../../epics/content-sharing/store/contentStore';
import { CheckCheck } from 'lucide-react';
import { NotificationsSkeleton } from '@/components/skeletons/page-skeletons';

export const NotificationsPage = () => {
    const { fetchNotifications, fetchUnreadCount, markAllAsRead, unreadCount, loading, error, markAsRead } = useContentStore();

    useEffect(() => {
        fetchNotifications();
        fetchUnreadCount();
    }, []);

    const handleMarkAsRead = (notificationId: string) => {
        markAsRead(notificationId);
    };

    return (
        <div className='container mx-auto py-8 max-w-2xl'>
            <div className="flex items-center justify-between mb-6">
                <h1 className='text-3xl font-display font-bold text-gradient-gold'>Notifications</h1>
                {unreadCount > 0 && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => markAllAsRead()}
                        className="gap-2 text-muted-foreground hover:text-primary"
                    >
                        <CheckCheck className="w-4 h-4" />
                        Mark all as read
                    </Button>
                )}
            </div>
            <div className='glass-card rounded-xl p-0 md:p-2'>
                {error ? (
                    <div className="flex flex-col items-center justify-center py-8 text-destructive">
                        <p>{error}</p>
                    </div>
                ) : loading ? <NotificationsSkeleton /> : <NotificationList />}
            </div>
        </div>
    );
};
