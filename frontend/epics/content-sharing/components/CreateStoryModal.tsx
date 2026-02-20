import React, { useState, useRef } from 'react';
import { useStoryStore } from '../store/storyStore';
import { messagingApi } from '../../messaging/api/client';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Image, Video, Camera, Loader2 } from 'lucide-react';
import { showToast } from '@/lib/toast';

interface CreateStoryModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const CreateStoryModal: React.FC<CreateStoryModalProps> = ({ open, onOpenChange }) => {
    const { createStory } = useStoryStore();
    const [content, setContent] = useState('');
    const [mediaUrl, setMediaUrl] = useState('');
    const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 20 * 1024 * 1024) { // 20MB limit for stories
                showToast.error("File is too large", "Max size is 20MB");
                return;
            }
            const isImage = file.type.startsWith('image/');
            const isVideo = file.type.startsWith('video/');
            if (!isImage && !isVideo) {
                showToast.error("Invalid file type", "Please upload an image or video");
                return;
            }

            // For preview, use object URL. But we need to save the actual file for submission.
            setMediaUrl(URL.createObjectURL(file));
            setMediaType(isImage ? 'image' : 'video');

            // We'll store the File object temporarily in a custom state or ref, or just fetch it from the input on submit
        }
    };

    const handleSubmit = async () => {
        const file = fileInputRef.current?.files?.[0];
        if (!file && !mediaUrl) {
            showToast.error("Please add a photo or video to your story");
            return;
        }

        setIsSubmitting(true);
        try {
            let finalMediaUrl = mediaUrl;

            if (file) {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('type', file.type);

                const response = await messagingApi.uploadMedia(formData);
                finalMediaUrl = response.url;
            }

            await createStory(finalMediaUrl, mediaType, content);
            showToast.success('Story posted successfully!');
            setContent('');
            setMediaUrl('');
            if (fileInputRef.current) fileInputRef.current.value = '';
            onOpenChange(false);
        } catch (error) {
            showToast.error('Failed to post story');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-card border-border/50">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 font-display text-xl">
                        <Camera className="w-5 h-5 text-accent" />
                        Create Story
                    </DialogTitle>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    {/* Media Preview Area */}
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*,video/*"
                        onChange={handleFileChange}
                    />
                    <div
                        className="w-full h-64 rounded-xl border-2 border-dashed border-border/50 flex flex-col items-center justify-center bg-secondary/20 relative overflow-hidden group cursor-pointer hover:bg-secondary/40 transition-colors"
                        onClick={() => !mediaUrl && fileInputRef.current?.click()}
                    >
                        {mediaUrl ? (
                            <>
                                {mediaType === 'image' ? (
                                    <img src={mediaUrl} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <video src={mediaUrl} className="w-full h-full object-cover" controls playsInline />
                                )}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Button variant="secondary" size="sm" onClick={(e) => {
                                        e.stopPropagation();
                                        setMediaUrl('');
                                        if (fileInputRef.current) fileInputRef.current.value = '';
                                    }}>
                                        Change Media
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <div className="text-center text-muted-foreground">
                                <div className="flex justify-center gap-4 mb-3">
                                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                        <Image className="w-6 h-6" />
                                    </div>
                                    <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
                                        <Video className="w-6 h-6" />
                                    </div>
                                </div>
                                <p className="font-medium text-sm">Click to upload photo or video</p>
                                <p className="text-xs opacity-70 mt-1">Image or Video up to 20MB</p>
                            </div>
                        )}
                    </div>

                    <Textarea
                        placeholder="Add a caption... (optional)"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="bg-secondary/50 border-input/50 resize-none h-20"
                    />
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!mediaUrl || isSubmitting}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-glow"
                    >
                        {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Share Story
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
