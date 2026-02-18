import React, { useState, useEffect, useCallback } from 'react';
import { FlatList, RefreshControl, ActivityIndicator, View, Text } from 'react-native';
import { Post } from '../types';
import { PostCard } from './PostCard';
import { postApi } from '../api/postApi';

export const FeedList = () => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const fetchFeed = useCallback(async (pageNum: number, isRefresh = false) => {
        try {
            const data = await postApi.getFeed(pageNum);
            if (isRefresh) {
                setPosts(data.posts);
            } else {
                setPosts(prev => [...prev, ...data.posts]);
            }
            setHasMore(data.posts.length > 0);
        } catch (error) {
            console.error('Failed to fetch feed:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchFeed(1);
    }, [fetchFeed]);

    const onRefresh = () => {
        setRefreshing(true);
        setPage(1);
        fetchFeed(1, true);
    };

    const loadMore = () => {
        if (!loading && hasMore) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchFeed(nextPage);
        }
    };

    if (loading && posts.length === 0) {
        return (
            <View className="flex-1 justify-center items-center">
                <ActivityIndicator size="large" color="#F59E0B" />
            </View>
        );
    }

    return (
        <FlatList
            data={posts}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <PostCard post={item} />}
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
                    <View className="py-4">
                        <ActivityIndicator color="#F59E0B" />
                    </View>
                ) : null
            }
            contentContainerStyle={{ paddingVertical: 10 }}
        />
    );
};
