import React, { useState, useCallback } from 'react';
import { View, Text, Image, TouchableOpacity, Share, Alert, Modal, TextInput, FlatList, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Post, Comment } from '../types';
import { Heart, MessageCircle, Share2, MoreHorizontal, Globe, Shield, X, Send } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { postApi } from '../api/postApi';
import { formatDistanceToNow } from 'date-fns';
import { getImageUrl } from '../../../lib/api';

interface PostCardProps {
    post: Post;
    onPress?: (post: Post) => void;
}

export const PostCard: React.FC<PostCardProps> = ({ post: initialPost, onPress }) => {
    const [post, setPost] = useState(initialPost);
    const [isLiking, setIsLiking] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState<Comment[]>([]);
    const [loadingComments, setLoadingComments] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleLike = async () => {
        if (isLiking) return;

        const newIsLiked = !post.is_liked;
        const newLikeCount = newIsLiked ? post.like_count + 1 : Math.max(0, post.like_count - 1);

        setPost({ ...post, is_liked: newIsLiked, like_count: newLikeCount });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        setIsLiking(true);
        try {
            await postApi.toggleLike(post.id, !newIsLiked);
        } catch (err) {
            setPost(post);
            console.error('Like toggle failed:', err);
        } finally {
            setIsLiking(false);
        }
    };

    const fetchComments = useCallback(async () => {
        setLoadingComments(true);
        try {
            const data = await postApi.getComments(post.id);
            setComments(data || []);
        } catch (err) {
            console.error('Failed to fetch comments:', err);
        } finally {
            setLoadingComments(false);
        }
    }, [post.id]);

    const handleToggleComments = () => {
        if (!showComments && comments.length === 0) {
            fetchComments();
        }
        setShowComments(!showComments);
    };

    const handlePostComment = async () => {
        if (!commentText.trim() || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const newComment = await postApi.addComment(post.id, { content: commentText.trim() });
            setComments(prev => [newComment, ...prev]);
            setPost(prev => ({ ...prev, comment_count: (prev.comment_count || 0) + 1 }));
            setCommentText('');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (err) {
            Alert.alert("Error", "Failed to post comment. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: `${post.author_name} on Nexus: ${post.content}`,
            });
        } catch (error) {
            console.error('Share error:', error);
        }
    };

    const formattedDate = formatDistanceToNow(new Date(post.created_at), { addSuffix: true })
        .replace('about ', '')
        .replace(' ago', '');

    const displayHandle = post.author_id.length > 15
        ? `@${(post.author_name || 'user').toLowerCase().replace(/\s+/g, '')}`
        : `@${post.author_id.split('@')[0]}`;

    return (
        <View className="bg-white dark:bg-slate-900 mb-4 mx-4 rounded-[32px] overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800">
            <View className="p-5">
                {/* Header */}
                <View className="flex-row justify-between items-start mb-4">
                    <View className="flex-row items-center flex-1">
                        <View className="relative">
                            <Image
                                source={{ uri: getImageUrl(post.author_avatar) || `https://ui-avatars.com/api/?name=${post.author_name || 'N'}&background=F59E0B&color=fff` }}
                                className="w-12 h-12 rounded-full border-2 border-primary/20 bg-slate-100"
                            />
                            {post.is_remote && (
                                <View className="absolute -bottom-1 -right-1 bg-teal-500 rounded-full p-1 border-2 border-white dark:border-slate-900">
                                    <Globe size={8} color="white" />
                                </View>
                            )}
                        </View>
                        <View className="ml-3 flex-1">
                            <View className="flex-row items-center">
                                <Text className="font-black text-slate-800 dark:text-slate-100 text-[16px] mr-1" numberOfLines={1}>
                                    {post.author_name || 'Anonymous'}
                                </Text>
                                {post.is_remote && <Shield size={12} color="#0D9488" />}
                            </View>
                            <Text className="text-xs text-slate-400 font-medium">
                                {displayHandle}
                            </Text>
                        </View>
                    </View>
                    <View className="items-end">
                        <TouchableOpacity className="p-1 mb-1">
                            <MoreHorizontal size={20} color="#94A3B8" />
                        </TouchableOpacity>
                        <Text className="text-[10px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-widest">
                            {formattedDate}
                        </Text>
                    </View>
                </View>

                {/* Content */}
                <TouchableOpacity activeOpacity={0.7} onPress={() => onPress?.(post)} className="mb-4">
                    <Text className="text-slate-700 dark:text-slate-200 leading-[24px] text-[16px] font-normal">
                        {post.content}
                    </Text>

                    {post.media_url && (
                        <Image
                            source={{ uri: getImageUrl(post.media_url) || '' }}
                            className="w-full h-72 rounded-[24px] bg-slate-100 dark:bg-slate-800 mt-3"
                            resizeMode="cover"
                        />
                    )}
                </TouchableOpacity>

                {/* Action Bar */}
                <View className="flex-row items-center justify-between pt-4 border-t border-slate-50 dark:border-slate-800/50">
                    <View className="flex-row items-center">
                        <TouchableOpacity
                            className="flex-row items-center mr-6"
                            onPress={handleLike}
                        >
                            <View className={`p-2 rounded-full ${post.is_liked ? 'bg-rose-50 dark:bg-rose-900/20' : ''}`}>
                                <Heart
                                    size={20}
                                    color={post.is_liked ? '#F43F5E' : '#94A3B8'}
                                    fill={post.is_liked ? '#F43F5E' : 'transparent'}
                                />
                            </View>
                            <Text className={`ml-1 text-sm font-bold ${post.is_liked ? 'text-rose-500' : 'text-slate-400'}`}>
                                {post.like_count || 0}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="flex-row items-center"
                            onPress={handleToggleComments}
                        >
                            <View className={`p-2 rounded-full ${showComments ? 'bg-amber-50 dark:bg-amber-900/20' : ''}`}>
                                <MessageCircle size={20} color={showComments ? '#F59E0B' : '#94A3B8'} />
                            </View>
                            <Text className={`ml-1 text-sm font-bold ${showComments ? 'text-amber-500' : 'text-slate-400'}`}>
                                {post.comment_count || 0}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        onPress={handleShare}
                        className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-full"
                    >
                        <Share2 size={18} color="#64748B" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Inline Comments Section */}
            {showComments && (
                <View className="bg-slate-50/50 dark:bg-slate-800/20 border-t border-slate-100 dark:border-slate-800 p-4">
                    {loadingComments ? (
                        <ActivityIndicator size="small" color="#F59E0B" className="py-4" />
                    ) : (
                        <View>
                            {comments.length > 0 ? (
                                comments.slice(0, 3).map((comment) => (
                                    <View key={comment.id} className="flex-row mb-3">
                                        <Image
                                            source={{ uri: getImageUrl(comment.user_avatar) || `https://ui-avatars.com/api/?name=${comment.user_name}&background=F59E0B&color=fff` }}
                                            className="w-8 h-8 rounded-full border border-slate-200 bg-white"
                                        />
                                        <View className="ml-2 flex-1 bg-white dark:bg-slate-800/50 p-2 rounded-2xl rounded-tl-none border border-slate-100 dark:border-slate-700/50">
                                            <Text className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                                {comment.user_name}
                                            </Text>
                                            <Text className="text-xs text-slate-600 dark:text-slate-400">
                                                {comment.content}
                                            </Text>
                                        </View>
                                    </View>
                                ))
                            ) : (
                                <Text className="text-xs text-slate-400 text-center py-4 italic">
                                    No comments yet. Be the first to reply!
                                </Text>
                            )}

                            {/* Comment Input */}
                            <View className="flex-row items-center mt-2 bg-white dark:bg-slate-800 rounded-full px-4 py-2 border border-slate-200 dark:border-slate-700">
                                <TextInput
                                    className="flex-1 text-sm text-slate-700 dark:text-slate-200"
                                    placeholder="Write a comment..."
                                    placeholderTextColor="#94A3B8"
                                    value={commentText}
                                    onChangeText={setCommentText}
                                    multiline
                                />
                                <TouchableOpacity
                                    onPress={handlePostComment}
                                    disabled={!commentText.trim() || isSubmitting}
                                    className={`p-2 rounded-full ${commentText.trim() ? 'bg-amber-500' : 'bg-slate-100 dark:bg-slate-700'}`}
                                >
                                    {isSubmitting ? (
                                        <ActivityIndicator size="small" color="white" />
                                    ) : (
                                        <Send size={16} color={commentText.trim() ? 'white' : '#94A3B8'} />
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>
            )}
        </View>
    );
};
