import React, { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Loader2, Trash2 } from 'lucide-react';
import { useStoryStore } from '../store/storyStore';
import { useAuthStore } from '../../identity/store/authStore';
import { Button } from '@/components/ui/button';

interface StoryViewerModalProps {
    open: boolean;
    onClose: () => void;
    initialStoryIndex: number;
}

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({ open, onClose, initialStoryIndex }) => {
    const { stories, deleteStory } = useStoryStore();
    const { user } = useAuthStore();

    // Filter stories to only include those by the author we clicked on
    const authorStories = stories.filter(
        s => s.author_id === stories[initialStoryIndex]?.author_id
    ) || [];

    const [currentIndex, setCurrentIndex] = useState(0); // Index within authorStories
    const [isDeleting, setIsDeleting] = useState(false);

    // Fix: the effect shouldn't just reset on open if there are active deletions mutating the array length mid-session.
    useEffect(() => {
        if (open) {
            setCurrentIndex(0);
        }
    }, [open]);

    if (!open || authorStories.length === 0) return null;

    // Safety check: ensure currentIndex is within bounds of authorStories. 
    // During a deletion, authorStories shrinks by 1 and currentIndex might momentarily point out of bounds.
    const safeIndex = currentIndex >= authorStories.length ? Math.max(0, authorStories.length - 1) : currentIndex;
    const currentStory = authorStories[safeIndex];

    if (!currentStory) return null; // Additional safety net during re-renders

    const isOwner = user?.id === currentStory.author_id;

    const goToPrev = () => {
        if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
        else onClose();
    };

    const goToNext = () => {
        if (currentIndex < authorStories.length - 1) setCurrentIndex(currentIndex + 1);
        else onClose();
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await deleteStory(currentStory.id);
            if (authorStories.length === 1) {
                onClose();
            } else if (currentIndex === authorStories.length - 1) {
                setCurrentIndex(currentIndex - 1);
            }
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-300"
            onClick={onClose}
        >
            {/* Close Button */}
            <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 text-white hover:bg-white/20 z-[110] rounded-full w-10 h-10"
                onClick={onClose}
            >
                <X className="w-6 h-6" />
            </Button>

            {/* Navigation Left */}
            <div className="absolute left-4 top-1/2 -translate-y-1/2 z-[110]">
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-full w-12 h-12" onClick={goToPrev}>
                    <ChevronLeft className="w-8 h-8" />
                </Button>
            </div>

            {/* Navigation Right */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 z-[110]">
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-full w-12 h-12" onClick={goToNext}>
                    <ChevronRight className="w-8 h-8" />
                </Button>
            </div>

            {/* Main Content Area */}
            <div
                className="relative h-full w-full sm:h-[95vh] sm:w-auto sm:min-w-[calc(95vh*9/16)] sm:max-w-[95vw] bg-zinc-950 sm:rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center flex-shrink-0"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Top Gradient for readability */}
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-black/80 to-transparent z-10 pointer-events-none" />

                {/* Progress Indicators */}
                <div className="absolute top-4 left-0 w-full px-4 flex gap-1 z-20">
                    {authorStories.map((_, idx) => (
                        <div key={idx} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                            <div className={`h-full bg-white transition-all duration-300 ${idx === safeIndex ? 'w-full' : idx < safeIndex ? 'w-full' : 'w-0'}`} />
                        </div>
                    ))}
                </div>

                {/* Author Info Overlay */}
                <div className="absolute top-8 left-0 w-full px-4 flex items-center justify-between z-20">
                    <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 rounded-full bg-primary/80 border-2 border-white/50 overflow-hidden flex items-center justify-center text-white font-bold">
                            {currentStory.author_avatar ? (
                                <img src={currentStory.author_avatar.startsWith('http') ? currentStory.author_avatar : `${import.meta.env.VITE_API_URL || import.meta.env.VITE_COMMUNITY1_URL || 'http://localhost:8080'}${currentStory.author_avatar}`} alt={currentStory.author_name} className="w-full h-full object-cover" />
                            ) : (
                                currentStory.author_name?.[0]?.toUpperCase()
                            )}
                        </div>
                        <div>
                            <p className="text-white font-bold text-sm text-shadow-sm">{currentStory.author_name}</p>
                            <p className="text-white/70 text-xs text-shadow-sm">{(new Date(currentStory.created_at)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                    </div>

                    {isOwner && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="text-white hover:bg-destructive/80 hover:text-white rounded-full bg-black/40"
                        >
                            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </Button>
                    )}
                </div>

                {/* Media Content */}
                {currentStory.media_type === 'image' ? (
                    <img
                        src={currentStory.media_url.startsWith('http') ? currentStory.media_url : `${import.meta.env.VITE_API_URL || import.meta.env.VITE_COMMUNITY1_URL || 'http://localhost:8080'}${currentStory.media_url}`}
                        alt="Story"
                        className="w-full h-full sm:w-auto sm:h-full sm:max-w-full object-cover sm:object-contain"
                    />
                ) : (
                    <video
                        src={currentStory.media_url.startsWith('http') ? currentStory.media_url : `${import.meta.env.VITE_API_URL || import.meta.env.VITE_COMMUNITY1_URL || 'http://localhost:8080'}${currentStory.media_url}`}
                        className="w-full h-full sm:w-auto sm:h-full sm:max-w-full object-cover sm:object-contain"
                        autoPlay
                        loop
                        playsInline
                    />
                )}

                {/* Caption Overlay */}
                {currentStory.content && (
                    <>
                        <div className="absolute bottom-0 left-0 w-full h-48 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10 pointer-events-none" />
                        <div className="absolute bottom-8 left-0 w-full px-6 z-20">
                            <div className="text-white p-2 text-center drop-shadow-md">
                                <p className="whitespace-pre-wrap text-sm md:text-base font-medium leading-relaxed">{currentStory.content}</p>
                            </div>
                        </div>
                    </>
                )}

                {/* Tap targets for navigation (invisible) */}
                <div className="absolute inset-0 z-10 flex">
                    <div className="w-1/3 h-full cursor-w-resize" onClick={goToPrev} />
                    <div className="w-2/3 h-full cursor-e-resize" onClick={goToNext} />
                </div>
            </div>
        </div>
    );
};
