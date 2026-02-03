import React, { useState, useEffect } from 'react';
import type { Comment } from '../types';
import * as api from '../api/client';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, Trash2 } from "lucide-react";
import { useAuthStore } from '../../identity/store/authStore';
import { cn } from "@/lib/utils";

interface CommentItemProps {
    comment: Comment;
    postId: string;
    onCommentUpdated: () => void;
    isReply?: boolean;
}

const CommentItem: React.FC<CommentItemProps> = ({ comment, postId, onCommentUpdated, isReply = false }) => {
    const [isReplyOpen, setIsReplyOpen] = useState(false);
    const [replyContent, setReplyContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showReplies, setShowReplies] = useState(false);
    const { user } = useAuthStore();

    const handleReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyContent.trim()) return;

        setIsSubmitting(true);
        try {
            await api.createComment(postId, {
                content: replyContent,
                parent_id: comment.id
            });
            setReplyContent('');
            setIsReplyOpen(false);
            setShowReplies(true); // Auto-expand replies after posting
            onCommentUpdated();
        } catch (error) {
            console.error('Failed to post reply:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this comment?')) return;

        setIsDeleting(true);
        try {
            await api.deleteComment(comment.id);
            onCommentUpdated();
        } catch (error) {
            console.error('Failed to delete comment:', error);
            alert(error instanceof Error ? error.message : 'Failed to delete comment');
        } finally {
            setIsDeleting(false);
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

    const canDelete = user?.id === comment.user_id &&
        (new Date().getTime() - new Date(comment.created_at).getTime()) < 120000;

    const replyCount = comment.replies?.length || 0;

    return (
        <div className={cn(
            "animate-in fade-in slide-in-from-bottom-2 duration-300",
            isReply ? "mt-3" : ""
        )}>
            <div className="flex items-start gap-3">
                <Avatar className={cn(
                    "border border-border/50 shrink-0",
                    isReply ? "w-6 h-6 mt-0.5" : "w-8 h-8 mt-1"
                )}>
                    <AvatarImage src={comment.user_avatar} />
                    <AvatarFallback>{comment.user_name[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                    <div className="bg-secondary/30 rounded-2xl px-4 py-2 block w-fit max-w-[95%] min-w-[120px] relative group/bubble">
                        <div className="flex items-center justify-between gap-4 mb-0.5">
                            <span className={cn("font-bold text-foreground", isReply ? "text-[12px]" : "text-sm")}>
                                {comment.user_name}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                                {getTimeAgo(comment.created_at)}
                            </span>
                        </div>
                        <p className={cn("text-foreground/90 leading-relaxed break-words whitespace-pre-wrap", isReply ? "text-xs" : "text-sm")}>
                            {comment.parent_user_name && (
                                <span className="text-primary font-bold mr-1 select-none cursor-pointer hover:underline text-[13px]">
                                    @{comment.parent_user_name}
                                </span>
                            )}
                            {comment.content}
                        </p>
                    </div>
                    <div className="flex items-center gap-4 pl-2">
                        <button
                            className="text-[11px] font-bold text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                            onClick={() => setIsReplyOpen(!isReplyOpen)}
                        >
                            Reply
                        </button>
                        {canDelete && (
                            <button
                                className="text-[11px] font-bold text-muted-foreground hover:text-destructive transition-colors cursor-pointer flex items-center gap-1"
                                onClick={handleDelete}
                                disabled={isDeleting}
                            >
                                {isDeleting ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Trash2 className="w-2.5 h-2.5" />}
                                Delete
                            </button>
                        )}
                        {/* View Replies Button - Instagram Style */}
                        {!isReply && replyCount > 0 && (
                            <button
                                className="text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center gap-1.5"
                                onClick={() => setShowReplies(!showReplies)}
                            >
                                <div className="w-5 h-[1px] bg-muted-foreground/30" />
                                {showReplies ? 'Hide' : 'View'} {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
                            </button>
                        )}
                    </div>

                    {isReplyOpen && (
                        <div className="pt-2 pl-2 max-w-sm">
                            <form onSubmit={handleReply} className="flex gap-2">
                                <Input
                                    type="text"
                                    value={replyContent}
                                    onChange={(e) => setReplyContent(e.target.value)}
                                    placeholder={`Reply to @${comment.user_name}...`}
                                    className="flex-1 bg-secondary/20 border-border/10 h-8 text-xs rounded-xl"
                                    autoFocus
                                    disabled={isSubmitting}
                                />
                                <Button
                                    type="submit"
                                    size="sm"
                                    className="h-8 py-0 px-3 rounded-xl text-[10px] font-bold"
                                    disabled={!replyContent.trim() || isSubmitting}
                                >
                                    {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Post'}
                                </Button>
                            </form>
                        </div>
                    )}

                    {/* Replies - Hidden by default, Instagram style */}
                    {!isReply && showReplies && comment.replies && comment.replies.length > 0 && (
                        <div className="pt-1 space-y-1 ml-1 pl-4 border-l border-border/20">
                            {comment.replies.map(reply => (
                                <CommentItem
                                    key={reply.id}
                                    comment={reply}
                                    postId={postId}
                                    onCommentUpdated={onCommentUpdated}
                                    isReply={true}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

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
                        <CommentItem
                            key={comment.id}
                            comment={comment}
                            postId={postId}
                            onCommentUpdated={loadComments}
                        />
                    ))
                )}
            </div>
        </div>
    );
};
