import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { useAuthStore } from '../../../epics/identity/store/authStore';
import { useStoryStore } from '../store/storyStore';
import { cn } from '@/lib/utils';
import { CreateStoryModal } from './CreateStoryModal';
import { StoryViewerModal } from './StoryViewerModal';

export const StoriesRow: React.FC = () => {
    const { user } = useAuthStore();
    const { stories, fetchStories } = useStoryStore();

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [viewerIndex, setViewerIndex] = useState<number | null>(null);

    // Group stories by user
    const groupedStories = React.useMemo(() => {
        const groups: { [authorId: string]: typeof stories } = {};
        stories.forEach(story => {
            if (!groups[story.author_id]) {
                groups[story.author_id] = [];
            }
            groups[story.author_id].push(story);
        });
        // Convert to array and sort by latest story in group
        return Object.values(groups).sort((a, b) => {
            const latestA = Math.max(...a.map(s => new Date(s.created_at).getTime()));
            const latestB = Math.max(...b.map(s => new Date(s.created_at).getTime()));
            return latestB - latestA;
        });
    }, [stories]);

    const handleStoryClick = (authorId: string) => {
        // Find the index of the first story by this author in the flat stories array
        const firstIndex = stories.findIndex(s => s.author_id === authorId);
        if (firstIndex !== -1) {
            setViewerIndex(firstIndex);
        }
    };

    useEffect(() => {
        fetchStories();
    }, [fetchStories]);

    // Format avatar helper
    const getAvatarSrc = (url: string) => {
        if (!url) return '';
        if (url.startsWith('http')) return url;
        const apiUrl = localStorage.getItem('active_community_url') || import.meta.env.VITE_API_URL || 'http://localhost:8080';
        return `${apiUrl}${url}`;
    };

    return (
        <>
            <div className="flex gap-4 overflow-x-auto pb-4 pt-2 px-1 mb-6 scrollbar-hide snap-x">
                {/* Create Story (Self) */}
                <div
                    className="flex flex-col items-center gap-2 flex-shrink-0 snap-center cursor-pointer group"
                    onClick={() => setIsCreateOpen(true)}
                >
                    <div className="relative w-16 h-16 rounded-full p-[2px] bg-gradient-to-tr from-border to-border transition-all duration-300">
                        <div className="w-full h-full rounded-full bg-card overflow-hidden border-2 border-background flex items-center justify-center">
                            {user?.avatar_url ? (
                                <img src={user.avatar_url} alt="You" className="w-full h-full object-cover" />
                            ) : (
                                <span className="font-display font-bold text-xl text-muted-foreground">{user?.username?.[0]?.toUpperCase() || 'U'}</span>
                            )}
                        </div>
                        {/* Add button overlay */}
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground border-2 border-background shadow-sm group-hover:scale-110 transition-transform">
                            <Plus className="w-4 h-4" />
                        </div>
                    </div>
                    <span className="text-xs font-semibold text-foreground">Add Story</span>
                </div>

                {/* Other User Stories */}
                {groupedStories.map((group) => {
                    const latestStory = group[0]; // First in the array
                    return (
                        <div
                            key={latestStory.author_id}
                            className="flex flex-col items-center gap-2 flex-shrink-0 snap-center cursor-pointer group"
                            onClick={() => handleStoryClick(latestStory.author_id)}
                        >
                            <div className={cn("relative w-16 h-16 rounded-full p-[2px] bg-gradient-to-tr transition-all duration-300 group-hover:scale-105 group-hover:shadow-glow-accent", "from-primary to-accent")}>
                                <div className="w-full h-full rounded-full bg-card overflow-hidden border-2 border-background flex items-center justify-center">
                                    {latestStory.author_avatar ? (
                                        <img src={getAvatarSrc(latestStory.author_avatar)} alt={latestStory.author_name} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="font-display font-bold text-xl text-foreground/80">
                                            {latestStory.author_name?.[0]?.toUpperCase()}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <span className="text-xs font-semibold text-foreground truncate w-16 text-center">{latestStory.author_name}</span>
                        </div>
                    );
                })}
            </div>

            <CreateStoryModal open={isCreateOpen} onOpenChange={setIsCreateOpen} />

            {viewerIndex !== null && (
                <StoryViewerModal
                    open={viewerIndex !== null}
                    onClose={() => setViewerIndex(null)}
                    initialStoryIndex={viewerIndex}
                />
            )}
        </>
    );
};
