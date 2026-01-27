import React, { useState } from 'react';
import * as api from '../api/client';

interface FollowButtonProps {
    userId: string;
    initialFollowing?: boolean;
}

export const FollowButton: React.FC<FollowButtonProps> = ({ userId, initialFollowing = false }) => {
    const [isFollowing, setIsFollowing] = useState(initialFollowing);
    const [loading, setLoading] = useState(false);

    const handleClick = async () => {
        setLoading(true);
        try {
            if (isFollowing) {
                await api.unfollowUser(userId);
                setIsFollowing(false);
            } else {
                await api.followUser(userId);
                setIsFollowing(true);
            }
        } catch (error) {
            console.error('Failed to follow/unfollow:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleClick}
            disabled={loading}
            className={`follow-btn ${isFollowing ? 'following' : ''}`}
        >
            {loading ? '...' : isFollowing ? 'Following' : 'Follow'}
        </button>
    );
};
