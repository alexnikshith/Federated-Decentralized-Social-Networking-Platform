import React, { useState } from 'react';
import { useAuthStore } from '../../../epics/identity/store/authStore';
import { Image, Video, Paperclip, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const InlineComposeBox: React.FC = () => {
    const { user } = useAuthStore();
    const [content, setContent] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Since we already have a full compose modal, this could either trigger the modal
        // or directly call the createPost API. For now, it will act as a dummy trigger.
        if (content.trim()) {
            console.log("Submit post:", content);
            setContent("");
        }
    };

    return (
        <div className="glass-card rounded-xl p-4 mb-6">
            <div className="flex gap-4">
                <div className="hidden sm:block">
                    {user?.avatar_url ? (
                        <img src={user.avatar_url} alt="You" className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-display font-bold text-lg">
                            {user?.username?.[0]?.toUpperCase() || 'U'}
                        </div>
                    )}
                </div>
                <div className="flex-1 space-y-3">
                    <form onSubmit={handleSubmit} className="relative">
                        <textarea
                            className="w-full bg-secondary/50 border border-border/50 rounded-xl p-3 text-sm min-h-[80px] focus:ring-1 focus:ring-primary/50 resize-none placeholder:text-muted-foreground/70"
                            placeholder="What's happening in your network?"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                        />
                        <div className="flex items-center justify-between mt-2">
                            <div className="flex gap-1 text-muted-foreground">
                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 hover:text-primary hover:bg-primary/10 rounded-full">
                                    <Image className="w-4 h-4" />
                                </Button>
                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 hover:text-primary hover:bg-primary/10 rounded-full">
                                    <Video className="w-4 h-4" />
                                </Button>
                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 hover:text-primary hover:bg-primary/10 rounded-full">
                                    <Paperclip className="w-4 h-4" />
                                </Button>
                            </div>
                            <Button
                                type="submit"
                                size="sm"
                                disabled={!content.trim()}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4 rounded-full shadow-glow disabled:opacity-50"
                            >
                                <Send className="w-4 h-4 mr-2" />
                                Post
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
