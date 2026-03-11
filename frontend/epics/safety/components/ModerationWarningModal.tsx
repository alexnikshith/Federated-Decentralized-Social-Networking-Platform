import React, { useState, useEffect } from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuthStore } from '../../identity/store/authStore';
import { getMyModerationLogs } from '../api/client';
import { ModerationLog } from '../types';
import { useNavigate } from 'react-router-dom';
import { IconAlertTriangle, IconGavel } from '@tabler/icons-react';

const ModerationWarningModal: React.FC = () => {
    const { user, isAuthenticated } = useAuthStore();
    const [latestLog, setLatestLog] = useState<ModerationLog | null>(null);
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (isAuthenticated && user) {
            const checkModeration = async () => {
                try {
                    const logs = await getMyModerationLogs();
                    if (logs.length > 0) {
                        // Sort by created_at desc
                        const sortedLogs = logs.sort((a, b) =>
                            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                        );
                        const mostRecent = sortedLogs[0];

                        // Check if this log has been acknowledged (using localStorage for simplicity)
                        const lastAck = localStorage.getItem(`mod_ack_${user.id}`);
                        if (!lastAck || new Date(mostRecent.created_at).getTime() > parseInt(lastAck)) {
                            setLatestLog(mostRecent);
                            if (mostRecent.is_violation) {
                                setOpen(true);
                            }
                        }
                    }
                } catch (err) {
                    console.error("Failed to check moderation status:", err);
                }
            };

            // Periodic check every 2 minutes
            checkModeration();
            const interval = setInterval(checkModeration, 120000);
            return () => clearInterval(interval);
        }
    }, [isAuthenticated, user]);

    const handleAcknowledge = () => {
        if (user && latestLog) {
            localStorage.setItem(`mod_ack_${user.id}`, new Date(latestLog.created_at).getTime().toString());
        }
        setOpen(false);
    };

    if (!latestLog) return null;

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogContent className="max-w-md bg-gray-900 border-red-500/30 text-white">
                <AlertDialogHeader>
                    <div className="flex items-center gap-3 mb-2 text-red-400">
                        <IconGavel size={32} />
                        <AlertDialogTitle className="text-2xl font-bold">Moderation Action</AlertDialogTitle>
                    </div>
                    <AlertDialogDescription className="text-gray-300 text-lg">
                        Our AI Moderator system has detected a violation of our community guidelines in your recent activity.
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="my-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                    <div className="flex items-start gap-3">
                        <IconAlertTriangle className="text-red-500 mt-1 shrink-0" size={20} />
                        <div>
                            <p className="font-semibold text-red-200">Action: {latestLog.action_taken}</p>
                            <p className="text-sm text-gray-400 mt-1 italic">"{latestLog.content}"</p>
                            <p className="text-sm text-red-300 mt-2 font-medium">Reason: {latestLog.reason}</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-3 text-sm text-gray-400">
                    <p>Your content was removed to maintain community safety. Repeat violations will result in account strikes and eventual suspension.</p>
                    <button
                        onClick={() => {
                            handleAcknowledge();
                            navigate('/guidelines');
                        }}
                        className="text-blue-400 hover:text-blue-300 underline font-medium"
                    >
                        Read our Community Guidelines
                    </button>
                </div>

                <AlertDialogFooter>
                    <AlertDialogAction
                        onClick={handleAcknowledge}
                        className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-8"
                    >
                        I Understand
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

export default ModerationWarningModal;
