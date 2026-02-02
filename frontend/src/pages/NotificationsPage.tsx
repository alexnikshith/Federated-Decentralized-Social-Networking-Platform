import React, { useEffect } from 'react';
import { NotificationList } from '../../epics/content-sharing/components/NotificationList';
import { Button } from '@/components/ui/button';
import { useContentStore } from '../../epics/content-sharing/store/contentStore';
import { CheckCheck } from 'lucide-react';

export const NotificationsPage = () => {
    const { markAllAsRead, unreadCount } = useContentStore();

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
                <NotificationList />
            </div>
        </div>
    );
};
