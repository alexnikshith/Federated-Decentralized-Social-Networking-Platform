import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { useAuthStore } from '../../../epics/identity/store/authStore';
import { useStoryStore } from '../store/storyStore';
import { CreateStoryModal } from './CreateStoryModal';
import { StoryViewerModal } from './StoryViewerModal';
import { motion } from 'motion/react';

// ─── Viewed-story persistence (localStorage) ──────────────────────────────────
const viewedKey = (userId?: string) => `viewed_story_ids${userId ? `_${userId}` : ''}`;

const loadViewedIds = (userId?: string): Set<string> => {
    try {
        const raw = localStorage.getItem(viewedKey(userId));
        return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
        return new Set();
    }
};

const saveViewedIds = (ids: Set<string>, userId?: string) => {
    try {
        localStorage.setItem(viewedKey(userId), JSON.stringify([...ids]));
    } catch { /* ignore */ }
};

// ─── Component ────────────────────────────────────────────────────────────────
export const StoriesRow: React.FC = () => {
    const { user } = useAuthStore();
    const { stories, fetchStories, markStoryViewed, getViewedStoryIDs } = useStoryStore();

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [viewerIndex, setViewerIndex] = useState<number | null>(null);
    const [viewedIds, setViewedIds] = useState<Set<string>>(() => loadViewedIds(user?.id));

    useEffect(() => {
        fetchStories();
    }, [fetchStories]);

    // When the user changes, reload viewed IDs scoped to the new account
    // Merge server-side state (source of truth) with localStorage cache
    useEffect(() => {
        const userId = user?.id;
        // Seed from localStorage immediately (instant UI update)
        setViewedIds(loadViewedIds(userId));

        // If authenticated, fetch from server and merge (handles cross-device/incognito)
        if (userId) {
            getViewedStoryIDs().then(serverIds => {
                if (serverIds.length === 0) return;
                setViewedIds(prev => {
                    const next = new Set(prev);
                    serverIds.forEach(id => next.add(id));
                    saveViewedIds(next, userId);
                    return next;
                });
            });
        }
    }, [user?.id]);

    // Receive the specific story IDs that were actually navigated to,
    // persist to localStorage + server (fire-and-forget)
    const handleViewerClose = useCallback((viewedStoryIds: string[]) => {
        if (viewedStoryIds.length > 0) {
            setViewedIds(prev => {
                const next = new Set(prev);
                viewedStoryIds.forEach(id => next.add(id));
                saveViewedIds(next, user?.id);
                return next;
            });
            // Push each view to the server (idempotent, fire-and-forget)
            viewedStoryIds.forEach(id => markStoryViewed(id));
        }
        setViewerIndex(null);
    }, [user?.id, markStoryViewed]);

    // Group stories by author — unviewed groups first, then fully viewed
    const groupedStories = useMemo(() => {
        const groups: { [authorId: string]: typeof stories } = {};
        stories.forEach(story => {
            if (!groups[story.author_id]) groups[story.author_id] = [];
            groups[story.author_id].push(story);
        });

        const allGroups = Object.values(groups).sort((a, b) => {
            const latestA = Math.max(...a.map(s => new Date(s.created_at).getTime()));
            const latestB = Math.max(...b.map(s => new Date(s.created_at).getTime()));
            return latestB - latestA;
        });

        // Sort: unviewed groups before fully viewed groups
        return allGroups.sort((a, b) => {
            const aAllViewed = a.every(s => viewedIds.has(s.id));
            const bAllViewed = b.every(s => viewedIds.has(s.id));
            if (aAllViewed && !bAllViewed) return 1;  // a goes after b
            if (!aAllViewed && bAllViewed) return -1; // a stays before b
            return 0; // Preserve relative order
        });
    }, [stories, viewedIds]);

    const handleStoryClick = (authorId: string) => {
        const firstIndex = stories.findIndex(s => s.author_id === authorId);
        if (firstIndex !== -1) setViewerIndex(firstIndex);
    };

    const getAvatarSrc = (url: string) => {
        if (!url) return '';
        if (url.startsWith('http')) return url;
        if (url.startsWith('/avatars/')) return url;
        const apiUrl = localStorage.getItem('active_community_url') || import.meta.env.VITE_API_URL || import.meta.env.VITE_COMMUNITY1_URL || 'http://localhost:8080';
        return `${apiUrl}${url}`;
    };

    const openAuthorId = useMemo(() => {
        if (viewerIndex === null) return undefined;
        return stories[viewerIndex]?.author_id;
    }, [viewerIndex, stories]);

    // Geometry helpers
    const itemWidth = 140;
    const totalItems = groupedStories.length + 1;
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1000;
    const contentWidth = Math.max(viewportWidth, totalItems * itemWidth + 200);

    const getPoint = (x: number) => {
        const period = 500;
        const amplitude = 25;
        const yOffset = 75;
        const y = Math.sin(x / (period / Math.PI)) * amplitude + yOffset;
        return { x, y };
    };

    const ribbonPoints = useMemo(() => {
        const pts = [];
        for (let x = -50; x <= contentWidth + 50; x += 20) pts.push(getPoint(x));
        return pts;
    }, [contentWidth]);

    const ribbonPath = useMemo(() => {
        if (ribbonPoints.length === 0) return '';
        return `M ${ribbonPoints[0].x} ${ribbonPoints[0].y} ` + ribbonPoints.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
    }, [ribbonPoints]);

    return (
        <>
            <style>{`
                @keyframes ribbon-flow {
                    from { stroke-dashoffset: 1000; }
                    to   { stroke-dashoffset: 0; }
                }
                .animate-ribbon { animation: ribbon-flow 30s linear infinite; }
                .orbital-spin   { animation: spin 20s linear infinite; }
                .orbital-spin-reverse { animation: spin 25s linear infinite reverse; }

                @keyframes story-ring-pulse {
                    0%, 100% { opacity: 1; }
                    50%       { opacity: 0.7; }
                }
                .story-ring-unviewed { animation: story-ring-pulse 2.5s ease-in-out infinite; }
            `}</style>

            <div
                className="relative w-full overflow-hidden mb-4 mt-2"
                style={{ maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)' }}
            >
                <div className="flex overflow-x-auto scrollbar-hide py-2 relative" style={{ scrollBehavior: 'smooth', minHeight: '200px' }}>
                    <div className="relative" style={{ width: contentWidth, minHeight: '200px' }}>

                        {/* Constellation Ribbon SVG */}
                        <svg className="absolute left-0 top-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
                            <defs>
                                <linearGradient id="glow-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="transparent" />
                                    <stop offset="50%" stopColor="rgba(var(--primary-rgb), 0.5)" />
                                    <stop offset="100%" stopColor="transparent" />
                                </linearGradient>
                            </defs>
                            <path d={ribbonPath} stroke="rgba(var(--primary-rgb), 0.1)" strokeWidth="15" fill="none" className="blur-xl" />
                            <path d={ribbonPath} stroke="rgba(255,255,255,0.05)" strokeWidth="1" fill="none" />
                            <path d={ribbonPath} stroke="url(#glow-gradient)" strokeWidth="2" fill="none"
                                strokeDasharray="300 700" strokeLinecap="round"
                                className="animate-ribbon mix-blend-screen" />
                        </svg>

                        {/* Add Story Node */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3 }}
                            className="absolute flex flex-col items-center cursor-pointer group z-10 -translate-x-1/2 -translate-y-1/2"
                            style={{ left: getPoint(100).x, top: getPoint(100).y }}
                            onClick={() => setIsCreateOpen(true)}
                        >
                            <div className="relative w-16 h-16 rounded-full flex items-center justify-center">
                                {/* Rotating dashed arc */}
                                <svg className="absolute inset-[-15px] w-[calc(100%+30px)] h-[calc(100%+30px)] pointer-events-none text-muted-foreground/30 orbital-spin-reverse">
                                    <circle cx="50%" cy="50%" r="46%" stroke="currentColor" strokeWidth="1" fill="none" strokeDasharray="10 20" />
                                </svg>
                                <div className="absolute inset-0 rounded-full bg-background/50 backdrop-blur-md border border-white/10 shadow-xl group-hover:scale-110 transition-transform duration-500 overflow-hidden flex items-center justify-center">
                                    {user?.avatar_url ? (
                                        <img src={user.avatar_url} alt="You" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                                    ) : (
                                        <span className="font-display font-bold text-xl text-muted-foreground">{user?.username?.[0]?.toUpperCase() || 'U'}</span>
                                    )}
                                </div>
                                <div className="absolute 0 0 w-7 h-7 rounded-full bg-primary/20 backdrop-blur-xl border border-primary/50 flex items-center justify-center text-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)] group-hover:scale-110 transition-transform z-20">
                                    <Plus className="w-4 h-4" />
                                </div>
                            </div>
                            <span className="text-xs font-semibold text-foreground/60 tracking-widest uppercase mt-4">Add Story</span>
                        </motion.div>

                        {/* Other User Story Nodes */}
                        {groupedStories.map((group, idx) => {
                            const latestStory = group[0];
                            const xPos = 100 + (idx + 1) * itemWidth;
                            const pos = getPoint(xPos);
                            const allViewed = group.every(s => viewedIds.has(s.id));

                            return (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.3, delay: idx * 0.05 }}
                                    key={latestStory.author_id}
                                    className="absolute flex flex-col items-center cursor-pointer group z-10 -translate-x-1/2 -translate-y-1/2"
                                    style={{ left: pos.x, top: pos.y }}
                                    onClick={() => handleStoryClick(latestStory.author_id)}
                                >
                                    <div className="relative w-16 h-16 rounded-full flex items-center justify-center">

                                        {/* ── Story Status Ring ─────────────────────── */}
                                        {/* Outer glow ring (unviewed only) */}
                                        {!allViewed && (
                                            <div
                                                className="absolute rounded-full story-ring-unviewed pointer-events-none"
                                                style={{
                                                    inset: '-5px',
                                                    background: 'conic-gradient(from 0deg, #f5a623, #f7c948, #e8890c, #f5a623)',
                                                    filter: 'blur(1px)',
                                                    opacity: 0.9,
                                                    zIndex: 1,
                                                }}
                                            />
                                        )}

                                        {/* Solid ring surface (clips the conic gradient into a ring shape) */}
                                        <div
                                            className="absolute rounded-full pointer-events-none"
                                            style={{
                                                inset: '-4px',
                                                background: allViewed
                                                    ? 'conic-gradient(from 0deg, #555, #888, #555)'
                                                    : 'conic-gradient(from 0deg, #f5a623, #f7c948, #e8890c, #f5a623)',
                                                zIndex: 2,
                                            }}
                                        />
                                        {/* Inner mask to make it a ring (not a filled circle) */}
                                        <div
                                            className="absolute rounded-full bg-background pointer-events-none"
                                            style={{ inset: '-1px', zIndex: 3 }}
                                        />

                                        {/* Radial halo */}
                                        <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl group-hover:bg-primary/40 transition-colors duration-700 z-0" />

                                        {/* Orbital arcs (for unviewed) */}
                                        {!allViewed && (
                                            <svg className="absolute inset-[-14px] w-[calc(100%+28px)] h-[calc(100%+28px)] pointer-events-none text-amber-400/40 opacity-60 mix-blend-screen" style={{ zIndex: 4 }}>
                                                <circle cx="50%" cy="50%" r="48%" stroke="currentColor" strokeWidth="1" fill="none" strokeDasharray="30 80" className="orbital-spin" />
                                            </svg>
                                        )}

                                        {/* Avatar */}
                                        <div className="relative w-full h-full rounded-full bg-background/80 backdrop-blur-xl overflow-hidden flex items-center justify-center shadow-[0_0_25px_-5px_rgba(var(--primary-rgb),0.4)] group-hover:scale-110 group-hover:shadow-[0_0_35px_-5px_rgba(var(--primary-rgb),0.6)] transition-all duration-500"
                                            style={{ zIndex: 5 }}>
                                            {latestStory.author_avatar ? (
                                                <img
                                                    src={getAvatarSrc(latestStory.author_avatar)}
                                                    alt={latestStory.author_name}
                                                    className={`w-full h-full object-cover transition-all duration-300 ${allViewed ? 'grayscale-[40%] opacity-70' : ''}`}
                                                />
                                            ) : (
                                                <span className={`font-display font-bold text-xl transition-colors ${allViewed ? 'text-foreground/40' : 'text-foreground/80'}`}>
                                                    {latestStory.author_name?.[0]?.toUpperCase()}
                                                </span>
                                            )}
                                        </div>

                                        {/* Connector dot */}
                                        <div className="absolute -bottom-1.5 w-1.5 h-1.5 rounded-full bg-primary/80 shadow-[0_0_10px_rgba(var(--primary-rgb),1)]" style={{ zIndex: 6 }} />
                                    </div>

                                    <span className={`text-xs font-semibold tracking-widest uppercase mt-4 group-hover:text-primary transition-colors ${allViewed ? 'text-foreground/40' : 'text-foreground/80'}`}>
                                        {latestStory.author_name}
                                    </span>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <CreateStoryModal open={isCreateOpen} onOpenChange={setIsCreateOpen} />

            {viewerIndex !== null && (
                <StoryViewerModal
                    open={viewerIndex !== null}
                    onClose={handleViewerClose}
                    initialStoryIndex={viewerIndex}
                    viewedIds={viewedIds}
                />
            )}
        </>
    );
};
