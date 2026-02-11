import React from 'react';
import { Check, Globe, ChevronsUpDown, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { COMMUNITIES, DEFAULT_COMMUNITY } from '../config/communities';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../epics/identity/store/authStore';

export function CommunitySwitcher({
    collapsed = false,
    onOpenJoinModal
}: {
    collapsed?: boolean;
    onOpenJoinModal: (community: typeof COMMUNITIES[0]) => void;
}) {
    const [open, setOpen] = React.useState(false);
    const navigate = useNavigate();

    // Get current community from local storage or default
    const { user, sessions } = useAuthStore();

    // Get current community from local storage or default
    const currentId = localStorage.getItem('active_community_id') || DEFAULT_COMMUNITY.id;
    const currentCommunity = COMMUNITIES.find(c => c.id === currentId) || DEFAULT_COMMUNITY;

    // Get joined communities
    const getJoinedCommunities = () => {
        const ids = new Set<string>();

        // 1. Current active
        ids.add(currentId);

        // 2. From User Profile
        if (user && user.joined_communities) {
            user.joined_communities.forEach(id => ids.add(id));
        }

        // 3. From Active Sessions (Matching Current User)
        if (sessions && user?.email) {
            sessions.forEach(s => {
                if (s.communityId && s.user.email === user.email) ids.add(s.communityId);
            });
        }

        // 4. Fallback legacy
        try {
            const stored = localStorage.getItem('joined_community_ids');
            if (stored) {
                const legacyIds = JSON.parse(stored);
                if (Array.isArray(legacyIds)) legacyIds.forEach((id: string) => ids.add(id));
            }
        } catch { }

        return COMMUNITIES.filter(c => ids.has(c.id));
    };
    const joinedCommunities = getJoinedCommunities();

    const handleCommunityChange = (communityId: string) => {
        const community = COMMUNITIES.find(c => c.id === communityId);
        if (community && community.id !== currentId) {
            // Check if we have an active session for this community THAT MATCHES CURRENT USER
            // This ensures we stay as "Account B" when switching, instead of jumping to "Account A"
            const matchingSession = user?.email
                ? sessions.find(s => s.communityId === community.id && s.token && s.user.email === user.email)
                : null;

            if (matchingSession) {
                // Direct switch to SAME user on target community
                useAuthStore.getState().switchAccount(matchingSession.user.id);
                navigate('/dashboard');
            } else {
                // Open Login Modal via parent handler
                onOpenJoinModal(community);
            }
        }
        setOpen(false);
    };

    const handleLoginSuccess = () => {
        // Upon successful login in modal, session is created and context switched by modal
        // Just reload to refresh app state
        // Just reload to refresh app state
        navigate('/dashboard');
    };

    return (
        <>
            {collapsed ? (
                <div className="flex justify-center p-2 mb-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center cursor-pointer hover:bg-primary/20 transition-colors"
                        onClick={() => setOpen(true)}
                    >
                        <Globe className="w-5 h-5 text-primary" />
                    </div>
                </div>
            ) : (
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <div
                            role="combobox"
                            aria-expanded={open}
                            className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer transition-colors mb-4 border border-border group"
                        >
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
                                    <Globe className="w-4 h-4 text-indigo-500" />
                                </div>
                                <div className="flex flex-col truncate text-left">
                                    <span className="text-sm font-medium truncate">
                                        {currentCommunity.name}
                                    </span>
                                    <span className="text-xs text-muted-foreground truncate">
                                        {currentCommunity.url.replace('http://', '')}
                                    </span>
                                </div>
                            </div>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 bg-transparent" />
                        </div>
                    </PopoverTrigger>
                    <PopoverContent className="w-[240px] p-0 z-[100]" align="start">
                        <Command defaultValue={currentCommunity.name}>
                            <CommandInput placeholder="Search communities..." />
                            <CommandList>
                                <CommandEmpty>No community found.</CommandEmpty>
                                <CommandGroup heading="Joined Communities">
                                    {joinedCommunities.map((community) => (
                                        <CommandItem
                                            key={community.id}
                                            value={community.name}
                                            onSelect={() => handleCommunityChange(community.id)}
                                            className="cursor-pointer data-[selected=true]:bg-accent/20 data-[selected=true]:text-foreground"
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    currentId === community.id ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            <div className="flex flex-col">
                                                <span>{community.name}</span>
                                                <span className="text-xs text-muted-foreground">
                                                    {community.url.replace('http://', '')}
                                                </span>
                                            </div>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                                <CommandSeparator />
                                <CommandGroup>
                                    <CommandItem onSelect={() => {
                                        setOpen(false);
                                        navigate('/communities');
                                    }} className="cursor-pointer">
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <PlusCircle className="w-4 h-4" />
                                            <span>Join more communities</span>
                                        </div>
                                    </CommandItem>
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            )}
        </>
    );
}
