import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../identity/store/authStore';
import { messagingApi } from '../api/client';
import { Conversation, Message, Participant } from '../types';
import {
    Search,
    Send,
    Camera,
    FileText,
    MoreVertical,
    ArrowLeft,
    Loader2,
    Smile,
    Paperclip,
    MessageSquare
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { UserSearch } from '../../content-sharing/components/UserSearch';
import { motion, AnimatePresence } from 'motion/react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { DeleteConfirmDialog } from '../components/DeleteConfirmDialog';
import { useMessagingStore } from '../store/messagingStore';
import { MessagingSkeleton } from '@/components/skeletons/page-skeletons';

// MessagingUI handles the full chat interface
// Features: Real-time messaging (WebSocket), Media uploads, Conversation management
const MessagingUI: React.FC = () => {
    // URL Params for deep linking (e.g., "Message User" button from profile)
    const [searchParams, setSearchParams] = useSearchParams();
    const { user: currentUser } = useAuthStore();
    const { refreshUnreadCount } = useMessagingStore();

    // Local State
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [messageInput, setMessageInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [showSearch, setShowSearch] = useState(false);

    // Refs
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const { token } = useAuthStore();

    // Media State
    const [selectedMedia, setSelectedMedia] = useState<{
        file: File;
        preview: string;
        type: 'image' | 'video' | 'file';
    } | null>(null);
    const [uploadingMedia, setUploadingMedia] = useState(false);
    const [sending, setSending] = useState(false);

    // New Chat State (Virtual conversation before first message)
    const [isNewChat, setIsNewChat] = useState(false);
    const [newChatUser, setNewChatUser] = useState<Participant | null>(null);

    // Delete dialog state
    const [deleteDialog, setDeleteDialog] = useState<{
        isOpen: boolean;
        type: 'message' | 'conversation';
        id: string | null;
    }>({ isOpen: false, type: 'message', id: null });

    // Resizable sidebar state
    const [sidebarWidth, setSidebarWidth] = useState(340);
    const [isDragging, setIsDragging] = useState(false);

    // Track if it's the first load of messages for a conversation to scroll instantly
    const isInitialLoad = useRef(true);

    // Suppress loadMessages when transitioning from isNewChat (messages already in state)
    const skipNextMessageLoad = useRef(false);

    // Ensure conversations is ALWAYS an array even if state somehow becomes null
    const safeConversations = Array.isArray(conversations) ? conversations : [];

    // Initialize Conversations
    useEffect(() => {
        loadConversations();

        // WebSocket Connection Setup
        if (!token) return;

        const apiUrl = localStorage.getItem('active_community_url') || import.meta.env.VITE_API_URL || import.meta.env.VITE_COMMUNITY1_URL || 'http://localhost:8080';
        const wsProtocol = apiUrl.startsWith('https') ? 'wss' : 'ws';
        const wsUrl = `${apiUrl.replace(/^http[s]?:\/\//, '')}/ws?token=${token}`;
        const socketUrl = `${wsProtocol}://${wsUrl}`;

        const ws = new WebSocket(socketUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log('Connected to WebSocket');
        };

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                if (message.type === 'new_message') {
                    const newMsg = message.payload;
                    console.log('Received message:', newMsg);

                    // Update messages if we have this conversation open
                    setSelectedConversation(prev => {
                        if (prev && prev.id === newMsg.conversation_id ||
                            (prev && prev.participants.some((p: Participant) => p.id === newMsg.sender_id))) {
                            setMessages(currentMessages => {
                                // specific check to avoid duplicates if we also optimized sending
                                if (currentMessages.some(m => m.id === newMsg.id)) return currentMessages;
                                return [...currentMessages, newMsg];
                            });
                            return prev;
                        }
                        return prev;
                    });

                    // Always refresh conversations list to show new message preview / order
                    loadConversations();
                }
            } catch (error) {
                console.error('Error parsing WS message:', error);
            }
        };

        ws.onclose = () => {
            console.log('WebSocket disconnected');
        };

        return () => {
            ws.close();
        };
    }, [token]);

    // Load messages when conversation is selected
    useEffect(() => {
        if (selectedConversation?.id) {
            if (skipNextMessageLoad.current) {
                // Skip reload — messages are already in state (first message in new chat)
                skipNextMessageLoad.current = false;
                return;
            }
            isInitialLoad.current = true;
            loadMessages(selectedConversation.id);
        }
    }, [selectedConversation?.id]);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (!loadingMessages && messages.length > 0) {
            if (isInitialLoad.current) {
                // Initial load: Snap to bottom instantly
                scrollToBottom('auto');
                isInitialLoad.current = false;
            } else {
                // New messages: Scroll smoothly
                scrollToBottom('smooth');
            }
        }
    }, [messages, loadingMessages]);

    // Keyboard shortcuts (Escape to close chat)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setSelectedConversation(null);
                setIsNewChat(false);
                setNewChatUser(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Sidebar resize handlers
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            let newWidth = e.clientX;
            if (newWidth < 250) newWidth = 250;
            if (newWidth > window.innerWidth - 350) newWidth = window.innerWidth - 350;
            setSidebarWidth(newWidth);
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.userSelect = 'none'; // Prevent text selection while dragging
        } else {
            document.body.style.userSelect = '';
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.userSelect = '';
        };
    }, [isDragging]);

    const handleDeleteMessage = async (messageId: string) => {
        try {
            await messagingApi.deleteMessage(messageId);
            setMessages(prev => (Array.isArray(prev) ? prev : []).filter(msg => msg.id !== messageId));
            toast({
                title: "Message deleted",
                description: "The message has been removed.",
            });
        } catch (error) {
            console.error('Failed to delete message:', error);
            toast({
                title: "Error",
                description: "Failed to delete message.",
                variant: "destructive",
            });
        }
    };

    const handleDeleteConversation = async (conversationId: string) => {
        try {
            await messagingApi.deleteConversation(conversationId);
            setConversations(prev => (Array.isArray(prev) ? prev : []).filter(conv => conv.id !== conversationId));
            setSelectedConversation(null);
            setMessages([]);
            toast({
                title: "Chat deleted",
                description: "The conversation has been removed.",
            });
        } catch (error) {
            console.error('Failed to delete conversation:', error);
            toast({
                title: "Error",
                description: "Failed to delete conversation.",
                variant: "destructive",
            });
        }
    };

    const loadConversations = async () => {
        if (conversations.length === 0) setLoading(true);
        try {
            const data = await messagingApi.getConversations();
            const convs = Array.isArray(data) ? data : [];
            setConversations(convs);

            // Handle initial user selection from query params
            const targetUserId = searchParams.get('userId');
            const targetUsername = searchParams.get('username');

            if (targetUserId) {
                const existing = convs.find(c => c.participants.some(p => p.id === targetUserId));
                if (existing) {
                    setSelectedConversation(existing);
                } else if (targetUsername) {
                    // Start a virtual new chat session
                    setIsNewChat(true);
                    setNewChatUser({
                        id: targetUserId,
                        username: targetUsername,
                        avatar_url: '' // Will be updated if/when they send message
                    });
                }
                // Clear params after processing
                setSearchParams({}, { replace: true });
            }
            return convs;
        } catch (error) {
            console.error('Failed to load conversations:', error);
            setConversations([]);
            return [];
        } finally {
            setLoading(false);
        }
    };

    const loadMessages = async (convId: string) => {
        if (!convId) return;
        setLoadingMessages(true);
        try {
            const data = await messagingApi.getMessages(convId);

            // Don't filter messages - show all messages in the conversation
            setMessages(Array.isArray(data) ? data : []);

            // Mark conversation as read
            try {
                await messagingApi.markConversationAsRead(convId);
                // Refresh conversations to update unread count
                loadConversations();
                // Refresh global unread count
                refreshUnreadCount();
            } catch (error) {
                console.error('Failed to mark as read:', error);
            }
        } catch (error) {
            console.error('Failed to load messages:', error);
            setMessages([]);
        } finally {
            setLoadingMessages(false);
        }
    };

    const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const mediaType = file.type.startsWith('image/') ? 'image' :
            file.type.startsWith('video/') ? 'video' : 'file';

        const preview = URL.createObjectURL(file);
        setSelectedMedia({ file, preview, type: mediaType });

        // Reset inputs
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if ((!messageInput.trim() && !selectedMedia) || !currentUser || sending) return;
        if (!selectedConversation && !isNewChat) return;

        let receiverId: string;
        let receiverCommunityUrl: string | undefined;
        if (selectedConversation) {
            const participants = selectedConversation.participants || [];
            const receiver = participants.find(p => p.id !== currentUser.id);
            if (!receiver) return;
            receiverId = receiver.id;
            receiverCommunityUrl = receiver.community_url;
        } else if (newChatUser) {
            receiverId = newChatUser.id;
            receiverCommunityUrl = newChatUser.community_url;
        } else {
            return;
        }

        setSending(true);

        try {
            let mediaUrl = '';
            let mediaType = 'text';
            let fileName = '';

            if (selectedMedia) {
                setUploadingMedia(true);
                const formData = new FormData();
                formData.append('file', selectedMedia.file);
                formData.append('type', selectedMedia.type);

                const response = await messagingApi.uploadMedia(formData);
                mediaUrl = response.url;
                mediaType = selectedMedia.type;
                fileName = selectedMedia.file.name;
            }

            const newMsg = await messagingApi.sendMessage({
                receiver_id: receiverId,
                content: messageInput.trim(),
                type: mediaType as any,
                media_url: mediaUrl,
                file_name: fileName,
                receiver_community_url: receiverCommunityUrl
            });

            setMessages(prev => {
                const currentPrev = Array.isArray(prev) ? prev : [];
                if (currentPrev.some(m => m.id === newMsg.id)) return currentPrev;
                return [...currentPrev, newMsg];
            });
            setMessageInput('');
            setSelectedMedia(null);
            setUploadingMedia(false);

            if (isNewChat) {
                // Flag to suppress the loadMessages that fires when selectedConversation changes
                // because messages are already in state (optimistically added above)
                skipNextMessageLoad.current = true;
                const updatedConvs = await loadConversations();
                setIsNewChat(false);
                setNewChatUser(null);
                const newConv = updatedConvs.find(c => c.participants.some(p => p.id === receiverId));
                if (newConv) {
                    setSelectedConversation(newConv);
                }
            } else if (selectedConversation) {
                setConversations(prev => {
                    const currentPrev = Array.isArray(prev) ? prev : [];
                    return currentPrev.map(c =>
                        c.id === selectedConversation.id
                            ? { ...c, last_message: newMsg, updated_at: newMsg.created_at }
                            : c
                    ).sort((a, b) => {
                        const dateA = new Date(a.updated_at || 0).getTime();
                        const dateB = new Date(b.updated_at || 0).getTime();
                        return dateB - dateA;
                    });
                });
            }
        } catch (error) {
            console.error('Failed to send message:', error);
            setUploadingMedia(false);
        } finally {
            setSending(false);
        }
    };

    const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior });
        }
    };

    const getOtherParticipant = (participants: Participant[]) => {
        if (!Array.isArray(participants) || participants.length === 0) {
            return { username: 'User', avatar_url: '' } as Participant;
        }
        return participants.find(p => p.id !== currentUser?.id) || participants[0];
    };

    const safeFormat = (dateStr: string | undefined, formatStr: string) => {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return '';
            return format(date, formatStr);
        } catch {
            return '';
        }
    };

    const getMessageDateLabel = (dateStr: string) => {
        if (!dateStr) return '';
        try {
            const messageDate = new Date(dateStr);
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            // Reset time parts for comparison
            const messageDateOnly = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate());
            const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

            if (messageDateOnly.getTime() === todayOnly.getTime()) {
                return 'Today';
            } else if (messageDateOnly.getTime() === yesterdayOnly.getTime()) {
                return 'Yesterday';
            } else {
                return format(messageDate, 'MMM dd, yyyy');
            }
        } catch {
            return '';
        }
    };

    const shouldShowDateSeparator = (currentMsg: Message, prevMsg: Message | null) => {
        if (!prevMsg) return true;

        try {
            const currentDate = new Date(currentMsg.created_at);
            const prevDate = new Date(prevMsg.created_at);

            const currentDateOnly = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
            const prevDateOnly = new Date(prevDate.getFullYear(), prevDate.getMonth(), prevDate.getDate());

            return currentDateOnly.getTime() !== prevDateOnly.getTime();
        } catch {
            return false;
        }
    };

    if (loading) {
        return <MessagingSkeleton />;
    }

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden relative border-t border-white/5 bg-background">
            {/* Background mesh glow to give glass elements depth */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none" />

            {/* Conversation List Sidebar */}
            <div
                className={cn(
                    "w-full md:w-[var(--sidebar-width)] border-r border-black/5 dark:border-white/5 flex flex-col relative z-40 glass-card bg-background/20 backdrop-blur-3xl shadow-[4px_0_24px_-10px_rgba(0,0,0,0.5)] flex-shrink-0",
                    !isDragging && "transition-all duration-300",
                    (selectedConversation || isNewChat) && "hidden md:flex"
                )}
                style={{ '--sidebar-width': `${sidebarWidth}px` } as React.CSSProperties}
            >
                {/* Drag Handle */}
                <div
                    className="hidden md:block absolute right-[-3px] top-0 bottom-0 w-[6px] cursor-col-resize z-50 hover:bg-primary/50 active:bg-primary transition-colors"
                    onMouseDown={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                    }}
                />

                {/* Subtle Sidebar Inner Gradient */}
                <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />

                <div className="p-5 border-b border-white/5 flex justify-between items-center bg-transparent relative z-20">
                    <h2 className="text-xl font-bold font-display text-transparent bg-clip-text bg-gradient-to-r from-foreground to-foreground/70">Messages</h2>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full"
                        onClick={() => setShowSearch(true)}
                    >
                        <Search className="w-5 h-5" />
                    </Button>
                </div>

                <ScrollArea className="flex-1">
                    {safeConversations.length === 0 ? (
                        <div className="p-10 text-center flex flex-col items-center">
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="w-16 h-16 bg-gradient-to-tr from-primary/20 to-primary/5 rounded-full flex items-center justify-center mb-4 shadow-glow"
                            >
                                <MessageSquare className="w-8 h-8 text-primary" />
                            </motion.div>
                            <p className="text-sm font-bold text-foreground mb-1">No messages yet</p>
                            <p className="text-xs text-muted-foreground mb-4">Connect with your community.</p>
                            <Button className="rounded-full shadow-glow bg-primary hover:bg-primary/90 text-primary-foreground font-bold" onClick={() => setShowSearch(true)}>Start a chat</Button>
                        </div>
                    ) : (
                        <div className="py-6 px-2 relative space-y-6">
                            {/* The Stream Line */}
                            <div className="absolute left-[38px] top-6 bottom-6 w-px bg-gradient-to-b from-transparent via-black/10 dark:via-white/10 to-transparent z-0" />

                            {safeConversations.map((conv) => {
                                if (!conv) return null;
                                const other = getOtherParticipant(conv.participants);
                                const isSelected = selectedConversation?.id === conv.id;
                                return (
                                    <div
                                        key={conv.id}
                                        onClick={() => {
                                            setSelectedConversation(conv);
                                            setIsNewChat(false);
                                            setNewChatUser(null);
                                        }}
                                        className="relative flex items-start gap-4 px-2 group cursor-pointer z-10"
                                    >
                                        {/* Avatar on the stream */}
                                        <div className={cn(
                                            "relative z-10 flex-shrink-0 transition-transform duration-300",
                                            isSelected ? "scale-110" : "group-hover:scale-105"
                                        )}>
                                            {isSelected && (
                                                <div className="absolute inset-0 bg-primary/40 blur-xl rounded-full z-0" />
                                            )}
                                            <Avatar className={cn(
                                                "w-10 h-10 border-2 relative z-10",
                                                isSelected ? "border-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]" : "border-background ring-1 ring-white/10"
                                            )}>
                                                <AvatarImage src={other.avatar_url} />
                                                <AvatarFallback className="bg-secondary/80 backdrop-blur-md">{(other.username || 'U')[0].toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                        </div>

                                        {/* Conversation Details */}
                                        <div className={cn(
                                            "flex-1 min-w-0 pb-4 relative",
                                            "border-l-2 pl-4 transition-all duration-300",
                                            isSelected ? "border-primary/50" : "border-white/5 group-hover:border-white/20"
                                        )}>
                                            {/* Ambient glow matching chat UI */}
                                            {isSelected && (
                                                <div className="absolute top-1/2 -left-4 -translate-y-1/2 w-[120%] h-[150%] bg-gradient-to-r from-primary/10 via-primary/5 to-transparent blur-2xl -z-10 mix-blend-screen pointer-events-none rounded-r-3xl" />
                                            )}

                                            <div className="flex justify-between items-start mb-1">
                                                <div className="flex flex-col min-w-0">
                                                    <span className={cn(
                                                        "font-bold text-[14px] truncate transition-colors",
                                                        isSelected ? "text-primary" : "text-foreground/90 group-hover:text-foreground",
                                                        (other.is_deleted || other.is_deactivated) && "italic text-muted-foreground"
                                                    )}>
                                                        {other.is_deactivated ? "Nexus User" : (other.display_name || other.username)}
                                                    </span>
                                                    {other.community_name && (
                                                        <span className="text-[9px] text-muted-foreground font-bold tracking-widest uppercase truncate opacity-70">
                                                            from {other.community_name}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className={cn(
                                                    "text-[10px] font-bold tracking-widest uppercase whitespace-nowrap mt-1",
                                                    isSelected ? "text-primary/70" : "text-muted-foreground/40 text-foreground"
                                                )}>
                                                    {conv.last_message && safeFormat(conv.last_message.created_at, 'HH:mm')}
                                                </span>
                                            </div>

                                            <div className="flex justify-between items-start gap-3 mt-1.5">
                                                <p className={cn(
                                                    "text-[13px] leading-snug truncate flex-1 transition-colors mix-blend-normal",
                                                    isSelected ? "text-foreground" : (conv.unread_count && conv.unread_count > 0 ? "font-semibold text-foreground" : "text-muted-foreground/70")
                                                )}>
                                                    {conv.last_message?.content || "Start messaging..."}
                                                </p>
                                                {conv.unread_count !== undefined && conv.unread_count > 0 && (
                                                    <span className="bg-primary/20 text-primary border border-primary/30 shadow-[0_0_10px_rgba(var(--primary-rgb),0.3)] text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center justify-center">
                                                        {conv.unread_count} new
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </ScrollArea>
            </div>

            {/* Chat Window */}
            <div className={cn(
                "flex-1 flex flex-col relative z-20 bg-transparent shadow-2xl",
                (!selectedConversation && !isNewChat) && "hidden md:flex justify-center items-center text-muted-foreground p-12"
            )}>
                {(selectedConversation || isNewChat) ? (
                    <>
                        {/* Chat Header */}
                        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-card/40 backdrop-blur-xl sticky top-0 z-30 shadow-sm">
                            <div className="flex items-center gap-3">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="md:hidden"
                                    onClick={() => {
                                        setSelectedConversation(null);
                                        setIsNewChat(false);
                                    }}
                                >
                                    <ArrowLeft className="w-5 h-5" />
                                </Button>
                                <Avatar className="w-10 h-10">
                                    <AvatarImage src={isNewChat ? newChatUser?.avatar_url : getOtherParticipant(selectedConversation!.participants).avatar_url} />
                                    <AvatarFallback>{((isNewChat ? newChatUser?.username : getOtherParticipant(selectedConversation!.participants).username) || 'U')[0].toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <h3 className={cn(
                                        "font-bold text-sm leading-none",
                                        !isNewChat && (getOtherParticipant(selectedConversation!.participants).is_deleted || getOtherParticipant(selectedConversation!.participants).is_deactivated) && "italic text-muted-foreground"
                                    )}>
                                        {isNewChat ? (newChatUser?.display_name || newChatUser?.username) : (
                                            getOtherParticipant(selectedConversation!.participants).is_deactivated
                                                ? "Nexus User"
                                                : (getOtherParticipant(selectedConversation!.participants).display_name || getOtherParticipant(selectedConversation!.participants).username)
                                        )}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        {(isNewChat ? (newChatUser?.instance || newChatUser?.community_name) : getOtherParticipant(selectedConversation!.participants).community_name) && (
                                            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter opacity-70">
                                                from {isNewChat ? (newChatUser?.instance || newChatUser?.community_name) : getOtherParticipant(selectedConversation!.participants).community_name}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="rounded-full">
                                        <MoreVertical className="w-5 h-5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                        className="text-destructive cursor-pointer"
                                        onClick={() => selectedConversation && setDeleteDialog({ isOpen: true, type: 'conversation', id: selectedConversation.id })}
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Delete Chat
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        {/* Messages Area */}
                        <ScrollArea className="flex-1 p-4">
                            {loadingMessages ? (
                                <div className="h-full flex items-center justify-center">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                </div>
                            ) : (
                                <div className="space-y-2 pb-8 relative w-full max-w-5xl mx-auto px-4 lg:px-6 before:absolute before:inset-y-0 before:left-1/2 before:-translate-x-1/2 before:w-px before:bg-gradient-to-b before:from-transparent before:via-black/5 dark:before:via-white/5 before:to-transparent">
                                    {(messages || []).map((msg, idx) => {
                                        if (!msg) return null;
                                        const isMine = msg.sender_id === currentUser?.id;
                                        const safeMessages = Array.isArray(messages) ? messages : [];
                                        const prevMsg = idx > 0 ? safeMessages[idx - 1] : null;
                                        const sameSenderAsPrev = prevMsg?.sender_id === msg.sender_id;
                                        const showDateSeparator = shouldShowDateSeparator(msg, prevMsg);

                                        return (
                                            <React.Fragment key={msg.id || idx}>
                                                {/* Date Separator */}
                                                {showDateSeparator && (
                                                    <div className="flex items-center justify-center my-10 relative z-10">
                                                        <div className="px-5 py-1.5 bg-background/60 backdrop-blur-xl rounded-full text-[10px] font-display font-medium tracking-[0.2em] text-muted-foreground uppercase border border-white/5 shadow-inner">
                                                            {getMessageDateLabel(msg.created_at)}
                                                        </div>
                                                    </div>
                                                )}

                                                <motion.div
                                                    initial={{ opacity: 0, y: 15, filter: 'blur(8px)' }}
                                                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                                                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                                                    className={cn(
                                                        "flex group relative w-full items-start gap-6",
                                                        sameSenderAsPrev ? "mt-1" : "mt-8",
                                                        isMine ? "flex-row-reverse" : "flex-row"
                                                    )}
                                                >
                                                    {/* Subtle Avatar for non-mine if not same sender - drifting in the current */}
                                                    {!isMine && !sameSenderAsPrev ? (
                                                        <Avatar className="w-8 h-8 shrink-0 mt-1 ring-1 ring-primary/20 bg-background/50 shadow-[0_0_15px_rgba(var(--primary-rgb),0.2)]">
                                                            <AvatarImage src={getOtherParticipant(selectedConversation!.participants).avatar_url} />
                                                            <AvatarFallback className="text-xs">{getOtherParticipant(selectedConversation!.participants).username[0]?.toUpperCase()}</AvatarFallback>
                                                        </Avatar>
                                                    ) : !isMine && sameSenderAsPrev ? (
                                                        <div className="w-8 shrink-0" />
                                                    ) : null}

                                                    {/* The Current (Text block) */}
                                                    <div className={cn(
                                                        "flex-1 min-w-0 relative max-w-[85%]",
                                                        isMine ? "flex flex-col items-end text-right" : "flex flex-col items-start text-left"
                                                    )}>
                                                        {/* Ambient Background Glow for "Mine" - flows behind text */}
                                                        {isMine && (
                                                            <div className="absolute top-1/2 -right-4 -translate-y-1/2 w-[120%] h-[150%] bg-gradient-to-l from-primary/10 via-primary/5 to-transparent blur-2xl -z-10 mix-blend-screen pointer-events-none rounded-full" />
                                                        )}

                                                        {/* Ambient Background Glow for "Theirs" */}
                                                        {!isMine && (
                                                            <div className="absolute top-1/2 -left-4 -translate-y-1/2 w-[120%] h-[150%] bg-gradient-to-r from-accent/10 via-accent/5 to-transparent blur-2xl -z-10 mix-blend-screen pointer-events-none rounded-full" />
                                                        )}

                                                        <div className={cn(
                                                            "relative z-10 text-[15px] leading-relaxed tracking-wide group-hover:text-foreground transition-colors mix-blend-normal",
                                                            isMine
                                                                ? "text-foreground/90 pr-4 border-r-2 border-primary/20"
                                                                : "text-foreground/80 pl-4 border-l-2 border-accent/20"
                                                        )}>
                                                            {/* Media Rendering */}
                                                            {msg.type === 'image' && msg.media_url && (
                                                                <div className={cn("mb-3 rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative group/img cursor-pointer", isMine ? "ml-auto" : "mr-auto")} onClick={() => window.open(msg.media_url?.startsWith('http') ? msg.media_url : `${import.meta.env.VITE_API_URL}${msg.media_url}`)}>
                                                                    <div className="absolute inset-0 bg-primary/20 mix-blend-overlay opacity-0 group-hover/img:opacity-100 transition-opacity pointer-events-none" />
                                                                    <img
                                                                        src={msg.media_url.startsWith('http') ? msg.media_url : `${import.meta.env.VITE_API_URL}${msg.media_url}`}
                                                                        alt="attachment"
                                                                        className="max-w-[280px] w-full h-auto max-h-80 object-cover"
                                                                        onError={(e) => (e.currentTarget.src = "/placeholder-image.png")}
                                                                    />
                                                                </div>
                                                            )}
                                                            {msg.type === 'file' && (
                                                                <a
                                                                    href={msg.media_url?.startsWith('http') ? msg.media_url : `${import.meta.env.VITE_API_URL}${msg.media_url}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className={cn("inline-flex items-center gap-3 px-4 py-3 bg-secondary/20 backdrop-blur-md rounded-2xl mb-3 hover:bg-secondary/40 transition-all border border-white/5", isMine ? "ml-auto" : "mr-auto")}
                                                                >
                                                                    <div className="p-2 bg-primary/10 rounded-xl">
                                                                        <FileText className="w-4 h-4 text-primary" />
                                                                    </div>
                                                                    <span className="text-sm font-medium truncate max-w-[200px]">{msg.file_name || 'Download file'}</span>
                                                                </a>
                                                            )}

                                                            <p className={cn("break-words", isMine ? "text-foreground/90 font-medium" : "text-foreground/80")}>
                                                                {msg.content}
                                                            </p>

                                                            {/* Flow Details & Actions */}
                                                            <div className={cn(
                                                                "flex items-center gap-3 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300",
                                                                isMine ? "justify-end pr-1" : "justify-start pl-1"
                                                            )}>
                                                                {isMine && (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-5 w-5 hover:bg-destructive/10 hover:text-destructive rounded-full"
                                                                        onClick={() => msg.id && setDeleteDialog({ isOpen: true, type: 'message', id: msg.id })}
                                                                    >
                                                                        <Trash2 className="w-3 h-3" />
                                                                    </Button>
                                                                )}
                                                                <span className="text-[9px] text-muted-foreground/40 font-bold tracking-widest uppercase">
                                                                    {safeFormat(msg.created_at, 'h:mm a')}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            </React.Fragment>
                                        );
                                    })}
                                    <div ref={messagesEndRef} className="h-6" />
                                </div>
                            )}
                        </ScrollArea>

                        {/* Input Area */}
                        {!isNewChat && (getOtherParticipant(selectedConversation!.participants).is_deleted || getOtherParticipant(selectedConversation!.participants).is_deactivated) ? (
                            <div className="p-4 border-none bg-transparent text-center text-muted-foreground text-sm py-6">
                                {getOtherParticipant(selectedConversation!.participants).is_deactivated
                                    ? "This account is deactivated"
                                    : "This account doesnt exist anymore"}
                            </div>
                        ) : (
                            <div className="p-4 pb-8 bg-gradient-to-t from-background via-background/80 to-transparent w-full flex-shrink-0 relative z-40">
                                {selectedMedia && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mb-4 flex items-center gap-3 p-3 bg-secondary/80 backdrop-blur-2xl rounded-2xl border border-border shadow-2xl max-w-2xl mx-auto w-full"
                                    >
                                        {selectedMedia.type === 'image' ? (
                                            <img src={selectedMedia.preview} className="w-12 h-12 rounded-lg object-cover" />
                                        ) : (
                                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                                <FileText className="w-6 h-6 text-primary" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium truncate">{selectedMedia.file.name}</p>
                                            <p className="text-[10px] text-muted-foreground">{(selectedMedia.file.size / 1024).toFixed(1)} KB</p>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 rounded-full bg-black/20 hover:bg-black/40 text-white"
                                            onClick={() => setSelectedMedia(null)}
                                        >
                                            <Smile className="w-4 h-4 rotate-45" />
                                        </Button>
                                    </motion.div>
                                )}

                                <form onSubmit={handleSendMessage} className="flex items-center gap-2 max-w-3xl mx-auto w-full bg-card/80 backdrop-blur-2xl border border-white/10 rounded-full pl-2 pr-1.5 py-1.5 shadow-[0_0_40px_-10px_rgba(0,0,0,0.5)] transition-all focus-within:ring-2 focus-within:ring-primary/30 focus-within:shadow-[var(--shadow-glow)] focus-within:bg-card/95 focus-within:border-primary/50 relative">
                                    <div className="flex-shrink-0">
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            className="hidden"
                                            onChange={(e) => handleMediaSelect(e)}
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="rounded-full h-10 w-10 text-muted-foreground hover:bg-secondary hover:text-foreground transition-all p-0 flex items-center justify-center border-none shadow-none"
                                            disabled={!isNewChat && selectedConversation && (getOtherParticipant(selectedConversation.participants).is_deactivated || getOtherParticipant(selectedConversation.participants).is_deleted)}
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <Paperclip className="w-5 h-5" />
                                        </Button>
                                    </div>
                                    <div className="flex-1 flex items-center min-h-[40px]">
                                        <TextareaAutosize
                                            id="messaging-textarea"
                                            value={messageInput}
                                            onChange={(e) => setMessageInput(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleSendMessage();
                                                }
                                            }}
                                            disabled={!isNewChat && selectedConversation && (getOtherParticipant(selectedConversation.participants).is_deactivated || getOtherParticipant(selectedConversation.participants).is_deleted)}
                                            placeholder={(!isNewChat && selectedConversation && (getOtherParticipant(selectedConversation.participants).is_deactivated || getOtherParticipant(selectedConversation.participants).is_deleted)) ? "Account deactivated" : "Message..."}
                                            className="w-full bg-transparent border-none p-0 !shadow-none text-sm resize-none focus:outline-none focus:ring-0 disabled:opacity-50 disabled:cursor-not-allowed leading-relaxed block overflow-hidden placeholder:text-muted-foreground/70"
                                            maxRows={5}
                                        />
                                    </div>
                                    <div className="flex-shrink-0">
                                        <Button
                                            type="submit"
                                            disabled={(!messageInput.trim() && !selectedMedia) || uploadingMedia || sending || (!isNewChat && selectedConversation && (getOtherParticipant(selectedConversation.participants).is_deactivated || getOtherParticipant(selectedConversation.participants).is_deleted))}
                                            className={cn(
                                                "rounded-full h-10 w-10 p-0 flex items-center justify-center transition-all border-none transform",
                                                messageInput.trim() || selectedMedia
                                                    ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow scale-100"
                                                    : "bg-secondary text-muted-foreground scale-95 opacity-50"
                                            )}
                                        >
                                            {(uploadingMedia || sending) ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className={cn("w-4 h-4", (messageInput.trim() || selectedMedia) ? "translate-x-0.5" : "")} />}
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="w-24 h-24 bg-gradient-to-tr from-primary/20 to-primary/5 rounded-full flex items-center justify-center mx-auto mb-6 shadow-glow border border-primary/20"
                        >
                            <MessageSquare className="w-12 h-12 text-primary" />
                        </motion.div>
                        <h2 className="text-3xl font-bold font-display text-foreground mb-3">Your Messages</h2>
                        <p className="max-w-sm mx-auto text-muted-foreground px-4">Send private photos and messages to a friend or group instantly.</p>
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                            <Button className="mt-8 rounded-full px-8 font-bold shadow-glow text-md py-6" onClick={() => setShowSearch(true)}>Send Message</Button>
                        </motion.div>
                    </div>
                )}
            </div>

            {/* User Search Overlay */}
            <AnimatePresence>
                {showSearch && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                            onClick={() => setShowSearch(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-lg bg-card border rounded-2xl shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[80vh]"
                        >
                            <div className="p-4 border-b flex justify-between items-center bg-card">
                                <h3 className="font-bold">New Message</h3>
                                <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setShowSearch(false)}>
                                    <ArrowLeft className="w-5 h-5" />
                                </Button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 scrollbar-hide text-foreground">
                                <UserSearch
                                    onClose={() => setShowSearch(false)}
                                    onSelectUser={(user) => {
                                        const existing = safeConversations.find(c => c.participants.some(p => p.id === user.id));
                                        if (existing) {
                                            setSelectedConversation(existing);
                                            setIsNewChat(false);
                                            setNewChatUser(null);
                                        } else {
                                            setIsNewChat(true);
                                            setNewChatUser({
                                                id: user.id,
                                                username: user.username,
                                                display_name: user.display_name,
                                                avatar_url: user.avatar_url || '',
                                                instance: (user as any).community_name,
                                                community_name: (user as any).community_name,
                                                community_url: (user as any).community_url
                                            });
                                            setSelectedConversation(null);
                                            setMessages([]);
                                        }
                                        setShowSearch(false);
                                    }}
                                />
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Delete Confirmation Dialog */}
            <DeleteConfirmDialog
                isOpen={deleteDialog.isOpen}
                onClose={() => setDeleteDialog({ isOpen: false, type: 'message', id: null })}
                onConfirm={() => {
                    if (deleteDialog.id) {
                        if (deleteDialog.type === 'message') {
                            handleDeleteMessage(deleteDialog.id);
                        } else {
                            handleDeleteConversation(deleteDialog.id);
                        }
                    }
                }}
                title={deleteDialog.type === 'message' ? 'Delete Message?' : 'Delete Chat?'}
                message={
                    deleteDialog.type === 'message'
                        ? 'Are you sure you want to delete this message? This action cannot be undone.'
                        : 'Are you sure you want to delete this entire chat? All messages will be permanently removed and this action cannot be undone.'
                }
            />
        </div>
    );
};

interface TextareaAutosizeProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    maxRows?: number;
}

// Simple auto-resizing textarea component
const TextareaAutosize = ({ maxRows, ...props }: TextareaAutosizeProps) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;

            if (maxRows) {
                // Approximate line height for text-sm with leading-relaxed
                const lineHeight = 24;
                const maxHeight = (maxRows * lineHeight) + 16; // Adding some padding allowance

                if (textareaRef.current.scrollHeight > maxHeight) {
                    textareaRef.current.style.height = `${maxHeight}px`;
                    textareaRef.current.style.overflowY = 'auto';
                } else {
                    textareaRef.current.style.overflowY = 'hidden';
                }
            }
        }
    }, [props.value, maxRows]);

    return (
        <textarea
            {...props}
            ref={textareaRef}
            rows={1}
        />
    );
};

export default MessagingUI;
