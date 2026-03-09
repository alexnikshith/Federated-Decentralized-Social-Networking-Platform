import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ShieldAlert, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { ModerationLog } from '../../safety/types';
import { getAllModerationLogs } from '../../safety/api/client';
import { format } from 'date-fns';

const ModerationLogs: React.FC = () => {
    const [logs, setLogs] = useState<ModerationLog[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLogs = async () => {
        try {
            const data = await getAllModerationLogs();
            setLogs(data);
        } catch (err) {
            toast.error("Failed to fetch moderation logs");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const getStatusInfo = (log: ModerationLog) => {
        if (log.reason?.includes("AI Evaluation Error")) {
            return {
                icon: <AlertCircle className="h-4 w-4 text-warning" />,
                text: "Error",
                className: "text-amber-500 font-medium"
            };
        }
        if (log.is_violation) {
            return {
                icon: <XCircle className="h-4 w-4 text-destructive" />,
                text: "Violation",
                className: "text-destructive font-medium"
            };
        }
        return {
            icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
            text: "Approved",
            className: "text-green-500"
        };
    };

    const getTargetBadge = (type: string) => {
        switch (type) {
            case 'post':
                return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">Post</Badge>;
            case 'comment':
                return <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">Comment</Badge>;
            default:
                return <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">{type}</Badge>;
        }
    };

    return (
        <Card className="bg-card/20 border-border/40">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                        <ShieldAlert className="text-primary" />
                        AI Moderation History
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">Real-time log of AI moderation decisions across the platform.</p>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Status</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Content Snippet</TableHead>
                            <TableHead>Reason / Decision</TableHead>
                            <TableHead>Action</TableHead>
                            <TableHead className="text-right">Timestamp</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-10">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                                        <p className="text-sm text-muted-foreground">Loading logs...</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : logs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                                    No moderation logs found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            logs.map((log) => (
                                <TableRow key={log.id} className="group hover:bg-muted/30 transition-colors">
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {getStatusInfo(log).icon}
                                            <span className={getStatusInfo(log).className}>
                                                {getStatusInfo(log).text}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{getTargetBadge(log.target_type)}</TableCell>
                                    <TableCell className="max-w-[200px]">
                                        <p className="text-sm truncate font-mono text-foreground/70" title={log.content}>
                                            {log.content || "(No content)"}
                                        </p>
                                    </TableCell>
                                    <TableCell className="max-w-[300px]">
                                        <div className="space-y-1">
                                            <p className="text-xs text-muted-foreground leading-relaxed italic line-clamp-2">
                                                {log.reason || "No automated reason provided"}
                                            </p>
                                            {log.bad_words_found && log.bad_words_found.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {log.bad_words_found.map((word, i) => (
                                                        <span key={i} className="px-1.5 py-0.5 rounded text-[9px] bg-red-500/10 text-red-500 border border-red-500/20 font-bold uppercase">
                                                            {word}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={log.action_taken === 'none' ? 'secondary' : 'destructive'} className="uppercase text-[10px] font-bold tracking-wider">
                                            {log.action_taken}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right text-xs text-muted-foreground font-mono">
                                        {format(new Date(log.created_at), 'MMM dd, HH:mm:ss')}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};

export default ModerationLogs;
