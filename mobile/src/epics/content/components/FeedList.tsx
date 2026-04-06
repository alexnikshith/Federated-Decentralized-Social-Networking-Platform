import React, { useState, useEffect, useCallback } from 'react';
import { FlatList, RefreshControl, ActivityIndicator, View, Text } from 'react-native';
import { Post } from '../types';
import { PostCard } from './PostCard';
import { postApi } from '../api/postApi';

interface FeedListProps {
    type?: 'home' | 'public';
}

const FEED_LIMIT = 50;

// Memoize PostCard for performance
const MemoizedPostCard = React.memo(PostCard);

export const FeedList: React.FC<FeedListProps> = ({ type = 'home' }) => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    const fetchingRef = React.useRef(false);

    const fetchFeed = useCallback(async (isRefresh = false) => {
        if (fetchingRef.current) return;
        fetchingRef.current = true;

        try {
            // Since backend pagination is currently disabled, we fetch one large batch
            const data = await postApi.getFeed(1, FEED_LIMIT, type);
            const newPosts = data.posts || [];

            setPosts(newPosts);

            // Disable infinite loading since backend ignores page params for now
            setHasMore(false);
        } catch (error) {
            console.error('Failed to fetch feed:', error);
            setHasMore(false);
        } finally {
            setLoading(false);
            setRefreshing(false);
            fetchingRef.current = false;
        }
    }, [type]);

    useEffect(() => {
        setPosts([]);
        setLoading(true);
        setHasMore(true);
        fetchFeed(true);
    }, [type, fetchFeed]);

    const onRefresh = () => {
        setRefreshing(true);
        setHasMore(true);
        fetchFeed(true);
    };

    const loadMore = () => {
        // Disabled until backend pagination is restored
    };

    if (loading && posts.length === 0) {
        return (
            <View className="flex-1 justify-center items-center">
                <ActivityIndicator size="large" color="#F59E0B" />
            </View>
        );
    }

    const renderItem = ({ item }: { item: Post }) => <MemoizedPostCard post={item} />;

    return (
        <FlatList
            data={posts}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F59E0B" />
            }
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            ListEmptyComponent={
                <View className="p-10 items-center">
                    <Text className="text-muted-foreground text-center">
                        No posts yet. Be the first to share something!
                    </Text>
                </View>
            }
            ListFooterComponent={
                hasMore ? (
                    <View className="py-6">
                        <ActivityIndicator color="#F59E0B" />
                    </View>
                ) : posts.length > 0 ? (
                    <View className="py-12 items-center">
                        <View className="h-[1px] w-1/4 bg-slate-100 dark:bg-slate-800 mb-4" />
                        <Text className="text-slate-400 dark:text-slate-500 font-bold text-[13px] uppercase tracking-[2px]">
                            ✨ All Caught Up!
                        </Text>
                        <Text className="text-slate-300 dark:text-slate-600 text-[11px] mt-1 font-medium">
                            You've seen all the latest posts
                        </Text>
                    </View>
                ) : null
            }
            contentContainerStyle={{ paddingVertical: 10 }}
            removeClippedSubviews={true}
            initialNumToRender={5}
            maxToRenderPerBatch={5}
            windowSize={5}
        />
    );
};
