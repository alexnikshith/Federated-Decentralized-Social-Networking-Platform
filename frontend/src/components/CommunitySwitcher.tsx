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

export function CommunitySwitcher({ collapsed = false }: { collapsed?: boolean }) {
    const [open, setOpen] = React.useState(false);
    const navigate = useNavigate();

    // Get current community from local storage or default
    const currentId = localStorage.getItem('active_community_id') || DEFAULT_COMMUNITY.id;
    const currentCommunity = COMMUNITIES.find(c => c.id === currentId) || DEFAULT_COMMUNITY;

    // Get joined communities
    const getJoinedCommunities = () => {
        try {
            const stored = localStorage.getItem('joined_community_ids');
            const ids = stored ? JSON.parse(stored) : [DEFAULT_COMMUNITY.id];

            const list = COMMUNITIES.filter(c => ids.includes(c.id));
            if (!list.find(c => c.id === currentId)) {
                const current = COMMUNITIES.find(c => c.id === currentId);
                if (current) list.push(current);
            }
            return list.length > 0 ? list : [DEFAULT_COMMUNITY];
        } catch (e) {
            return [DEFAULT_COMMUNITY];
        }
    };
    const joinedCommunities = getJoinedCommunities();

    const handleCommunityChange = (communityId: string) => {
        const community = COMMUNITIES.find(c => c.id === communityId);
        if (community && community.id !== currentId) {
            // 1. Set active community context
            localStorage.setItem('active_community_id', community.id);
            localStorage.setItem('active_community_url', community.url);

            // 2. Switch Auth Session (Restores session if exists, else logs out to Guest)
            useAuthStore.getState().switchCommunity(community.id);

            // 3. Reload to clear query cache and ensure clean state
            window.location.reload();
        }
        setOpen(false);
    };

    if (collapsed) {
        return (
            <div className="flex justify-center p-2 mb-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center cursor-pointer hover:bg-primary/20 transition-colors"
                    onClick={() => setOpen(true)}
                >
                    <Globe className="w-5 h-5 text-primary" />
                </div>
            </div>
        )
    }

    return (
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
                <Command>
                    <CommandInput placeholder="Search communities..." />
                    <CommandList>
                        <CommandEmpty>No community found.</CommandEmpty>
                        <CommandGroup heading="Joined Communities">
                            {joinedCommunities.map((community) => (
                                <CommandItem
                                    key={community.id}
                                    value={community.name}
                                    onSelect={() => handleCommunityChange(community.id)}
                                    className="cursor-pointer"
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
                                    {/* Link to Explore page where the 'Join' buttons are now active */}
                                </div>
                            </CommandItem>
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
