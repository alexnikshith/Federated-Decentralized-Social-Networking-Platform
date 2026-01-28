import React, { useState } from 'react';
import { useContentStore } from '../store/contentStore';
import { Button } from '@/components/ui/button';
import { Send, Image, Hash, AtSign } from 'lucide-react';
import { useAuthStore } from '../../identity/store/authStore';

export const CreatePost: React.FC = () => {
    const [content, setContent] = useState('');
    const { createPost, loading } = useContentStore();
    const { user } = useAuthStore();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;

        await createPost(content);
        setContent('');
    };

    return (
        <div className="create-post-card group">
            <div className="flex gap-4 p-6">
                <div className="hidden sm:block">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-gold p-[1px]">
                        <div className="w-full h-full rounded-[15px] bg-background flex items-center justify-center text-foreground font-bold text-lg">
                            {user?.username?.[0]?.toUpperCase() || 'U'}
                        </div>
                    </div>
                </div>
                <form onSubmit={handleSubmit} className="flex-1">
                    <div className="relative">
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Share something with the federation..."
                            maxLength={5000}
                            rows={3}
                            disabled={loading}
                            className="w-full bg-transparent text-lg text-foreground placeholder:text-muted-foreground focus:outline-none transition-all resize-none min-h-[120px]"
                        />
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/30">
                        <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full">
                                <Image className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full">
                                <Hash className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full">
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
                                disabled={loading || !content.trim()}
                                className="px-6 rounded-full shadow-lg shadow-primary/20"
                            >
                                {loading ? '...' : (
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
