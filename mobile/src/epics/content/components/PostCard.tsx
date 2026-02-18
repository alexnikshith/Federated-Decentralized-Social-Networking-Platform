import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, Share } from 'react-native';
import { Post } from '../types';
import { Heart, MessageCircle, Share2, MoreHorizontal, Globe, Shield } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { postApi } from '../api/postApi';
import { formatDistanceToNow } from 'date-fns';

interface PostCardProps {
    post: Post;
    onPress?: (post: Post) => void;
}

export const PostCard: React.FC<PostCardProps> = ({ post: initialPost, onPress }) => {
    const [post, setPost] = useState(initialPost);
    const [isLiking, setIsLiking] = useState(false);

    const handleLike = async () => {
        if (isLiking) return;

        // Optimistic UI
        const newIsLiked = !post.is_liked;
        const newLikeCount = newIsLiked ? post.like_count + 1 : post.like_count - 1;

        setPost({ ...post, is_liked: newIsLiked, like_count: newLikeCount });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        setIsLiking(true);
        try {
            await postApi.toggleLike(post.id);
        } catch (err) {
            // Revert on error
            setPost(post);
            console.error('Like toggle failed:', err);
        } finally {
            setIsLiking(false);
        }
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: `${post.author_name} on Nexus: ${post.content}`,
                url: `https://nexus-social.com/posts/${post.id}` // Mock URL
            });
        } catch (error) {
            console.error('Share error:', error);
        }
    };

    return (
        <View className="bg-card mb-3 mx-4 rounded-3xl p-4 shadow-sm border border-border/50">
            {/* Header */}
            <View className="flex-row justify-between items-center mb-3">
                <View className="flex-row items-center flex-1">
                    <Image
                        source={{ uri: post.author_avatar || 'https://via.placeholder.com/100' }}
                        className="w-10 h-10 rounded-full bg-muted"
                    />
                    <View className="ml-3 flex-1">
                        <View className="flex-row items-center">
                            <Text className="font-bold text-foreground mr-1" numberOfLines={1}>
                                {post.author_name}
                            </Text>
                            {post.is_remote && <Shield size={12} color="#0D9488" />}
                        </View>
                        <View className="flex-row items-center">
                            <Text className="text-xs text-muted-foreground mr-2">
                                @{post.author_id.split('@')[0]}
                            </Text>
                            <Globe size={10} color="#94A3B8" />
                            <Text className="text-[10px] text-muted-foreground ml-1 uppercase">
                                {post.author_instance}
                            </Text>
                        </View>
                    </View>
                </View>
                <TouchableOpacity className="p-2">
                    <MoreHorizontal size={20} color="#64748B" />
                </TouchableOpacity>
            </View>

            {/* Content */}
            <TouchableOpacity activeOpacity={0.9} onPress={() => onPress?.(post)}>
                <Text className="text-foreground leading-6 mb-3 text-[15px]">
                    {post.content}
                </Text>

                {post.media_url && (
                    <Image
                        source={{ uri: post.media_url }}
                        className="w-full h-64 rounded-2xl bg-muted mb-3"
                        resizeMode="cover"
                    />
                )}
            </TouchableOpacity>

            {/* Footer / Stats */}
            <View className="flex-row items-center justify-between border-t border-border/30 pt-3">
                <View className="flex-row space-x-6">
                    <TouchableOpacity
                        className="flex-row items-center space-x-2"
                        onPress={handleLike}
                    >
                        <Heart
                            size={20}
                            color={post.is_liked ? '#EF4444' : '#64748B'}
                            fill={post.is_liked ? '#EF4444' : 'transparent'}
                        />
                        <Text className={`text-xs ${post.is_liked ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                            {post.like_count}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity className="flex-row items-center space-x-2">
                        <MessageCircle size={20} color="#64748B" />
                        <Text className="text-xs text-muted-foreground">{post.comment_count}</Text>
                    </TouchableOpacity>
                </View>

                <View className="flex-row items-center space-x-4">
                    <TouchableOpacity onPress={handleShare}>
                        <Share2 size={20} color="#64748B" />
                    </TouchableOpacity>
                    <Text className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(post.created_at))} ago
                    </Text>
                </View>
            </View>
        </View>
    );
};
