import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PublicUser } from '../types';
import * as api from '../api/client';
import { Search, UserPlus, UserCheck, Globe, SearchX, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export const UserSearch: React.FC = () => {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<PublicUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [followingMap, setFollowingMap] = useState<Map<string, boolean>>(new Map());
    const [loadingMap, setLoadingMap] = useState<Map<string, boolean>>(new Map());
    const { toast } = useToast();

    const handleSearch = async (searchQuery: string) => {
        setQuery(searchQuery);
        if (!searchQuery.trim()) {
            setResults([]);
            return;
        }

        setLoading(true);
        try {
            const users = await api.searchUsers(searchQuery);
            setResults(users);
        } catch (error) {
            console.error('Search failed:', error);
            toast({
                variant: "destructive",
                title: "Search failed",
                description: "Unable to search users. Please try again.",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleFollow = async (userId: string, isCurrentlyFollowing: boolean) => {
        // Set loading state for this specific user
        setLoadingMap(prev => new Map(prev).set(userId, true));

        try {
            if (isCurrentlyFollowing) {
                await api.unfollowUser(userId);
                setFollowingMap(prev => {
                    const newMap = new Map(prev);
                    newMap.set(userId, false);
                    return newMap;
                });
                toast({
                    title: "Unfollowed",
                    description: "You have unfollowed this user.",
                });
            } else {
                await api.followUser(userId);
                setFollowingMap(prev => {
                    const newMap = new Map(prev);
                    newMap.set(userId, true);
                    return newMap;
                });
                toast({
                    title: "Following",
                    description: "You are now following this user.",
                });
            }
        } catch (error) {
            console.error('Failed to follow/unfollow:', error);
            toast({
                variant: "destructive",
                title: "Action failed",
                description: "Unable to update follow status. Please try again.",
            });
        } finally {
            // Remove loading state for this user
            setLoadingMap(prev => {
                const newMap = new Map(prev);
                newMap.delete(userId);
                return newMap;
            });
        }
    };

    return (
        <div className="space-y-4">
            <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Search the federation..."
                    className="w-full bg-secondary/50 border border-border/50 rounded-xl py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all"
                />
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-hide">
                {loading && (
                    <div className="flex items-center justify-center py-8">
                        <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    </div>
                )}

                {results.map((user) => {
                    const isFollowing = followingMap.get(user.id) || false;
                    const isLoadingUser = loadingMap.get(user.id) || false;

                    return (
                        <div
                            key={user.id}
                            className="group flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/30 transition-all border border-transparent hover:border-border/50 cursor-pointer"
                            onClick={() => navigate(`/profile/${user.username}`)}
                        >
                            <div className="relative flex-shrink-0">
                                {user.avatar_url ? (
                                    <img src={user.avatar_url} alt={user.username} className="w-10 h-10 rounded-full object-cover" />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground border border-border/50">
                                        {user.username[0]?.toUpperCase()}
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 overflow-hidden">
                                    <span className="font-semibold text-sm truncate">{user.display_name || user.username}</span>
                                    {user.username.includes('@') && (
                                        <Globe className="w-2.5 h-2.5 text-accent flex-shrink-0" />
                                    )}
                                </div>
                                <div className="text-[10px] text-muted-foreground truncate font-mono">
                                    @{user.username}
                                </div>
                            </div>

                            <Button
                                variant={isFollowing ? "secondary" : "ghost"}
                                size="icon"
                                className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleFollow(user.id, isFollowing)}
                                disabled={isLoadingUser}
                            >
                                {isLoadingUser ? (
                                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                                ) : isFollowing ? (
                                    <UserCheck className="w-4 h-4 text-primary" />
                                ) : (
                                    <UserPlus className="w-4 h-4 text-primary" />
                                )}
                            </Button>
                        </div>
                    );
                })}

                {query && !loading && results.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 opacity-40">
                        <SearchX className="w-8 h-8 mb-2" />
                        <p className="text-[10px] uppercase tracking-widest font-medium">No matches found</p>
                    </div>
                )}
            </div>
        </div>
    );
};
