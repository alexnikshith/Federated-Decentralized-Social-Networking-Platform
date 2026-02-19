import React from 'react';
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
import { Globe, Link as LinkIcon, X } from 'lucide-react';
import { Link } from 'react-router-dom';

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
    // Helper to render content with clickable mentions
    const renderContentWithMentions = (content: string) => {
        const parts = content.split(/(@\w+)/g);
        return parts.map((part, index) => {
            if (part.startsWith('@')) {
                const username = part.substring(1);
                // Simple validation check, similar to PostCard
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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="w-[50vw] max-w-[50vw] h-[70vh] max-h-[70vh] p-0 gap-0 overflow-hidden flex flex-col bg-card border-border/50 shadow-2xl"
                // Prevent auto-focus on the first focusable element to avoid jumping
                onOpenAutoFocus={(e) => e.preventDefault()}
            >
                <DialogHeader className="p-4 border-b border-border/50 shrink-0">
                    <DialogTitle className="font-display text-xl flex items-center gap-2">
                        Post & Comments
                    </DialogTitle>
                </DialogHeader>

                <ScrollArea className="flex-1 w-full">
                    <div className="p-6 space-y-6">
                        {/* Post Section */}
                        <div className="space-y-4">
                            {/* Author Info */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Link
                                        to={`/profile/${post.author_name}`}
                                        className="relative group/avatar"
                                        onClick={() => onOpenChange(false)}
                                    >
                                        <Avatar className="w-10 h-10 border border-border/50">
                                            <AvatarImage src={post.author_avatar} alt={post.author_name} />
                                            <AvatarFallback>{post.author_name[0]?.toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                    </Link>

                                    <div>
                                        <div className="flex items-center gap-2">
                                            <Link
                                                to={`/profile/${post.author_name}`}
                                                className="font-bold text-foreground hover:underline"
                                                onClick={() => onOpenChange(false)}
                                            >
                                                {post.author_name}
                                            </Link>
                                            <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-full bg-secondary/80 border border-border/50">
                                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">
                                                    {post.author_instance || 'nexus.social'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span>{timeAgo(post.created_at)}</span>
                                            <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground" />
                                            <Globe className="w-3 h-3" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Post Content */}
                            <div className="text-foreground/90 leading-relaxed whitespace-pre-wrap font-sans text-[0.95rem]">
                                {renderContentWithMentions(post.content)}
                            </div>

                            {/* Media - Scaled Down */}
                            {post.media_url && (
                                <div className="rounded-lg overflow-hidden border border-border/50 bg-black/5">
                                    {post.media_type === 'video' ? (
                                        <video
                                            controls
                                            src={post.media_url.startsWith('http') ? post.media_url : `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}${post.media_url}`}
                                            className="w-full max-h-[30vh] object-contain mx-auto"
                                        />
                                    ) : (
                                        <img
                                            src={post.media_url.startsWith('http') ? post.media_url : `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}${post.media_url}`}
                                            alt="Post content"
                                            className="w-full max-h-[30vh] object-contain mx-auto"
                                        />
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Divider */}
                        <div className="h-px w-full bg-border/50" />

                        {/* Comments Section */}
                        <div className="space-y-4">
                            <h3 className="font-display font-bold text-lg flex items-center gap-2">
                                Comments
                                <span className="bg-secondary px-2 py-0.5 rounded-full text-xs text-muted-foreground">
                                    {post.comment_count}
                                </span>
                            </h3>
                            <CommentList postId={post.id} />
                        </div>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
};
