import React, { useEffect, useState } from 'react';
import { TrendingUp, Users, UserPlus } from 'lucide-react';
import { searchUsers, followUser } from '../api/client';
import type { PublicUser } from '../types';
import { showToast } from '@/lib/toast';
import { useAuthStore } from '../../identity/store/authStore';

export const RightSidebar: React.FC = () => {
    const [suggestedUsers, setSuggestedUsers] = useState<PublicUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());
    const { user: currentUser } = useAuthStore();

    useEffect(() => {
        const fetchSuggestions = async () => {
            try {
                setIsLoading(true);
                // We append a random param to bypass any strict caching and ensure fresh results,
                // or we take a larger sample and randomize it locally since the API might not support random order.
                const offset = Math.floor(Math.random() * 20); // offset by random amount if API supported it, but we'll fetch 30 and shuffle
                const users = await searchUsers('', 30);

                // Shuffle the array to show different people when refreshed
                const shuffled = users.sort(() => 0.5 - Math.random());

                // Filter out users that we are already following and ourself
                setSuggestedUsers(shuffled.filter(u => !u.is_following && u.id !== currentUser?.id).slice(0, 4));
            } catch (error) {
                console.error("Failed to fetch suggested users", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSuggestions();
    }, []);

    const handleFollow = async (userId: string) => {
        try {
            await followUser(userId);
            setFollowingSet(prev => new Set(prev).add(userId));
            showToast.success("Successfully followed user");
        } catch (error) {
            showToast.error("Failed to follow user");
        }
    };

    return (
        <div className="w-[300px] hidden xl:block flex-shrink-0 space-y-6 pt-2 pb-8 fixed right-8 top-8 h-[calc(100vh-4rem)] overflow-y-auto scroller-hidden">

            {/* Suggested Connections Widget */}
            <div className="glass-card rounded-2xl p-5 border border-white/5 shadow-sm bg-background/40 backdrop-blur-xl">
                <div className="flex items-center gap-2 mb-4">
                    <Users className="w-5 h-5 text-accent" />
                    <h2 className="font-display font-bold text-lg text-foreground">Suggested for you</h2>
                </div>

                <div className="space-y-4">
                    {isLoading ? (
                        <div className="flex justify-center py-4">
                            <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : suggestedUsers.length === 0 ? (
                        <div className="text-center text-sm text-muted-foreground py-4">
                            No suggestions right now.
                        </div>
                    ) : (
                        suggestedUsers.map((user) => {
                            const isFollowing = followingSet.has(user.id);
                            return (
                                <div key={user.id} className="flex items-center justify-between group">
                                    <div className="flex items-center gap-3 overflow-hidden cursor-pointer" onClick={() => window.location.href = `/profile/${user.id}`}>
                                        {user.avatar_url ? (
                                            <img src={user.avatar_url} alt={user.display_name || user.username} className="w-10 h-10 rounded-full object-cover shadow-sm bg-secondary flex-shrink-0" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-secondary text-foreground font-bold flex items-center justify-center shadow-sm flex-shrink-0">
                                                {(user.display_name || user.username).charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div className="min-w-0 pr-2">
                                            <div className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                                                {user.display_name || user.username}
                                            </div>
                                            <div className="text-xs text-muted-foreground truncate">
                                                @{user.username}{user.instance && `@${user.instance}`}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleFollow(user.id)}
                                        disabled={isFollowing}
                                        className={`ml-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all flex-shrink-0 flex items-center gap-1
                                            ${isFollowing
                                                ? 'bg-secondary text-muted-foreground cursor-default'
                                                : 'bg-accent/10 text-accent hover:bg-accent hover:text-white'
                                            }`}
                                    >
                                        {!isFollowing && <UserPlus className="w-3 h-3" />}
                                        {isFollowing ? 'Following' : 'Follow'}
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>

                <button
                    onClick={() => {
                        // Refetch the suggestions when clicked
                        const fetchSuggestions = async () => {
                            try {
                                setIsLoading(true);
                                const users = await searchUsers('', 30);
                                const shuffled = users.sort(() => 0.5 - Math.random());
                                setSuggestedUsers(shuffled.filter(u => !u.is_following && u.id !== currentUser?.id).slice(0, 6));
                            } catch (error) {
                                console.error("Failed to fetch suggested users", error);
                            } finally {
                                setIsLoading(false);
                            }
                        };
                        fetchSuggestions();
                    }}
                    className="w-full mt-5 text-sm font-medium text-accent hover:text-accent/80 transition-colors text-left"
                >
                    Discover more users
                </button>
            </div>

        </div>
    );
};
