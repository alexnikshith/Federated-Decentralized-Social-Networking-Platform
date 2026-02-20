import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Post, PublicUser } from '../types';
import { useContentStore } from '../store/contentStore';
import { CommentList } from './CommentList';
import { CommentsModal } from './CommentsModal';
import { useAuthStore } from '../../identity/store/authStore';
import {
    Heart,
    MessageSquare,
    Trash2,
    Share2,
    MoreHorizontal,
    Globe,
    ExternalLink,
    Maximize2,
    Minimize2,
    Users,
    AlertTriangle,
    Bookmark,
    ThumbsUp,
    ThumbsDown,
    Flag,
    Send,
    Check,
    Search,
    X
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
import { Input } from "@/components/ui/input";
import { cn } from '@/lib/utils';
import { getPostLikers, getFollowers } from '../api/client';
import { messagingApi } from '../../messaging/api/client';
import type { PostLiker } from '../types';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
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

// PostCard displays a single post with interactive features (Like, Comment, Share)
interface PostCardProps {
    post: Post;
    initialShowComments?: boolean;
    onLikeToggle?: () => void;
    onPostAction?: (action: 'delete' | 'report' | 'hide', postId: string) => void;
}

export const PostCard: React.FC<PostCardProps> = ({ post, initialShowComments = false, onLikeToggle, onPostAction }) => {
    // UI State
    const [showComments, setShowComments] = useState(initialShowComments);
    const [showCommentsModal, setShowCommentsModal] = useState(false);
    const [showLikers, setShowLikers] = useState(false);
    const [likers, setLikers] = useState<PostLiker[]>([]);
    const [isLoadingLikers, setIsLoadingLikers] = useState(false);
    const [showDeleteAlert, setShowDeleteAlert] = useState(false);
    const [showReportDialog, setShowReportDialog] = useState(false);
    const [reportReason, setReportReason] = useState('');
    const [isReporting, setIsReporting] = useState(false);

    // New Features State
    const [isExpanded, setIsExpanded] = useState(false);
    const [showShareDialog, setShowShareDialog] = useState(false);
    const [followers, setFollowers] = useState<PublicUser[]>([]);
    const [isLoadingFollowers, setIsLoadingFollowers] = useState(false);
    const [selectedFollowerId, setSelectedFollowerId] = useState<string | null>(null);
    const [isSending, setIsSending] = useState(false);
    const [followerSearchQuery, setFollowerSearchQuery] = useState('');

    // Global Stores
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

    // Fetch list of users who liked the post (Lazy load)
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

    // Fetch followers for sharing
    const handleShareClick = async () => {
        setShowShareDialog(true);
        if (followers.length === 0 && user?.id) {
            setIsLoadingFollowers(true);
            try {
                const data = await getFollowers(user.id);
                setFollowers(data);
            } catch (error) {
                showToast.error("Failed to load followers");
            } finally {
                setIsLoadingFollowers(false);
            }
        }
    };

    // Send post to selected follower
    const handleSendShare = async () => {
        if (!selectedFollowerId) return;

        setIsSending(true);
        try {
            await messagingApi.sendMessage({
                receiver_id: selectedFollowerId,
                content: `Check out this post from @${post.author_name}:\n\n"${post.content.substring(0, 100)}${post.content.length > 100 ? '...' : ''}"`,
                type: 'text'
            });
            showToast.success("Post sent successfully!");
            setShowShareDialog(false);
            setSelectedFollowerId(null);
        } catch (error) {
            showToast.error("Failed to send post");
        } finally {
            setIsSending(false);
        }
    };

    // Toggle heart interaction
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

    // Delete post owner action
    const handleDelete = async () => {
        try {
            await deletePost(post.id);
            setShowDeleteAlert(false);
            showToast.postDeleted();
            onPostAction?.('delete', post.id);
        } catch (error) {
            showToast.error("Failed to delete post", "Please try again later.");
        }
    };

    // Save/Bookmark functionality
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

    // Submit a content report
    const handleReport = async () => {
        if (!reportReason.trim()) return;
        setIsReporting(true);
        try {
            await reportPost(post.id, reportReason);
            setShowReportDialog(false);
            setReportReason('');
            showToast.success("Post reported", "Moderators will review it soon.");
            onPostAction?.('report', post.id);
        } catch (error) {
            showToast.error("Failed to submit report");
        } finally {
            setIsReporting(false);
        }
    };

    // Track user interest for feed algorithm
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

    // Filter followers based on search
    const filteredFollowers = followers.filter(f =>
        f.username.toLowerCase().includes(followerSearchQuery.toLowerCase()) ||
        f.display_name.toLowerCase().includes(followerSearchQuery.toLowerCase())
    );

    // Helper to render content with clickable mentions
    const renderContentWithMentions = (content: string) => {
        const parts = content.split(/(@\w+)/g);
        return parts.map((part, index) => {
            if (part.startsWith('@')) {
                const username = part.substring(1);

                // Only highlight if it's a valid mention stored in the post metadata.
                // The backend now populates this field for all posts (including legacy ones).
                const isValidMention = post.mentioned_usernames?.some(u => u.toLowerCase() === username.toLowerCase());

                if (!isValidMention) return part;

                return (
                    <Link
                        key={index}
                        to={`/profile/${username}`}
                        className="text-primary hover:underline font-bold transition-all"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {part}
                    </Link>
                );
            }
            return part;
        });
    };

    return (
        <>
            {/* Main Post Container - Handles Full Screen Logic */}
            <div
                className={cn(
                    "post-item transition-all duration-300",
                    isExpanded
                        ? "fixed inset-0 z-50 bg-background/95 backdrop-blur-md overflow-y-auto p-4 md:p-8 flex items-start justify-center"
                        : "animate-in fade-in slide-in-from-bottom-2 duration-500"
                )}
            >
                <div
                    className={cn(
                        "bg-card rounded-xl transition-all duration-300",
                        isExpanded
                            ? "w-full max-w-4xl mx-auto shadow-2xl border border-border/50 min-h-[50vh]"
                            : "hover:-translate-y-1 hover:shadow-glow-accent hover:border-primary/20"
                    )}
                >
                    <div className="p-6">
                        {/* Header: Author info and Actions */}
                        <div className="flex items-start justify-between mb-5">
                            <div className="flex items-center gap-4">
                                {/* Author Avatar */}
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

                                {/* Author Name and Info */}
                                <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <Link to={`/profile/${post.author_name}`} className="font-display font-bold text-foreground text-lg tracking-tight leading-tight hover:underline">
                                            {post.author_display_name || post.author_name}
                                        </Link>
                                        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent/10 border border-accent/20">
                                            <span className="text-[10px] font-bold text-accent uppercase tracking-widest whitespace-nowrap">
                                                {post.author_instance || 'Nexus Social'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-xs text-muted-foreground font-medium">{timeAgo}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Post Menu Actions */}
                            <div className="flex items-center gap-1">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-9 w-9 text-muted-foreground hover:text-foreground transition-colors rounded-xl"
                                            aria-label="More options"
                                        >
                                            <MoreHorizontal className="w-4 h-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48 bg-card border-border/50 backdrop-blur-md">


                                        <DropdownMenuItem onClick={() => handleInteraction('interested')} className="gap-2 cursor-pointer">
                                            <ThumbsUp className="w-4 h-4" />
                                            <span>Interested</span>
                                        </DropdownMenuItem>

                                        <DropdownMenuItem onClick={() => handleInteraction('not_interested')} className="gap-2 cursor-pointer">
                                            <ThumbsDown className="w-4 h-4" />
                                            <span>Not Interested</span>
                                        </DropdownMenuItem>

                                        <DropdownMenuSeparator className="bg-border/50" />

                                        {!isOwner && (
                                            <DropdownMenuItem onClick={() => setShowReportDialog(true)} className="gap-2 text-orange-500 focus:text-orange-500 cursor-pointer">
                                                <Flag className="w-4 h-4" />
                                                <span>Report Post</span>
                                            </DropdownMenuItem>
                                        )}

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

                        {/* Post Body/Content */}
                        <div className="post-content-area mb-6">
                            <p className={cn(
                                "text-foreground/90 leading-relaxed whitespace-pre-wrap font-sans",
                                isExpanded ? "text-lg md:text-xl" : "text-[1.05rem]"
                            )}>
                                {renderContentWithMentions(post.content)}
                            </p>

                            {/* Media Content */}
                            {post.media_url && (
                                <div className="mt-4 rounded-xl overflow-hidden border border-border/50 shadow-sm">
                                    {post.media_type === 'video' ? (
                                        <video controls src={post.media_url.startsWith('http') ? post.media_url : `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}${post.media_url}`} className="w-full max-h-[500px] object-cover bg-black" />
                                    ) : (
                                        <img src={post.media_url.startsWith('http') ? post.media_url : `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}${post.media_url}`} alt="Post content" className="w-full max-h-[500px] object-cover hover:scale-[1.01] transition-transform duration-500" />
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer Interactions (Like, Comment, Share) */}
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
                                    (showComments || showCommentsModal) ? "text-primary bg-primary/5" : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                                )}
                                onClick={() => setShowCommentsModal(true)}
                            >
                                <MessageSquare className="w-4.5 h-4.5" />
                                <span className="font-bold text-xs">{post.comment_count}</span>
                            </Button>

                            <Button
                                variant="ghost"
                                size="sm"
                                className={cn(
                                    "h-9 w-9 p-0 rounded-full ml-auto transition-all duration-300",
                                    post.is_saved ? "text-primary hover:bg-primary/5" : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                                )}
                                onClick={handleSave}
                                title={post.is_saved ? "Unsave Post" : "Save Post"}
                            >
                                <Bookmark className={cn("w-4 h-4", post.is_saved && "fill-current")} />
                            </Button>

                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-9 w-9 p-0 text-muted-foreground hover:text-accent hover:bg-accent/5 rounded-full"
                                onClick={handleShareClick}
                                title="Share to followers"
                            >
                                <Share2 className="w-4 h-4" />
                            </Button>


                        </div>

                        {/* Comments Section - Only show inline if explicitly requested (old behavior) or expanded card view */}
                        {(showComments || isExpanded) && (
                            <div className="mt-4 pt-5 border-t border-border/20 animate-in fade-in slide-in-from-top-2 duration-300">
                                <CommentList postId={post.id} />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Comments Modal */}
            <CommentsModal
                post={post}
                open={showCommentsModal}
                onOpenChange={setShowCommentsModal}
            />

            {/* Share Dialog */}

            <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
                <DialogContent className="sm:max-w-md bg-card border-border/50">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 font-display text-xl">
                            <Share2 className="w-5 h-5 text-accent" />
                            Share with Followers
                        </DialogTitle>
                    </DialogHeader>

                    <div className="py-4 space-y-4">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search followers..."
                                className="pl-9 bg-secondary/50 border-input/50"
                                value={followerSearchQuery}
                                onChange={(e) => setFollowerSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="h-[300px] overflow-y-auto pr-2 space-y-2 scroller">
                            {isLoadingFollowers ? (
                                <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                                    <div className="w-6 h-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                                    <span className="text-xs">Loading followers...</span>
                                </div>
                            ) : filteredFollowers.length > 0 ? (
                                filteredFollowers.map((follower) => (
                                    <div
                                        key={follower.id}
                                        onClick={() => setSelectedFollowerId(selectedFollowerId === follower.id ? null : follower.id)}
                                        className={cn(
                                            "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                                            selectedFollowerId === follower.id
                                                ? "bg-accent/10 border-accent/50 ring-1 ring-accent/20"
                                                : "bg-transparent border-transparent hover:bg-secondary/50"
                                        )}
                                    >
                                        {/* Avatar */}
                                        <div className="relative">
                                            {follower.avatar_url ? (
                                                <img src={follower.avatar_url} alt={follower.username} className="w-10 h-10 rounded-full object-cover" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground font-bold border border-border">
                                                    {follower.username[0]?.toUpperCase()}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-sm truncate">{follower.display_name}</h4>
                                            <p className="text-xs text-muted-foreground truncate">@{follower.username}</p>
                                        </div>

                                        {selectedFollowerId === follower.id && (
                                            <div className="w-5 h-5 bg-accent rounded-full flex items-center justify-center animate-in zoom-in-90">
                                                <Check className="w-3 h-3 text-white font-bold" />
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-60">
                                    <Users className="w-10 h-10 mb-2" />
                                    <p className="text-sm">No followers found</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button
                            variant="default"
                            className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-white gap-2"
                            disabled={!selectedFollowerId || isSending}
                            onClick={handleSendShare}
                        >
                            {isSending ? (
                                <>Sending...</>
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    Send Post
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Likers Modal */}
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
                        <DialogDescription className="text-sm text-muted-foreground">
                            Help us understand what's wrong with this post. Your report is anonymous.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
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
        </>
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
