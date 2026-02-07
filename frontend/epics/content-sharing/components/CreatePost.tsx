import React, { useState, useRef } from 'react';
import { useContentStore } from '../store/contentStore';
import { Button } from '@/components/ui/button';
import { Send, Image, Hash, AtSign, X } from 'lucide-react';
import { useAuthStore } from '../../identity/store/authStore';
import { messagingApi } from '../../messaging/api/client';
import { getFollowers } from '../api/client';
import type { PublicUser } from '../types';
import { cn } from '@/lib/utils';
import { showToast } from "@/lib/toast";

// CreatePost component allows users to publish new content
export const CreatePost: React.FC = () => {
    const [content, setContent] = useState('');
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const [mediaPreview, setMediaPreview] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    // Feature States
    const [showHashtags, setShowHashtags] = useState(false);
    const [showMentions, setShowMentions] = useState(false);
    const [followers, setFollowers] = useState<PublicUser[]>([]);
    const [isLoadingFollowers, setIsLoadingFollowers] = useState(false);
    const [mentionSearch, setMentionSearch] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const { createPost, loading } = useContentStore();
    const { user } = useAuthStore();

    // Mock hashtags (in a real app, fetch from backend)
    const TRENDING_HASHTAGS = ['#federation', '#decentralized', '#web3', '#tech', '#social', '#crypto', '#privacy', '#future'];

    const handleImageClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 10 * 1024 * 1024) { // 10MB limit
                showToast.error("File is too large", "Max size is 10MB");
                return;
            }
            if (!file.type.startsWith('image/')) {
                showToast.error("Invalid file type", "Please upload an image");
                return;
            }
            setMediaFile(file);
            setMediaPreview(URL.createObjectURL(file));
        }
    };

    const clearMedia = () => {
        setMediaFile(null);
        setMediaPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleHashtagClick = () => {
        setShowHashtags(!showHashtags);
        setShowMentions(false);
    };

    const handleAtClick = async () => {
        setShowMentions(!showMentions);
        setShowHashtags(false);
        if (!showMentions && followers.length === 0 && user?.id) {
            setIsLoadingFollowers(true);
            try {
                const data = await getFollowers(user.id);
                setFollowers(data);
            } catch (error) {
                console.error("Failed to load followers", error);
            } finally {
                setIsLoadingFollowers(false);
            }
        }
    };

    const insertText = (text: string) => {
        setContent(prev => prev + (prev.endsWith(' ') || prev === '' ? '' : ' ') + text + ' ');
        setShowHashtags(false);
        setShowMentions(false);
        setMentionSearch('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!content.trim() && !mediaFile) || isUploading) return;

        let mediaUrl = undefined;
        let mediaType = undefined;

        if (mediaFile) {
            setIsUploading(true);
            try {
                const formData = new FormData();
                formData.append('file', mediaFile);
                formData.append('type', mediaFile.type);
                // Reusing messaging API upload for now as it handles media securely
                const response = await messagingApi.uploadMedia(formData);
                mediaUrl = response.url;
                // Determine type from local file to be safe
                mediaType = mediaFile.type.startsWith('image/') ? 'image' : 'video';
            } catch (error) {
                showToast.error("Failed to upload image");
                setIsUploading(false);
                return;
            }
        }

        await createPost(content, mediaUrl, mediaType);
        setContent('');
        clearMedia();
        setIsUploading(false);
        setShowHashtags(false);
        setShowMentions(false);
    };

    const filteredFollowers = followers.filter(f =>
        f.username.toLowerCase().includes(mentionSearch.toLowerCase()) ||
        f.display_name.toLowerCase().includes(mentionSearch.toLowerCase())
    );

    return (
        <div className="create-post-card group relative">
            <div className="flex gap-4 p-6">
                <div className="hidden sm:block">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-gold p-[1px]">
                        <div className="w-full h-full rounded-[15px] bg-background flex items-center justify-center text-foreground font-bold text-lg">
                            {user?.username?.[0]?.toUpperCase() || 'U'}
                        </div>
                    </div>
                </div>
                <form onSubmit={handleSubmit} className="flex-1 space-y-4">
                    <div className="relative">
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Share something with the federation..."
                            maxLength={5000}
                            rows={3}
                            disabled={loading || isUploading}
                            className="w-full bg-transparent text-lg text-foreground placeholder:text-muted-foreground focus:outline-none transition-all resize-none min-h-[80px]"
                        />

                        {/* Media Preview */}
                        {mediaPreview && (
                            <div className="relative mt-2 inline-block">
                                <img src={mediaPreview} alt="Preview" className="h-48 rounded-lg object-cover border border-border" />
                                <button
                                    type="button"
                                    onClick={clearMedia}
                                    className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1 shadow-sm hover:scale-110 transition-transform"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Popups for Hashtags and Mentions */}
                    {(showHashtags || showMentions) && (
                        <div className="absolute left-0 right-0 z-20 mt-1 mx-4 bg-card border border-border rounded-xl shadow-2xl p-3 animate-in fade-in zoom-in-95 duration-200">
                            {showHashtags && (
                                <div>
                                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Trending Hashtags</div>
                                    <div className="flex flex-wrap gap-2">
                                        {TRENDING_HASHTAGS.map(tag => (
                                            <button
                                                key={tag}
                                                type="button"
                                                onClick={() => insertText(tag)}
                                                className="px-3 py-1 bg-secondary hover:bg-primary/20 hover:text-primary rounded-full text-xs font-bold transition-colors"
                                            >
                                                {tag}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {showMentions && (
                                <div>
                                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Mention User</div>
                                    <input
                                        type="text"
                                        placeholder="Search followers..."
                                        className="w-full bg-secondary/50 border-border/50 rounded-lg px-3 py-2 text-sm mb-2 focus:ring-1 focus:ring-primary focus:outline-none"
                                        value={mentionSearch}
                                        onChange={e => setMentionSearch(e.target.value)}
                                        autoFocus
                                    />
                                    <div className="max-h-[200px] overflow-y-auto space-y-1 scroller">
                                        {isLoadingFollowers ? (
                                            <div className="py-4 text-center text-xs text-muted-foreground">Loading...</div>
                                        ) : filteredFollowers.length > 0 ? (
                                            filteredFollowers.map(follower => (
                                                <button
                                                    key={follower.id}
                                                    type="button"
                                                    onClick={() => insertText(`@${follower.username}`)}
                                                    className="w-full flex items-center gap-2 p-2 hover:bg-secondary/80 rounded-lg text-left transition-colors"
                                                >
                                                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold border border-border">
                                                        {follower.avatar_url ? <img src={follower.avatar_url} className="w-full h-full rounded-full object-cover" /> : follower.username[0]?.toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="text-sm font-bold truncate">{follower.display_name}</div>
                                                        <div className="text-xs text-muted-foreground truncate">@{follower.username}</div>
                                                    </div>
                                                </button>
                                            ))
                                        ) : (
                                            <div className="py-4 text-center text-xs text-muted-foreground">No followers found</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-border/30">
                        <div className="flex items-center gap-1">
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleFileChange}
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className={cn("h-9 w-9 rounded-full transition-colors", mediaFile ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary hover:bg-primary/10")}
                                onClick={handleImageClick}
                                title="Upload Image"
                            >
                                <Image className="w-4 h-4" />
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className={cn("h-9 w-9 rounded-full transition-colors", showHashtags ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary hover:bg-primary/10")}
                                onClick={handleHashtagClick}
                                title="Add Hashtag"
                            >
                                <Hash className="w-4 h-4" />
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className={cn("h-9 w-9 rounded-full transition-colors", showMentions ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary hover:bg-primary/10")}
                                onClick={handleAtClick}
                                title="Mention User"
                            >
                                <AtSign className="w-4 h-4" />
                            </Button>
                        </div>

                        <div className="flex items-center gap-4">
                            <span className="text-[11px] text-muted-foreground uppercase tracking-widest font-bold hidden sm:inline">
                                {content.length} / 5000
                            </span>
                            <Button
                                type="submit"
                                variant="hero"
                                disabled={loading || isUploading || (!content.trim() && !mediaFile)}
                                className="px-6 rounded-full shadow-lg shadow-primary/20"
                            >
                                {loading || isUploading ? 'Publishing...' : (
                                    <>
                                        Publish
                                        <Send className="w-4 h-4 ml-2" />
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};
