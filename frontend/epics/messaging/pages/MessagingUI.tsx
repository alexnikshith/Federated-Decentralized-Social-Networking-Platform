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

    // New Chat State (Virtual conversation before first message)
    const [isNewChat, setIsNewChat] = useState(false);
    const [newChatUser, setNewChatUser] = useState<Participant | null>(null);

    // Delete dialog state
    const [deleteDialog, setDeleteDialog] = useState<{
        isOpen: boolean;
        type: 'message' | 'conversation';
        id: string | null;
    }>({ isOpen: false, type: 'message', id: null });

    // Track if it's the first load of messages for a conversation to scroll instantly
    const isInitialLoad = useRef(true);

    // Ensure conversations is ALWAYS an array even if state somehow becomes null
    const safeConversations = Array.isArray(conversations) ? conversations : [];

    // Initialize Conversations
    useEffect(() => {
        loadConversations();

        // WebSocket Connection Setup
        if (!token) return;

        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
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
        } catch (error) {
            console.error('Failed to load conversations:', error);
            setConversations([]);
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
        if ((!messageInput.trim() && !selectedMedia) || !currentUser) return;
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

            setMessages(prev => [...(Array.isArray(prev) ? prev : []), newMsg]);
            setMessageInput('');
            setSelectedMedia(null);
            setUploadingMedia(false);

            if (isNewChat) {
                await loadConversations();
                setIsNewChat(false);
                setNewChatUser(null);
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
        return (
            <div className="h-[calc(100vh-64px)] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-background border-t shadow-none">
            {/* Conversation List */}
            <div className={cn(
                "w-full md:w-80 border-r flex flex-col transition-all duration-300",
                (selectedConversation || isNewChat) && "hidden md:flex"
            )}>
                <div className="p-4 border-b flex justify-between items-center bg-card">
                    <h2 className="text-xl font-bold font-display">Messages</h2>
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
                        <div className="p-10 text-center opacity-50 flex flex-col items-center">
                            <Smile className="w-12 h-12 mb-4 text-muted-foreground" />
                            <p className="text-sm font-medium">No messages yet</p>
                            <Button variant="link" onClick={() => setShowSearch(true)}>Start a conversation</Button>
                        </div>
                    ) : (
                        <div className="py-2">
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
                                        className={cn(
                                            "flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors border-l-4",
                                            isSelected
                                                ? "bg-primary/5 border-primary"
                                                : "border-transparent hover:bg-secondary/50"
                                        )}
                                    >
                                        <div className="relative">
                                            <Avatar className="w-12 h-12 border border-border/50">
                                                <AvatarImage src={other.avatar_url} />
                                                <AvatarFallback>{(other.username || 'U')[0].toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-0.5">
                                                <div className="flex flex-col min-w-0">
                                                    <span className={cn(
                                                        "font-semibold text-sm truncate",
                                                        (other.is_deleted || other.is_deactivated) && "italic text-muted-foreground"
                                                    )}>
                                                        {other.is_deactivated ? "Nexus User" : (other.display_name || other.username)}
                                                    </span>
                                                    {other.community_name && (
                                                        <span className="text-[10px] text-muted-foreground font-medium truncate">
                                                            from {other.community_name}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-[10px] text-muted-foreground whitespace-nowrap mt-1">
                                                    {conv.last_message && safeFormat(conv.last_message.created_at, 'HH:mm')}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center gap-2">
                                                <p className={cn(
                                                    "text-xs truncate flex-1",
                                                    conv.unread_count && conv.unread_count > 0 ? "font-bold text-foreground" : "text-muted-foreground"
                                                )}>
                                                    {conv.last_message?.content || "Start messaging..."}
                                                </p>
                                                {conv.unread_count !== undefined && conv.unread_count > 0 && (
                                                    <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center flex items-center justify-center h-[18px]">
                                                        {conv.unread_count}
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
                "flex-1 flex flex-col bg-card/30 backdrop-blur-sm relative",
                (!selectedConversation && !isNewChat) && "hidden md:flex justify-center items-center text-muted-foreground p-12"
            )}>
                {(selectedConversation || isNewChat) ? (
                    <>
                        {/* Chat Header */}
                        <div className="p-4 border-b flex items-center justify-between bg-card">
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
                                <div className="space-y-4 pb-4">
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
                                                    <div className="flex items-center justify-center my-6">
                                                        <div className="px-3 py-1 bg-secondary/50 rounded-full text-xs font-medium text-muted-foreground">
                                                            {getMessageDateLabel(msg.created_at)}
                                                        </div>
                                                    </div>
                                                )}

                                                <div
                                                    className={cn(
                                                        "flex flex-col group relative",
                                                        isMine ? "items-end" : "items-start",
                                                        sameSenderAsPrev ? "mt-1" : "mt-4"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-2 max-w-[80%]">
                                                        {isMine && (
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                    >
                                                                        <MoreVertical className="w-3 h-3" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end">
                                                                    <DropdownMenuItem
                                                                        className="text-destructive cursor-pointer"
                                                                        onClick={() => msg.id && setDeleteDialog({ isOpen: true, type: 'message', id: msg.id })}
                                                                    >
                                                                        <Trash2 className="w-3 h-3 mr-2" />
                                                                        Delete
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        )}
                                                        <div className={cn(
                                                            "px-4 py-2.5 rounded-2xl text-sm shadow-sm",
                                                            isMine
                                                                ? "bg-primary text-primary-foreground rounded-tr-none"
                                                                : "bg-secondary text-secondary-foreground rounded-tl-none"
                                                        )}>
                                                            {msg.type === 'image' && msg.media_url && (
                                                                <div className="mb-2 rounded-lg overflow-hidden border border-white/20">
                                                                    <img
                                                                        src={msg.media_url.startsWith('http') ? msg.media_url : `${import.meta.env.VITE_API_URL}${msg.media_url}`}
                                                                        alt="attachment"
                                                                        className="max-w-full h-auto max-h-60 object-cover"
                                                                        onError={(e) => (e.currentTarget.src = "/placeholder-image.png")}
                                                                    />
                                                                </div>
                                                            )}
                                                            {msg.type === 'file' && (
                                                                <a
                                                                    href={msg.media_url?.startsWith('http') ? msg.media_url : `${import.meta.env.VITE_API_URL}${msg.media_url}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="flex items-center gap-2 p-2 bg-black/10 rounded-lg mb-2 hover:bg-black/20 transition-colors"
                                                                >
                                                                    <FileText className="w-5 h-5" />
                                                                    <span className="text-xs truncate max-w-[150px]">{msg.file_name || 'Download file'}</span>
                                                                </a>
                                                            )}
                                                            {msg.content}
                                                        </div>
                                                    </div>
                                                    <span className="text-[10px] text-muted-foreground mt-1 px-1">
                                                        {safeFormat(msg.created_at, 'h:mm a')}
                                                    </span>
                                                </div>
                                            </React.Fragment>
                                        );
                                    })}
                                    <div ref={messagesEndRef} />
                                </div>
                            )}
                        </ScrollArea>

                        {/* Input Area */}
                        {!isNewChat && (getOtherParticipant(selectedConversation!.participants).is_deleted || getOtherParticipant(selectedConversation!.participants).is_deactivated) ? (
                            <div className="p-4 border-t bg-card text-center text-muted-foreground text-sm py-6 bg-secondary/20">
                                {getOtherParticipant(selectedConversation!.participants).is_deactivated
                                    ? "This account is deactivated"
                                    : "This account doesnt exist anymore"}
                            </div>
                        ) : (
                            <div className="p-4 border-t bg-card">
                                {selectedMedia && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mb-3 flex items-center gap-3 p-2 bg-secondary/30 rounded-xl border border-border"
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
                                            className="h-7 w-7 rounded-full"
                                            onClick={() => setSelectedMedia(null)}
                                        >
                                            <Smile className="w-4 h-4 rotate-45" />
                                        </Button>
                                    </motion.div>
                                )}

                                <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                                    <div className="flex items-center gap-1 mb-1">
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
                                            className="rounded-full h-9 w-9 text-muted-foreground disabled:opacity-50"
                                            disabled={!isNewChat && selectedConversation && (getOtherParticipant(selectedConversation.participants).is_deactivated || getOtherParticipant(selectedConversation.participants).is_deleted)}
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <Paperclip className="w-5 h-5" />
                                        </Button>
                                    </div>
                                    <div className="flex-1 relative">
                                        <TextareaAutosize
                                            value={messageInput}
                                            onChange={(e) => setMessageInput(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleSendMessage();
                                                }
                                            }}
                                            disabled={!isNewChat && selectedConversation && (getOtherParticipant(selectedConversation.participants).is_deactivated || getOtherParticipant(selectedConversation.participants).is_deleted)}
                                            placeholder={(!isNewChat && selectedConversation && (getOtherParticipant(selectedConversation.participants).is_deactivated || getOtherParticipant(selectedConversation.participants).is_deleted)) ? "This account has been deactivated" : "Type a message..."}
                                            className="w-full bg-secondary/50 border-none rounded-2xl py-3 px-4 text-sm resize-none focus:ring-1 focus:ring-primary/30 max-h-32 scrollbar-hide focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                        />
                                    </div>
                                    <Button
                                        type="submit"
                                        disabled={(!messageInput.trim() && !selectedMedia) || uploadingMedia || (!isNewChat && selectedConversation && (getOtherParticipant(selectedConversation.participants).is_deactivated || getOtherParticipant(selectedConversation.participants).is_deleted))}
                                        className="rounded-full h-11 w-11 p-0 flex-shrink-0 bg-primary hover:bg-primary/90 shadow-glow"
                                    >
                                        {uploadingMedia ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                    </Button>
                                </form>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-center">
                        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <MessageSquare className="w-10 h-10 text-primary" />
                        </div>
                        <h2 className="text-2xl font-bold text-foreground mb-2">Your Messages</h2>
                        <p className="max-w-xs mx-auto">Send private photos and messages to a friend or group.</p>
                        <Button className="mt-6 rounded-full px-8 font-bold" onClick={() => setShowSearch(true)}>Send Message</Button>
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

// Simple auto-resizing textarea component
const TextareaAutosize = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [props.value]);

    return (
        <textarea
            {...props}
            ref={textareaRef}
            rows={1}
        />
    );
};

export default MessagingUI;
