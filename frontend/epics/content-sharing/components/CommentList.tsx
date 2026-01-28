import React, { useState, useEffect } from 'react';
import type { Comment } from '../types';
import * as api from '../api/client';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send } from "lucide-react";
import { useAuthStore } from '../../identity/store/authStore';
import { cn } from "@/lib/utils";

interface CommentListProps {
    postId: string;
}

export const CommentList: React.FC<CommentListProps> = ({ postId }) => {
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const { user } = useAuthStore();

    useEffect(() => {
        loadComments();
    }, [postId]);

    const loadComments = async () => {
        setLoading(true);
        try {
            const data = await api.getComments(postId);
            setComments(data);
        } catch (error) {
            console.error('Failed to load comments:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        setSubmitting(true);
        try {
            await api.createComment(postId, { content: newComment });
            setNewComment('');
            await loadComments();
        } catch (error) {
            console.error('Failed to create comment:', error);
        } finally {
            setSubmitting(false);
        }
    };

    const getTimeAgo = (dateStr: string) => {
        const date = new Date(dateStr);
        const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
        if (seconds < 60) return 'just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
        return date.toLocaleDateString();
    };

    return (
        <div className="space-y-4">
            {/* Comment Form */}
            <div className="flex items-start gap-3">
                <Avatar className="w-8 h-8 cursor-pointer border border-border/50">
                    <AvatarImage src={user?.avatar_url} />
                    <AvatarFallback>{user?.display_name?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || '?'}</AvatarFallback>
                </Avatar>
                <form onSubmit={handleSubmit} className="flex-1 flex gap-2">
                    <Input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Write a comment..."
                        maxLength={1000}
                        disabled={submitting}
                        className="flex-1 bg-secondary/50 border-transparent focus:border-primary/20 focus:bg-background transition-all h-9 rounded-2xl px-4"
                    />
                    {newComment.trim() && (
                        <Button
                            type="submit"
                            disabled={submitting}
                            size="icon"
                            variant="ghost"
                            className="h-9 w-9 rounded-full text-primary hover:bg-primary/10 transition-colors"
                        >
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </Button>
                    )}
                </form>
            </div>

            {/* Comments List */}
            <div className="space-y-4 pl-11">
                {loading && comments.length === 0 ? (
                    <div className="flex justify-center p-4">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                ) : comments.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No comments yet. Be the first to analyze!</p>
                ) : (
                    comments.map((comment, index) => (
                        <div key={comment.id} className="group animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: `${index * 0.05}s` }}>
                            <div className="flex items-start gap-3">
                                <Avatar className="w-8 h-8 border border-border/50 mt-1">
                                    <AvatarImage src={comment.user_avatar} />
                                    <AvatarFallback>{comment.user_name[0]?.toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 space-y-1">
                                    <div className="bg-secondary/30 rounded-2xl px-4 py-2 inline-block min-w-[120px]">
                                        <div className="flex items-center justify-between gap-4 mb-0.5">
                                            <span className="text-sm font-bold text-foreground">
                                                {comment.user_name}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground">
                                                {getTimeAgo(comment.created_at)}
                                            </span>
                                        </div>
                                        <p className="text-sm text-foreground/90 leading-relaxed break-words whitespace-pre-wrap">
                                            {comment.content}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
