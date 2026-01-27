import React, { useState } from 'react';
import type { Post } from '../types';
import { useContentStore } from '../store/contentStore';
import { CommentList } from './CommentList';
import { useAuthStore } from '../../identity/store/authStore';

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
        <div className="post-card">
            <div className="post-header">
                <div className="post-author">
                    {post.author_avatar && (
                        <img src={post.author_avatar} alt={post.author_name} className="avatar" />
                    )}
                    {!post.author_avatar && (
                        <div className="avatar-placeholder">{post.author_name[0]?.toUpperCase()}</div>
                    )}
                    <div className="post-meta">
                        <span className="author-name">{post.author_name}</span>
                        <span className="post-time">{timeAgo}</span>
                    </div>
                </div>
                {isOwner && (
                    <button onClick={handleDelete} className="delete-btn" title="Delete post">
                        🗑️
                    </button>
                )}
            </div>

            <div className="post-content">
                <p>{post.content}</p>
            </div>

            <div className="post-actions">
                <button onClick={handleLike} className={`action-btn ${post.is_liked ? 'liked' : ''}`}>
                    {post.is_liked ? '❤️' : '🤍'} {post.like_count}
                </button>
                <button onClick={() => setShowComments(!showComments)} className="action-btn">
                    💬 {post.comment_count}
                </button>
            </div>

            {showComments && <CommentList postId={post.id} />}
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
