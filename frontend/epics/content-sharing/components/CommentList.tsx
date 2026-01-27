import React, { useState, useEffect } from 'react';
import type { Comment } from '../types';
import * as api from '../api/client';

interface CommentListProps {
    postId: string;
}

export const CommentList: React.FC<CommentListProps> = ({ postId }) => {
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadComments();
    }, [postId]);

    const loadComments = async () => {
        try {
            const data = await api.getComments(postId);
            setComments(data);
        } catch (error) {
            console.error('Failed to load comments:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        setLoading(true);
        try {
            await api.createComment(postId, { content: newComment });
            setNewComment('');
            await loadComments();
        } catch (error) {
            console.error('Failed to create comment:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="comment-list">
            <form onSubmit={handleSubmit} className="comment-form">
                <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment..."
                    maxLength={1000}
                    disabled={loading}
                />
                <button type="submit" disabled={loading || !newComment.trim()}>
                    {loading ? '...' : 'Comment'}
                </button>
            </form>

            <div className="comments">
                {comments.length === 0 && <p className="no-comments">No comments yet</p>}
                {comments.map((comment) => (
                    <div key={comment.id} className="comment">
                        <div className="comment-header">
                            {comment.user_avatar && (
                                <img src={comment.user_avatar} alt={comment.user_name} className="avatar-small" />
                            )}
                            {!comment.user_avatar && (
                                <div className="avatar-small-placeholder">
                                    {comment.user_name[0]?.toUpperCase()}
                                </div>
                            )}
                            <span className="comment-author">{comment.user_name}</span>
                        </div>
                        <p className="comment-content">{comment.content}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};
