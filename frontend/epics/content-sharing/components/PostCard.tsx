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
    Users,
    AlertTriangle,
    Bookmark,
    ThumbsUp,
    ThumbsDown,
    Flag,
    MoreVertical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { cn } from '@/lib/utils';
import { getPostLikers } from '../api/client';
import type { PostLiker } from '../types';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { showToast } from "@/lib/toast";

interface PostCardProps {
    post: Post;
    initialShowComments?: boolean;
    onLikeToggle?: () => void;
}

export const PostCard: React.FC<PostCardProps> = ({ post, initialShowComments = false, onLikeToggle }) => {
    const [showComments, setShowComments] = useState(initialShowComments);
    const [showLikers, setShowLikers] = useState(false);
    const [likers, setLikers] = useState<PostLiker[]>([]);
    const [isLoadingLikers, setIsLoadingLikers] = useState(false);
    const [showDeleteAlert, setShowDeleteAlert] = useState(false);
    const [showReportDialog, setShowReportDialog] = useState(false);
    const [reportReason, setReportReason] = useState('');
    const [isReporting, setIsReporting] = useState(false);

    const {
        likePost,
        unlikePost,
        deletePost,
        savePost,
        unsavePost,
        reportPost,
        interactPost
    } = useContentStore();
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
        if (onLikeToggle) {
            onLikeToggle();
        }
    };

    const handleDelete = async () => {
        try {
            await deletePost(post.id);
            setShowDeleteAlert(false);
            showToast.postDeleted();
        } catch (error) {
            showToast.error("Failed to delete post", "Please try again later.");
        }
    };

    const handleSave = async () => {
        try {
            if (post.is_saved) {
                await unsavePost(post.id);
                showToast.success("Removed from saved posts");
            } else {
                await savePost(post.id);
                showToast.success("Post saved to profile");
            }
        } catch (error) {
            showToast.error("Failed to update saved status");
        }
    };

    const handleReport = async () => {
        if (!reportReason.trim()) return;
        setIsReporting(true);
        try {
            await reportPost(post.id, reportReason);
            setShowReportDialog(false);
            setReportReason('');
            showToast.success("Post reported", "Moderators will review it soon.");
        } catch (error) {
            showToast.error("Failed to submit report");
        } finally {
            setIsReporting(false);
        }
    };

    const handleInteraction = async (type: 'interested' | 'not_interested') => {
        try {
            await interactPost(post.id, type);
            if (type === 'not_interested') {
                showToast.success("Post hidden", "We'll show you less content like this.");
            } else {
                showToast.success("Preference noted", "We'll show you more similar content.");
            }
        } catch (error) {
            showToast.error("Failed to update preference");
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
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground transition-colors rounded-xl">
                                    <MoreHorizontal className="w-4 h-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 bg-card border-border/50 backdrop-blur-md">
                                <DropdownMenuItem onClick={handleSave} className="gap-2 cursor-pointer">
                                    <Bookmark className={cn("w-4 h-4", post.is_saved && "fill-primary text-primary")} />
                                    <span>{post.is_saved ? 'Unsave Post' : 'Save Post'}</span>
                                </DropdownMenuItem>

                                <DropdownMenuItem onClick={() => handleInteraction('interested')} className="gap-2 cursor-pointer">
                                    <ThumbsUp className="w-4 h-4" />
                                    <span>Interested</span>
                                </DropdownMenuItem>

                                <DropdownMenuItem onClick={() => handleInteraction('not_interested')} className="gap-2 cursor-pointer">
                                    <ThumbsDown className="w-4 h-4" />
                                    <span>Not Interested</span>
                                </DropdownMenuItem>

                                <DropdownMenuSeparator className="bg-border/50" />

                                <DropdownMenuItem onClick={() => setShowReportDialog(true)} className="gap-2 text-orange-500 focus:text-orange-500 cursor-pointer">
                                    <Flag className="w-4 h-4" />
                                    <span>Report Post</span>
                                </DropdownMenuItem>

                                {isOwner && (
                                    <>
                                        <DropdownMenuSeparator className="bg-border/50" />
                                        <DropdownMenuItem onClick={() => setShowDeleteAlert(true)} className="gap-2 text-destructive focus:text-destructive cursor-pointer">
                                            <Trash2 className="w-4 h-4" />
                                            <span>Delete Post</span>
                                        </DropdownMenuItem>
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
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

            {/* Delete Confirmation Alert */}
            <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
                <AlertDialogContent className="max-w-md">
                    <AlertDialogHeader>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                                <AlertTriangle className="h-6 w-6 text-destructive" />
                            </div>
                            <AlertDialogTitle className="text-xl">Delete Post?</AlertDialogTitle>
                        </div>
                        <AlertDialogDescription className="text-base leading-relaxed">
                            This action cannot be undone. Your post will be permanently deleted from the platform.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete Post
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Report Dialog */}
            <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
                <DialogContent className="sm:max-w-md bg-card border-border/50">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 font-display text-xl">
                            <Flag className="w-5 h-5 text-orange-500" />
                            Report Post
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <p className="text-sm text-muted-foreground">
                            Help us understand what's wrong with this post. Your report is anonymous.
                        </p>
                        <Textarea
                            placeholder="Reason for reporting (e.g., spam, harassment, inappropriate content...)"
                            value={reportReason}
                            onChange={(e) => setReportReason(e.target.value)}
                            className="min-h-[120px] bg-secondary/30 border-border/50 focus:ring-primary/20"
                        />
                    </div>
                    <div className="flex justify-end gap-3">
                        <Button variant="ghost" onClick={() => setShowReportDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="default"
                            onClick={handleReport}
                            disabled={!reportReason.trim() || isReporting}
                            className="bg-orange-500 hover:bg-orange-600 text-white"
                        >
                            {isReporting ? 'Submitting...' : 'Submit Report'}
                        </Button>
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
