import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Loader2, Trash2, Heart, Send, Users } from 'lucide-react';
import { useStoryStore } from '../store/storyStore';
import { useAuthStore } from '../../identity/store/authStore';
import { Button } from '@/components/ui/button';
import { AnimatePresence, motion } from 'motion/react';

interface StoryViewerModalProps {
    open: boolean;
    onClose: () => void;
    initialStoryIndex: number;
}

interface LikerInfo {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string;
}

const getApiUrl = () =>
    localStorage.getItem('active_community_url')
    || import.meta.env.VITE_API_URL
    || import.meta.env.VITE_COMMUNITY1_URL
    || 'http://localhost:8080';

const resolveAvatar = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (url.startsWith('/avatars/')) return url; // frontend-served preset
    return `${getApiUrl()}${url}`;
};

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({ open, onClose, initialStoryIndex }) => {
    const { stories, deleteStory, likeStory, unlikeStory } = useStoryStore();
    const { user } = useAuthStore();

    const authorStories = [...stories.filter(
        s => s.author_id === stories[initialStoryIndex]?.author_id
    )].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const [currentIndex, setCurrentIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [isSendingReply, setIsSendingReply] = useState(false);
    const [showLikers, setShowLikers] = useState(false);
    const [likers, setLikers] = useState<LikerInfo[]>([]);
    const [likersLoading, setLikersLoading] = useState(false);
    const [likeLoading, setLikeLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (open) {
            setCurrentIndex(0);
            setShowLikers(false);
            setReplyText('');
            setLikers([]);
        }
    }, [open]);

    if (!open || authorStories.length === 0) return null;

    const safeIndex = currentIndex >= authorStories.length ? Math.max(0, authorStories.length - 1) : currentIndex;
    const currentStory = authorStories[safeIndex];

    if (!currentStory) return null;

    const isOwner = user?.id === currentStory.author_id;
    const likes: string[] = currentStory.likes ?? [];
    const isLiked = user ? likes.includes(user.id) : false;

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
            if (authorStories.length === 1) onClose();
            else if (currentIndex === authorStories.length - 1) setCurrentIndex(currentIndex - 1);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleLike = async () => {
        if (!user || likeLoading) return;
        setLikeLoading(true);
        try {
            if (isLiked) await unlikeStory(currentStory.id);
            else await likeStory(currentStory.id);
        } finally {
            setLikeLoading(false);
        }
    };

    const fetchLikers = async () => {
        setLikersLoading(true);
        try {
            const token = useAuthStore.getState().token;
            const res = await fetch(`${getApiUrl()}/api/stories/${currentStory.id}/likes`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
            });
            if (!res.ok) throw new Error('Failed to fetch likers');
            const data = await res.json();
            setLikers(data.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLikersLoading(false);
        }
    };

    const handleToggleLikers = () => {
        if (!showLikers) fetchLikers();
        setShowLikers(v => !v);
    };

    const handleSendReply = async () => {
        if (!replyText.trim() || isSendingReply || !user) return;
        setIsSendingReply(true);
        try {
            const token = useAuthStore.getState().token;
            await fetch(`${getApiUrl()}/api/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    receiver_id: currentStory.author_id,
                    content: `↩ Replied to story: "${replyText.trim()}"`,
                    type: 'text',
                }),
            });
            setReplyText('');
        } catch (err) {
            console.error('Failed to send story reply:', err);
        } finally {
            setIsSendingReply(false);
        }
    };

    const mediaUrl = currentStory.media_url.startsWith('http')
        ? currentStory.media_url
        : `${getApiUrl()}${currentStory.media_url}`;

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
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-full w-12 h-12"
                    onClick={(e) => { e.stopPropagation(); goToPrev(); }}>
                    <ChevronLeft className="w-8 h-8" />
                </Button>
            </div>

            {/* Navigation Right */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 z-[110]">
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-full w-12 h-12"
                    onClick={(e) => { e.stopPropagation(); goToNext(); }}>
                    <ChevronRight className="w-8 h-8" />
                </Button>
            </div>

            {/* Main Content */}
            <div
                className="relative h-full w-full sm:h-[95vh] sm:w-auto sm:min-w-[calc(95vh*9/16)] sm:max-w-[95vw] bg-zinc-950 sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Top gradient */}
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-black/80 to-transparent z-10 pointer-events-none" />

                {/* Progress Bars */}
                <div className="absolute top-4 left-0 w-full px-4 flex gap-1 z-20">
                    {authorStories.map((_, idx) => (
                        <div key={idx} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                            <div className={`h-full bg-white transition-all duration-300 ${idx === safeIndex ? 'w-full' : idx < safeIndex ? 'w-full' : 'w-0'}`} />
                        </div>
                    ))}
                </div>

                {/* Author Row */}
                <div className="absolute top-8 left-0 w-full px-4 flex items-center justify-between z-20">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/80 border-2 border-white/50 overflow-hidden flex items-center justify-center text-white font-bold flex-shrink-0">
                            {currentStory.author_avatar ? (
                                <img src={resolveAvatar(currentStory.author_avatar)} alt={currentStory.author_name} className="w-full h-full object-cover" />
                            ) : (
                                currentStory.author_name?.[0]?.toUpperCase()
                            )}
                        </div>
                        <div>
                            <p className="text-white font-bold text-sm">{currentStory.author_name}</p>
                            <p className="text-white/70 text-xs">{new Date(currentStory.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Owner: view likers */}
                        {isOwner && likes.length > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleToggleLikers}
                                className="text-white hover:bg-white/20 rounded-full bg-black/40 gap-1.5"
                            >
                                <Heart className="w-4 h-4 fill-red-400 text-red-400" />
                                <span className="text-xs font-bold">{likes.length}</span>
                            </Button>
                        )}
                        {/* Delete (owner only) */}
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
                </div>

                {/* Media */}
                <div className="flex-1 flex items-center justify-center relative">
                    {currentStory.media_type === 'image' ? (
                        <img src={mediaUrl} alt="Story" className="w-full h-full object-cover" />
                    ) : (
                        <video src={mediaUrl} className="w-full h-full object-cover" autoPlay loop playsInline />
                    )}

                    {/* Caption */}
                    {currentStory.content && (
                        <>
                            <div className="absolute bottom-0 left-0 w-full h-48 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10 pointer-events-none" />
                            <div className="absolute bottom-16 left-0 w-full px-6 z-20">
                                <p className="text-white text-sm md:text-base font-medium leading-relaxed text-center drop-shadow-md whitespace-pre-wrap">{currentStory.content}</p>
                            </div>
                        </>
                    )}

                    {/* Tap zones */}
                    <div className="absolute inset-0 z-10 flex">
                        <div className="w-1/3 h-full cursor-w-resize" onClick={goToPrev} />
                        <div className="w-2/3 h-full cursor-e-resize" onClick={goToNext} />
                    </div>
                </div>

                {/* Bottom Bar: Like + Reply */}
                <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black via-black/60 to-transparent pt-8 pb-4 px-4 z-30 flex items-center gap-3">
                    {/* Like Button (non-owner only) */}
                    {!isOwner && (
                        <button
                            onClick={handleLike}
                            disabled={likeLoading}
                            className="flex-shrink-0 flex flex-col items-center gap-0.5"
                        >
                            <motion.div
                                key={isLiked ? 'liked' : 'unliked'}
                                initial={{ scale: 0.8 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                            >
                                <Heart className={`w-7 h-7 transition-colors ${isLiked ? 'fill-red-500 text-red-500' : 'text-white/70'}`} />
                            </motion.div>
                            {likes.length > 0 && (
                                <span className="text-white/60 text-[10px] font-bold">{likes.length}</span>
                            )}
                        </button>
                    )}

                    {/* Reply Input */}
                    <div className="flex-1 flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-full px-4 py-2 border border-white/20">
                        <input
                            ref={inputRef}
                            value={replyText}
                            onChange={e => setReplyText(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleSendReply(); }}
                            placeholder={`Reply to ${currentStory.author_name}...`}
                            className="flex-1 bg-transparent text-white text-sm placeholder:text-white/40 outline-none"
                        />
                        {replyText.trim() && (
                            <button onClick={handleSendReply} disabled={isSendingReply} className="text-white/80 hover:text-white transition-colors">
                                {isSendingReply ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            </button>
                        )}
                    </div>
                </div>

                {/* Likers Panel (owner only, slide up) */}
                <AnimatePresence>
                    {showLikers && isOwner && (
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            className="absolute inset-x-0 bottom-0 bg-zinc-900/97 backdrop-blur-xl rounded-t-2xl z-40 px-5 pt-5 pb-6 max-h-[55%] overflow-y-auto"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-white font-bold text-base flex items-center gap-2">
                                    <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                                    Liked by {likes.length}
                                </h3>
                                <button onClick={() => setShowLikers(false)} className="text-white/50 hover:text-white">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {likersLoading ? (
                                <div className="flex justify-center py-6">
                                    <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
                                </div>
                            ) : likers.length === 0 ? (
                                <p className="text-white/40 text-sm text-center py-4">No likes yet</p>
                            ) : (
                                <ul className="space-y-3">
                                    {likers.map((liker) => (
                                        <li key={liker.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                                            <div className="w-9 h-9 rounded-full bg-primary/40 overflow-hidden flex-shrink-0 flex items-center justify-center text-white text-sm font-bold">
                                                {liker.avatar_url ? (
                                                    <img src={resolveAvatar(liker.avatar_url)} alt={liker.display_name} className="w-full h-full object-cover" />
                                                ) : (
                                                    (liker.display_name || liker.username)?.[0]?.toUpperCase()
                                                )}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-white font-semibold text-sm truncate">{liker.display_name || liker.username}</span>
                                                {liker.display_name && liker.display_name !== liker.username && (
                                                    <span className="text-white/40 text-xs truncate">@{liker.username}</span>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};
