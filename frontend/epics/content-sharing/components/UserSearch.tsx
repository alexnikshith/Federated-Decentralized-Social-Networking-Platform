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
import { useAuthStore } from '../../identity/store/authStore';

export const UserSearch: React.FC<{
    onClose?: () => void;
    onSelectUser?: (user: PublicUser) => void;
}> = ({ onClose, onSelectUser }) => {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<PublicUser[]>([]);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();
    const { user: currentUser } = useAuthStore();

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
                    const token = localStorage.getItem('auth_token');
                    const activeCommunityUrl = localStorage.getItem('active_community_url');
                    const isLocal = community.url === activeCommunityUrl ||
                        (community.url.includes('localhost:8080') && activeCommunityUrl?.includes('localhost:8080'));

                    const response = await axios.get(
                        `${community.url}/api/users/search?q=${encodeURIComponent(searchQuery)}&limit=10`,
                        isLocal && token ? { headers: { Authorization: `Bearer ${token}` } } : {}
                    );
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

            // Deduplicate by username, preferring the user's home community over cached remote versions
            const currentInstanceUrl = localStorage.getItem('active_community_url') || import.meta.env.VITE_API_URL || import.meta.env.VITE_COMMUNITY1_URL || 'http://localhost:8080';
            const currentInstanceDomain = currentInstanceUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');

            const isCommunity1 = currentInstanceDomain.includes('localhost:8080') || currentInstanceDomain.includes('federated-decentralized-social.onrender.com');
            const isCommunity2 = currentInstanceDomain.includes('localhost:8081') || currentInstanceDomain.includes('community-2');

            const isLocal = (instance: string | undefined | null) => {
                if (!instance) return true;
                const cleanInstance = instance.replace(/^https?:\/\//, '').replace(/\/$/, '');
                if (cleanInstance === currentInstanceDomain) return true;
                if (isCommunity1 && (cleanInstance === 'localhost:8080' || cleanInstance === 'default' || cleanInstance === 'default-instance')) return true;
                if (isCommunity2 && (cleanInstance === 'localhost:8081' || cleanInstance === 'community-2')) return true;
                return false;
            };

            const uniqueResults = flatResults.reduce((acc: PublicUser[], current) => {
                const existing = acc.find(item => item.username === current.username);
                if (!existing) {
                    return acc.concat([current]);
                } else {
                    const currentIsLocal = isLocal(current.instance);
                    const existingIsLocal = isLocal(existing.instance);

                    if (currentIsLocal && !existingIsLocal) {
                        // Replace remote version with local version
                        return acc.map(item => item.username === current.username ? current : item);
                    }
                    return acc;
                }
            }, []);

            setResults(uniqueResults.filter(u => u.id !== currentUser?.id));
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
                                    {user.instance && (
                                        <Globe className="w-2.5 h-2.5 text-accent flex-shrink-0" />
                                    )}
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <div className="text-[10px] text-muted-foreground truncate font-mono">
                                        @{user.username}
                                    </div>
                                    {(() => {
                                        const instance = user.instance;
                                        let displayDomain = "";

                                        if (!instance || instance === "default-instance" || instance === "default" || instance.includes("localhost:8080") || instance.includes("federated-decentralized-social.onrender.com")) {
                                            displayDomain = "nexus.social";
                                        } else {
                                            // Extract domain from URL and remove protocol
                                            displayDomain = instance.replace(/^https?:\/\//, '').replace(/\/$/, '');
                                        }

                                        return (
                                            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-primary/10 text-[8px] font-bold text-primary uppercase tracking-tighter">
                                                <Globe className="w-2 h-2" />
                                                {displayDomain}
                                            </div>
                                        );
                                    })()}
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
