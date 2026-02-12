import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useContentStore } from '../store/contentStore';
import { Button } from '@/components/ui/button';
import { Send, Image, Hash, AtSign, X } from 'lucide-react';
import { useAuthStore } from '../../identity/store/authStore';
import { messagingApi } from '../../messaging/api/client';
import { getFollowers, searchUsers } from '../api/client';
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
    const [mentionSuggestions, setMentionSuggestions] = useState<PublicUser[]>([]);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
    const [mentionSearch, setMentionSearch] = useState('');
    const [caretPos, setCaretPos] = useState({ top: 0, left: 0 });

    const textareaRef = useRef<HTMLTextAreaElement>(null);
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

    const updateCaretPos = () => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const { selectionStart } = textarea;
        const textBeforeCaret = textarea.value.substring(0, selectionStart);

        // Create a temporary mirror element to calculate coordinates
        const div = document.createElement('div');
        const style = window.getComputedStyle(textarea);

        // Copy textarea styles to the mirror div
        const properties = [
            'direction', 'boxSizing', 'width', 'height', 'overflowX', 'overflowY',
            'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'borderStyle',
            'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
            'fontStyle', 'fontVariant', 'fontWeight', 'fontStretch', 'fontSize', 'fontSizeAdjust', 'lineHeight', 'fontFamily',
            'textAlign', 'textTransform', 'wordSpacing', 'letterSpacing', 'whiteSpace', 'wordBreak', 'wordWrap'
        ];

        properties.forEach(prop => {
            div.style[prop as any] = style.getPropertyValue(prop);
        });

        div.style.position = 'absolute';
        div.style.visibility = 'hidden';
        div.style.whiteSpace = 'pre-wrap';
        div.style.wordBreak = 'break-word';

        // Match the textarea's width exactly
        div.style.width = textarea.clientWidth + 'px';

        // Set the same text content up to the caret
        div.textContent = textBeforeCaret;

        // Add a span at the caret position to measure its coordinates
        const span = document.createElement('span');
        span.textContent = '|'; // Placeholder character
        div.appendChild(span);

        document.body.appendChild(div);

        // Get the coordinates relative to the textarea
        const { offsetTop, offsetLeft } = span;

        // Clean up
        document.body.removeChild(div);

        // Calculate viewport-relative coordinates
        const rect = textarea.getBoundingClientRect();

        setCaretPos({
            top: rect.top + offsetTop - textarea.scrollTop + 32, // Added more offset to be safely below line
            left: Math.min(rect.left + offsetLeft, window.innerWidth - 280) // Stay within viewport width
        });
    };

    const handleHashtagClick = () => {
        const textarea = textareaRef.current;
        if (!showHashtags && textarea) {
            textarea.focus();
            const cursor = textarea.selectionStart;
            const newValue = content.slice(0, cursor) + '#' + content.slice(cursor);
            setContent(newValue);
            setTimeout(() => textarea.setSelectionRange(cursor + 1, cursor + 1), 0);
        }
        setShowHashtags(!showHashtags);
        setShowMentions(false);
    };

    const handleAtClick = async () => {
        const textarea = textareaRef.current;
        if (!showMentions && textarea) {
            textarea.focus();
            const cursor = textarea.selectionStart;
            const newValue = content.slice(0, cursor) + '@' + content.slice(cursor);
            setContent(newValue);
            setTimeout(() => textarea.setSelectionRange(cursor + 1, cursor + 1), 0);
            setMentionSearch('');
        }
        setShowMentions(!showMentions);
        setShowHashtags(false);
        if (!showMentions && mentionSuggestions.length === 0) {
            setIsLoadingSuggestions(true);
            try {
                // Initial load: show more users for "all users" feel
                const data = await searchUsers('', 100);
                setMentionSuggestions(data);
            } catch (error) {
                console.error("Failed to load users", error);
            } finally {
                setIsLoadingSuggestions(false);
            }
        }
        updateCaretPos();
    };

    const insertHashtag = (tag: string) => {
        setContent(prev => prev + (prev.endsWith(' ') || prev === '' ? '' : ' ') + tag + ' ');
        setShowHashtags(false);
    };

    const insertMention = (username: string) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const cursor = textarea.selectionStart;
        const textBeforeCursor = content.slice(0, cursor);
        const textAfterCursor = content.slice(cursor);

        // Replace the @query with @username
        const newTextBeforeCursor = textBeforeCursor.replace(/@(\w*)$/, `@${username} `);
        const newContent = newTextBeforeCursor + textAfterCursor;

        setContent(newContent);
        setShowMentions(false);
        setMentionSearch('');

        // Focus back and move cursor
        setTimeout(() => {
            textarea.focus();
            const newCursorPos = newTextBeforeCursor.length;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
    };

    const handleContentChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        const cursor = e.target.selectionStart;
        setContent(value);

        // Check for word before cursor for mentions
        const textBeforeCursor = value.slice(0, cursor);
        const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

        if (mentionMatch) {
            const query = mentionMatch[1];
            setMentionSearch(query);
            setShowMentions(true);
            setShowHashtags(false);
            updateCaretPos();

            // Fetch users as user types
            setIsLoadingSuggestions(true);
            try {
                const data = await searchUsers(query, 100);
                setMentionSuggestions(data);
            } catch (error) {
                console.error("Failed to search users", error);
            } finally {
                setIsLoadingSuggestions(false);
            }
        } else {
            if (showMentions) setShowMentions(false);
        }

        // Hashtag trigger (optional, if we want same for #)
        const hashtagMatch = textBeforeCursor.match(/#(\w*)$/);
        if (hashtagMatch && !mentionMatch) {
            setShowHashtags(true);
            setShowMentions(false);
        } else if (!mentionMatch) {
            if (showHashtags) setShowHashtags(false);
        }
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

    const filteredSuggestions = mentionSuggestions; // Backend already filtered based on search query

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
                            ref={textareaRef}
                            value={content}
                            onChange={handleContentChange}
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

                    {/* Popups for Hashtags */}
                    {showHashtags && (
                        <div className="mt-3 mb-2 bg-card/50 border border-border/50 rounded-xl shadow-sm p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Trending Hashtags</div>
                            <div className="flex flex-wrap gap-2">
                                {TRENDING_HASHTAGS.map(tag => (
                                    <button
                                        key={tag}
                                        type="button"
                                        onClick={() => insertHashtag(tag)}
                                        className="px-3 py-1 bg-secondary hover:bg-primary/20 hover:text-primary rounded-full text-xs font-bold transition-colors"
                                    >
                                        {tag}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Floating Mention List */}
                    {showMentions && createPortal(
                        <div
                            className="fixed z-[9999] bg-card border border-border shadow-2xl rounded-xl p-2 w-64 animate-in fade-in zoom-in-95 duration-200"
                            style={{
                                top: caretPos.top,
                                left: caretPos.left,
                            }}
                        >
                            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 px-2 border-b border-border/50 pb-1.5 flex justify-between items-center">
                                <span>Mention User</span>
                                {isLoadingSuggestions && <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
                            </div>
                            <div className="max-h-[240px] overflow-y-auto space-y-1 scroller px-1">
                                {isLoadingSuggestions && mentionSuggestions.length === 0 ? (
                                    <div className="py-4 text-center text-xs text-muted-foreground">Searching...</div>
                                ) : filteredSuggestions.length > 0 ? (
                                    filteredSuggestions.map(user => (
                                        <button
                                            key={user.id}
                                            type="button"
                                            onClick={() => insertMention(user.username)}
                                            className="w-full flex items-center gap-2 p-2 hover:bg-secondary/80 rounded-lg text-left transition-colors group"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold border border-border group-hover:border-primary/30 transition-colors">
                                                {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full rounded-full object-cover" /> : user.username[0]?.toUpperCase()}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="text-sm font-bold truncate text-foreground group-hover:text-primary transition-colors">{user.display_name}</div>
                                                <div className="text-xs text-muted-foreground truncate">@{user.username}</div>
                                            </div>
                                        </button>
                                    ))
                                ) : (
                                    <div className="py-4 text-center text-xs text-muted-foreground italic">No users found</div>
                                )}
                            </div>
                        </div>,
                        document.body
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
            </div >
        </div >
    );
};
