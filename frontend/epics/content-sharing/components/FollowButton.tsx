import React, { useState } from 'react';
import * as api from '../api/client';

interface FollowButtonProps {
    userId: string;
    initialFollowing?: boolean;
    initialRequested?: boolean;
}

export const FollowButton: React.FC<FollowButtonProps> = ({ userId, initialFollowing = false, initialRequested = false }) => {
    const [isFollowing, setIsFollowing] = useState(initialFollowing);
    const [isRequested, setIsRequested] = useState(initialRequested);
    const [loading, setLoading] = useState(false);

    const handleClick = async () => {
        setLoading(true);
        try {
            if (isFollowing) {
                await api.unfollowUser(userId);
                setIsFollowing(false);
            } else if (isRequested) {
                await api.unfollowUser(userId);
                setIsRequested(false);
            } else {
                const res = await api.followUser(userId);
                if (res && res.data && res.data.status === 'requested') {
                    setIsRequested(true);
                } else if (res && res.status === 'requested') {
                    setIsRequested(true);
                } else {
                    setIsFollowing(true);
                }
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
            className={`follow-btn ${isFollowing || isRequested ? 'following' : ''}`}
        >
            {loading ? '...' : isFollowing ? 'Following' : isRequested ? 'Requested' : 'Follow'}
        </button>
    );
};
