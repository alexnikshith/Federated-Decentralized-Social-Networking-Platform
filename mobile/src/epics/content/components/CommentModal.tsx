import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, Modal, TouchableOpacity, TextInput, FlatList, ActivityIndicator, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { Post, Comment } from '../types';
import { X, Send, MoreHorizontal } from 'lucide-react-native';
import { getImageUrl } from '../../../lib/api';
import { postApi } from '../api/postApi';
import { formatDistanceToNow } from 'date-fns';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

interface CommentModalProps {
    visible: boolean;
    onClose: () => void;
    post: Post;
    onCommentAdded?: () => void; // Callback to update parent post comment count
}

export const CommentModal: React.FC<CommentModalProps> = ({ visible, onClose, post, onCommentAdded }) => {
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const inputRef = useRef<TextInput>(null);

    useEffect(() => {
        if (visible) {
            fetchComments();
        }
    }, [visible, post.id]);

    const fetchComments = async () => {
        setLoading(true);
        try {
            const data = await postApi.getComments(post.id);
            setComments(data || []);
        } catch (err) {
            console.error('Failed to fetch comments:', err);
        } finally {
            setLoading(false);
        }
    };

    const handlePostComment = async () => {
        if (!commentText.trim() || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const newComment = await postApi.addComment(post.id, { content: commentText.trim() });
            setComments(prev => [newComment, ...prev]);
            setCommentText('');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Keyboard.dismiss();
            onCommentAdded?.();
        } catch (err) {
            console.error("Failed to post comment:", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderComment = ({ item }: { item: Comment }) => {
        return (
            <View>
                <CommentItem comment={item} />
            </View>
        );
    };

    const renderHeader = () => (
        <View className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 mb-2">
            {/* Post Context - Distinct styling */}
            <View className="p-4 bg-slate-50 dark:bg-slate-800/50">
                <View className="flex-row mb-3">
                    <Image
                        source={{ uri: getImageUrl(post.author_avatar) || `https://ui-avatars.com/api/?name=${post.author_name}&background=F59E0B&color=fff` }}
                        className="w-10 h-10 rounded-full border border-slate-200 bg-white mr-3"
                    />
                    <View className="flex-1 justify-center">
                        <Text className="font-bold text-slate-800 dark:text-slate-200 text-base">
                            {post.author_name}
                        </Text>
                        <Text className="text-xs text-slate-500">
                            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                        </Text>
                    </View>
                </View>
                <Text className="text-base text-slate-800 dark:text-slate-200 leading-6">
                    {post.content}
                </Text>
            </View>

            <View className="px-4 py-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                <Text className="font-bold text-lg text-foreground">Comments</Text>
            </View>
        </View>
    );

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <SafeAreaView className="flex-1 bg-background" edges={['top']}>
                {/* Modal Header */}
                <View className="flex-row items-center justify-between px-4 py-3 border-b border-border/50">
                    <View className="w-8" />
                    <View className="w-12 h-1 bg-slate-300 rounded-full self-center" />
                    <TouchableOpacity onPress={onClose} className="p-1 rounded-full bg-secondary/50">
                        <X size={20} className="text-foreground" />
                    </TouchableOpacity>
                </View>

                {/* Keyboard Avoiding Container */}
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    className="flex-1"
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
                >
                    <FlatList
                        data={comments}
                        renderItem={renderComment}
                        keyExtractor={item => item.id}
                        ListHeaderComponent={renderHeader}
                        ListEmptyComponent={
                            !loading ? (
                                <View className="py-12 items-center">
                                    <Text className="text-slate-400 text-center italic">
                                        No comments yet. Start the conversation!
                                    </Text>
                                </View>
                            ) : null
                        }
                        ListFooterComponent={loading ? <ActivityIndicator className="py-4" color="#F59E0B" /> : <View className="h-4" />}
                        contentContainerStyle={{ paddingBottom: 20 }}
                    />

                    {/* Input Area */}
                    <View className="border-t border-slate-100 dark:border-slate-800 p-4 bg-background pb-8">
                        <View className="flex-row items-center bg-secondary/30 rounded-full px-4 py-2 border border-border/50">
                            <TextInput
                                ref={inputRef}
                                className="flex-1 text-sm text-foreground max-h-24 py-2"
                                placeholder={`Comment as ${post.author_name === 'You' ? 'you' : '...'}`} // Placeholder logic could be improved with auth user
                                placeholderTextColor="#94A3B8"
                                value={commentText}
                                onChangeText={setCommentText}
                                multiline
                                autoFocus={false}
                            />
                            <TouchableOpacity
                                onPress={handlePostComment}
                                disabled={!commentText.trim() || isSubmitting}
                                className={`p-2 rounded-full ml-2 ${commentText.trim() ? 'bg-primary' : 'bg-transparent'}`}
                            >
                                {isSubmitting ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                    <Send size={20} color={commentText.trim() ? 'white' : '#94A3B8'} />
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </Modal>
    );
};

const CommentItem = ({ comment, depth = 0 }: { comment: Comment; depth?: number }) => (
    <View className="mb-4">
        <View className={`flex-row px-4 ${depth > 0 ? 'pl-12' : ''}`}>
            <Image
                source={{ uri: getImageUrl(comment.user_avatar) || `https://ui-avatars.com/api/?name=${comment.user_name}&background=F59E0B&color=fff` }}
                className="w-8 h-8 rounded-full border border-slate-200 bg-white mr-3"
            />
            <View className="flex-1">
                <View className="flex-row items-baseline">
                    <Text className="text-sm font-bold text-slate-800 dark:text-slate-200 mr-2">
                        {comment.user_name}
                    </Text>
                    <Text className="text-xs text-slate-400">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </Text>
                </View>
                <Text className="text-sm text-slate-600 dark:text-slate-300 mt-0.5 leading-5">
                    {comment.content}
                </Text>
            </View>
        </View>
        {comment.replies && comment.replies.length > 0 && (
            <View className="mt-2">
                {comment.replies.map(reply => (
                    <CommentItem key={reply.id} comment={reply} depth={depth + 1} />
                ))}
            </View>
        )}
    </View>
);
