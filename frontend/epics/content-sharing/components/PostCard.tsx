import React, { useState } from 'react';
import { Link } from 'react-router-dom';
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
    ExternalLink,
    Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getPostLikers } from '../api/client';
import type { PostLiker } from '../types';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface PostCardProps {
    post: Post;
}

export const PostCard: React.FC<PostCardProps> = ({ post }) => {
    const [showComments, setShowComments] = useState(false);
    const [showLikers, setShowLikers] = useState(false);
    const [likers, setLikers] = useState<PostLiker[]>([]);
    const [isLoadingLikers, setIsLoadingLikers] = useState(false);

    const { likePost, unlikePost, deletePost } = useContentStore();
    const { user } = useAuthStore();

    const fetchLikers = async () => {
        if (!showLikers) {
            setIsLoadingLikers(true);
            try {
                const data = await getPostLikers(post.id);
                setLikers(data);
            } catch (error) {
                console.error('Failed to fetch likers:', error);
            } finally {
                setIsLoadingLikers(false);
            }
        }
        setShowLikers(!showLikers);
    };

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
                                <Link to={`/profile/${post.author_name}`} className="font-display font-bold text-foreground text-lg tracking-tight leading-tight hover:underline">
                                    {post.author_name}
                                </Link>
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
                    <div className="flex items-center">
                        <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                                "group/like gap-2.5 px-3 py-1.5 h-auto rounded-l-full transition-all duration-300",
                                post.is_liked ? "text-destructive bg-destructive/5" : "text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                            )}
                            onClick={handleLike}
                        >
                            <Heart className={cn("w-4.5 h-4.5 transition-transform duration-300 group-active/like:scale-125", post.is_liked && "fill-current")} />
                            <span className="font-bold text-xs">{post.like_count}</span>
                        </Button>

                        {isOwner && post.like_count > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto py-1.5 px-2 rounded-r-full text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all border-l border-border/10"
                                onClick={fetchLikers}
                                title="View who liked this post"
                            >
                                <Users className="w-3.5 h-3.5" />
                            </Button>
                        )}
                    </div>

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

            <Dialog open={showLikers} onOpenChange={setShowLikers}>
                <DialogContent className="sm:max-w-md bg-card border-border/50">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 font-display text-xl">
                            <Heart className="w-5 h-5 text-destructive fill-destructive" />
                            Liked by
                        </DialogTitle>
                    </DialogHeader>

                    <div className="mt-4 max-h-[60vh] overflow-y-auto px-1 space-y-4">
                        {isLoadingLikers ? (
                            <div className="flex flex-col items-center py-10 gap-3 text-muted-foreground">
                                <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                                <p className="text-sm font-medium">Loading likers...</p>
                            </div>
                        ) : likers.length > 0 ? (
                            likers.map((liker) => (
                                <Link
                                    key={liker.user_id}
                                    to={`/profile/${liker.user_name}`}
                                    className="flex items-center gap-3 p-2 rounded-xl border border-transparent hover:border-border/50 hover:bg-secondary/50 transition-all group"
                                    onClick={() => setShowLikers(false)}
                                >
                                    {liker.user_avatar ? (
                                        <img src={liker.user_avatar} alt={liker.user_name} className="w-10 h-10 rounded-full object-cover ring-1 ring-border group-hover:ring-primary/30" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground font-bold border border-border group-hover:border-primary/30">
                                            {liker.user_name[0]?.toUpperCase()}
                                        </div>
                                    )}
                                    <div className="flex flex-col">
                                        <span className="font-bold text-foreground group-hover:text-primary transition-colors">@{liker.user_name}</span>
                                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">User</span>
                                    </div>
                                    <Button variant="ghost" size="icon" className="ml-auto h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                        <ExternalLink className="w-3.5 h-3.5" />
                                    </Button>
                                </Link>
                            ))
                        ) : (
                            <div className="flex flex-col items-center py-10 gap-3 text-muted-foreground opacity-60">
                                <Users className="w-12 h-12" />
                                <p className="text-sm">No likes yet</p>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
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
