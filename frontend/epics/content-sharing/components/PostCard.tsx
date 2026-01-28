import React, { useState } from 'react';
import type { Post } from '../types';
import { useContentStore } from '../store/contentStore';
import { CommentList } from './CommentList';
import { useAuthStore } from '../../identity/store/authStore';
import {
    Heart,
    MessageSquare,
    Trash2,
    Share2,
    MoreHorizontal,
    Globe,
    ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PostCardProps {
    post: Post;
}

export const PostCard: React.FC<PostCardProps> = ({ post }) => {
    const [showComments, setShowComments] = useState(false);
    const { likePost, unlikePost, deletePost } = useContentStore();
    const { user } = useAuthStore();

    const handleLike = () => {
        if (post.is_liked) {
            unlikePost(post.id);
        } else {
            likePost(post.id);
        }
    };

    const handleDelete = () => {
        if (window.confirm('Are you sure you want to delete this post?')) {
            deletePost(post.id);
        }
    };

    const isOwner = user?.id === post.author_id;
    const timeAgo = getTimeAgo(new Date(post.created_at));

    return (
        <div className="post-item animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="p-6">
                <div className="flex items-start justify-between mb-5">
                    <div className="flex items-center gap-4">
                        <div className="relative group/avatar">
                            {post.author_avatar ? (
                                <img src={post.author_avatar} alt={post.author_name} className="w-12 h-12 rounded-full object-cover ring-2 ring-transparent group-hover/avatar:ring-primary/30 transition-all" />
                            ) : (
                                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-muted-foreground font-display font-bold text-lg border border-border/50 group-hover/avatar:border-primary/30 transition-all">
                                    {post.author_name[0]?.toUpperCase()}
                                </div>
                            )}
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-background border border-border flex items-center justify-center shadow-sm">
                                <Globe className="w-3 h-3 text-accent" />
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-display font-bold text-foreground text-lg tracking-tight leading-tight">
                                    {post.author_name}
                                </span>
                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-secondary/80 border border-border/50">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">
                                        {post.author_instance || 'nexus.social'}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-muted-foreground font-medium">{timeAgo}</span>
                                <span className="w-1 h-1 rounded-full bg-border" />
                                <span className="text-[10px] text-muted-foreground/60 uppercase tracking-tighter">Public</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        {isOwner ? (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors rounded-xl"
                                onClick={handleDelete}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        ) : (
                            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground rounded-xl">
                                <MoreHorizontal className="w-4 h-4" />
                            </Button>
                        )}
                    </div>
                </div>

                <div className="post-content-area mb-6">
                    <p className="text-[1.05rem] text-foreground/90 leading-relaxed whitespace-pre-wrap font-sans">
                        {post.content}
                    </p>
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-border/20">
                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                            "group/like gap-2.5 px-3 py-1.5 h-auto rounded-full transition-all duration-300",
                            post.is_liked ? "text-destructive bg-destructive/5" : "text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                        )}
                        onClick={handleLike}
                    >
                        <Heart className={cn("w-4.5 h-4.5 transition-transform duration-300 group-active/like:scale-125", post.is_liked && "fill-current")} />
                        <span className="font-bold text-xs">{post.like_count}</span>
                    </Button>

                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                            "group/comment gap-2.5 px-3 py-1.5 h-auto rounded-full transition-all duration-300",
                            showComments ? "text-primary bg-primary/5" : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                        )}
                        onClick={() => setShowComments(!showComments)}
                    >
                        <MessageSquare className="w-4.5 h-4.5" />
                        <span className="font-bold text-xs">{post.comment_count}</span>
                    </Button>

                    <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-muted-foreground hover:text-accent hover:bg-accent/5 rounded-full ml-auto">
                        <Share2 className="w-4 h-4" />
                    </Button>

                    <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full">
                        <ExternalLink className="w-4 h-4" />
                    </Button>
                </div>

                {showComments && (
                    <div className="mt-4 pt-5 border-t border-border/20 animate-in fade-in slide-in-from-top-2 duration-300">
                        <CommentList postId={post.id} />
                    </div>
                )}
            </div>
        </div>
    );
};

function getTimeAgo(date: Date): string {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
}
