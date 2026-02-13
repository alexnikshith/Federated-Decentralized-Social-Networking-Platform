import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PublicUser } from '../types';
import * as api from '../api/client';
import { Search, UserPlus, UserCheck, Globe, SearchX, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';
import { COMMUNITIES } from '../../../src/config/communities';

export const UserSearch: React.FC<{
    onClose?: () => void;
    onSelectUser?: (user: PublicUser) => void;
}> = ({ onClose, onSelectUser }) => {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<PublicUser[]>([]);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handleSearch = async (searchQuery: string) => {
        setQuery(searchQuery);
        if (!searchQuery.trim()) {
            setResults([]);
            return;
        }

        setLoading(true);
        try {
            // Federated Search: Query all known communities
            const searchPromises = COMMUNITIES.map(async (community) => {
                try {
                    const response = await axios.get(`${community.url}/api/users/search?q=${encodeURIComponent(searchQuery)}&limit=10`);
                    const users: PublicUser[] = response.data.data || [];

                    // Add community context to remote users
                    return users.map(u => ({
                        ...u,
                        community_name: community.name,
                        community_url: community.url
                    }));
                } catch (err) {
                    console.error(`Search on ${community.name} failed:`, err);
                    return [];
                }
            });

            const allResults = await Promise.all(searchPromises);
            const flatResults = allResults.flat();

            // Deduplicate by username and id
            const uniqueResults = flatResults.reduce((acc: PublicUser[], current) => {
                const x = acc.find(item => item.username === current.username && item.id === current.id);
                if (!x) {
                    return acc.concat([current]);
                } else {
                    return acc;
                }
            }, []);

            setResults(uniqueResults);
        } catch (error) {
            console.error('Search failed:', error);
            toast({
                variant: "destructive",
                title: "Search failed",
                description: "Unable to perform federated search. Please try again.",
            });
        } finally {
            setLoading(false);
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

                    return (
                        <div
                            key={user.id}
                            className="group flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/30 transition-all border border-transparent hover:border-border/50 cursor-pointer"
                            onClick={() => {
                                if (onSelectUser) {
                                    onSelectUser(user);
                                } else {
                                    const params = new URLSearchParams();
                                    if ((user as any).community_url) {
                                        params.set('community', (user as any).community_url);
                                    }
                                    navigate(`/profile/${user.username}${params.toString() ? '?' + params.toString() : ''}`);
                                }
                                if (onClose) onClose();
                            }}
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
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <div className="text-[10px] text-muted-foreground truncate font-mono">
                                        @{user.username}
                                    </div>
                                    {(user as any).community_name && (
                                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-primary/10 text-[8px] font-bold text-primary uppercase tracking-tighter">
                                            <Globe className="w-2 h-2" />
                                            {(user as any).community_name}
                                        </div>
                                    )}
                                </div>
                            </div>


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
