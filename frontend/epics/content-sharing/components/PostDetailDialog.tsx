import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { PostCard } from './PostCard';
import { Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Post } from '../types';
import * as api from '../api/client';

interface PostDetailDialogProps {
    postId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialShowComments?: boolean;
}

export const PostDetailDialog: React.FC<PostDetailDialogProps> = ({
    postId,
    open,
    onOpenChange,
    initialShowComments = false
}) => {
    const [post, setPost] = useState<Post | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (open && postId) {
            fetchPost();
        } else {
            // Reset state when dialog closes
            setPost(null);
            setError(null);
        }
    }, [open, postId]);

    const fetchPost = async () => {
        if (!postId) return;

        setLoading(true);
        setError(null);
        try {
            const data = await api.getPostById(postId);
            setPost(data);
        } catch (err: any) {
            console.error('Failed to fetch post:', err);
            if (err.response?.status === 403) {
                setError("You don't have access to view this post.");
            } else if (err.response?.status === 404) {
                setError("This post has been deleted or doesn't exist.");
            } else {
                setError("Failed to load post. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
                {/* Accessible title for screen readers */}
                <VisuallyHidden>
                    <DialogTitle>Post Details</DialogTitle>
                </VisuallyHidden>

                {/* Close button */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-4 top-4 z-10 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background"
                    onClick={() => onOpenChange(false)}
                >
                    <X className="h-4 w-4" />
                </Button>

                {/* Content */}
                <div className="p-6">
                    {loading && (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    )}

                    {error && (
                        <div className="flex flex-col items-center justify-center py-12 px-4">
                            <div className="text-center space-y-3">
                                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                                    <X className="w-8 h-8 text-destructive" />
                                </div>
                                <h3 className="text-lg font-semibold">Unable to Load Post</h3>
                                <p className="text-sm text-muted-foreground max-w-sm">
                                    {error}
                                </p>
                                <Button
                                    variant="outline"
                                    onClick={() => onOpenChange(false)}
                                    className="mt-4"
                                >
                                    Close
                                </Button>
                            </div>
                        </div>
                    )}

                    {!loading && !error && post && (
                        <PostCard post={post} initialShowComments={initialShowComments} />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};
