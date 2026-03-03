import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CommentList } from './CommentList';
import type { Post } from '../types';
import { cn } from '@/lib/utils';
import { Globe, Send, Loader2, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuthStore } from '../../identity/store/authStore';
import * as api from '../api/client';

interface CommentsModalProps {
    post: Post;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const CommentsModal: React.FC<CommentsModalProps> = ({
    post,
    open,
    onOpenChange
}) => {
    const { user } = useAuthStore();
    const [newComment, setNewComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [replyingTo, setReplyingTo] = useState<{ id: string, username: string } | null>(null);

    // Helper to render content with clickable mentions
    const renderContentWithMentions = (content: string) => {
        const parts = content.split(/(@\w+)/g);
        return parts.map((part, index) => {
            if (part.startsWith('@')) {
                const username = part.substring(1);
                const isValidMention = post.mentioned_usernames?.some(u => u.toLowerCase() === username.toLowerCase());

                if (!isValidMention) return part;

                return (
                    <Link
                        key={index}
                        to={`/profile/${username}`}
                        className="text-primary hover:underline font-bold transition-all"
                        onClick={(e) => {
                            e.stopPropagation();
                            onOpenChange(false);
                        }}
                    >
                        {part}
                    </Link>
                );
            }
            return part;
        });
    };

    const timeAgo = (dateStr: string) => {
        const date = new Date(dateStr);
        const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
        if (seconds < 60) return 'just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
        return date.toLocaleDateString();
    };

    const handleReply = (commentId: string, username: string) => {
        setReplyingTo({ id: commentId, username });
    };

    const cancelReply = () => {
        setReplyingTo(null);
        setNewComment('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        setSubmitting(true);
        try {
            await api.createComment(post.id, {
                content: newComment,
                parent_id: replyingTo?.id
            });
            setNewComment('');
            setReplyingTo(null);
            setRefreshTrigger(prev => prev + 1);
        } catch (error) {
            console.error('Failed to create comment:', error);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="w-[80vw] max-w-[80vw] h-[95vh] max-h-[95vh] p-0 gap-0 overflow-hidden flex flex-row bg-card border-border/50 shadow-2xl rounded-2xl fixed left-[50%] top-[50%] -translate-x-1/2 -translate-y-1/2 z-[100] data-[state=open]:slide-in-from-bottom-10 data-[state=closed]:slide-out-to-bottom-10"
                onOpenAutoFocus={(e) => e.preventDefault()}
            >
                {/* LEFT COLUMN: Post Content (Fixed/Scrollable) */}
                <div className="w-1/2 border-r border-border/50 flex flex-col bg-secondary/5">
                    <ScrollArea className="flex-1 w-full h-full">
                        <div className="p-6 flex flex-col justify-center min-h-full">
                            <div className="flex items-start gap-4">
                                <Avatar className="w-10 h-10 border border-border/50 shrink-0">
                                    <AvatarImage src={post.author_avatar} />
                                    <AvatarFallback>{post.author_name[0]}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-bold text-base truncate">{post.author_name}</span>
                                        <span className="text-xs text-muted-foreground">{timeAgo(post.created_at)}</span>
                                    </div>
                                    <div className="text-sm text-foreground/90 leading-relaxed mb-4 whitespace-pre-wrap font-sans">
                                        {renderContentWithMentions(post.content)}
                                    </div>

                                    {/* Full Size Media in Left Column */}
                                    {post.media_url && (
                                        <div className="rounded-xl overflow-hidden border border-border/50 bg-black/5 w-full">
                                            {post.media_type === 'video' ? (
                                                <video controls src={post.media_url.startsWith('http') ? post.media_url : `${import.meta.env.VITE_API_URL || import.meta.env.VITE_COMMUNITY1_URL || 'http://localhost:8080'}${post.media_url}`} className="w-full h-auto object-contain max-h-[70vh]" />
                                            ) : (
                                                <img src={post.media_url.startsWith('http') ? post.media_url : `${import.meta.env.VITE_API_URL || import.meta.env.VITE_COMMUNITY1_URL || 'http://localhost:8080'}${post.media_url}`} alt="Post content" className="w-full h-auto object-contain max-h-[70vh]" />
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </ScrollArea>
                </div>

                {/* RIGHT COLUMN: Comments Section */}
                <div className="w-1/2 flex flex-col h-full bg-card">
                    {/* Header */}
                    <DialogHeader className="p-4 border-b border-border/50 shrink-0 bg-card/50 backdrop-blur-sm z-10 flex items-center justify-center relative">
                        <div className="w-12 h-1 bg-border/50 rounded-full absolute top-2" />
                        <DialogTitle className="font-display text-lg font-bold text-center w-full mt-2">
                            Comments
                        </DialogTitle>
                    </DialogHeader>

                    {/* Scrollable Comments List */}
                    <ScrollArea className="flex-1 w-full bg-background/50">
                        <div className="p-4 pb-20">
                            <CommentList
                                postId={post.id}
                                hideInput={true}
                                refreshTrigger={refreshTrigger}
                                onReply={handleReply}
                            />
                        </div>
                    </ScrollArea>

                    {/* Footer Input */}
                    <div className="p-3 border-t border-border/50 bg-card shrink-0">
                        {/* Reply Context Indicator */}
                        {replyingTo && (
                            <div className="flex items-center justify-between bg-secondary/30 px-3 py-1.5 rounded-t-lg text-xs border-x border-t border-border/50 mb-1 mx-2 animate-in slide-in-from-bottom-2 fade-in">
                                <span className="text-muted-foreground">
                                    Replying to <span className="font-bold text-primary">@{replyingTo.username}</span>
                                </span>
                                <button onClick={cancelReply} className="text-muted-foreground hover:text-foreground">
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        )}

                        <div className="flex items-center gap-2 mb-2 px-1">
                            {/* Reaction Suggestions */}
                            <div
                                className="flex gap-2 text-xl overflow-x-auto py-1 w-full"
                                style={{
                                    scrollbarWidth: 'none',
                                    msOverflowStyle: 'none'
                                }}
                            >
                                <style>{`
                                    .no-scrollbar::-webkit-scrollbar {
                                        display: none;
                                    }
                                `}</style>
                                <div className="flex gap-3 no-scrollbar overflow-x-auto w-full px-1">
                                    {['❤️', '🙌', '🔥', '👏', '😢', '😍', '😮', '😂'].map(emoji => (
                                        <button
                                            key={emoji}
                                            onClick={() => setNewComment(prev => prev + emoji)}
                                            className="hover:scale-125 transition-transform cursor-pointer"
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="flex items-center gap-3 bg-secondary/30 rounded-full px-2 py-1 border border-border/50 focus-within:border-primary/50 focus-within:bg-secondary/50 transition-all">
                            <Avatar className="w-8 h-8 shrink-0">
                                <AvatarImage src={user?.avatar_url} />
                                <AvatarFallback>{user?.display_name?.[0]?.toUpperCase() || '?'}</AvatarFallback>
                            </Avatar>
                            <Input
                                type="text"
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder={replyingTo ? `Reply to @${replyingTo.username}...` : `Add a comment...`}
                                maxLength={1000}
                                disabled={submitting}
                                autoFocus={!!replyingTo}
                                className="flex-1 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 h-10 placeholder:text-muted-foreground/70"
                            />
                            <Button
                                type="submit"
                                disabled={submitting || !newComment.trim()}
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 rounded-full text-primary hover:bg-primary/10 transition-colors"
                            >
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            </Button>
                        </form>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
