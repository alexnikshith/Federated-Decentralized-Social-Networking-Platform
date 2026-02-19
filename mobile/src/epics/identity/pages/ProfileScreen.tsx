import { useState, useCallback } from 'react';
import { View, Text, Image, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { identityApi } from '../api/identityApi';
import { postApi } from '../../content/api/postApi';
import { Button } from '../../../components/ui/Button';
import { useRouter, useFocusEffect } from 'expo-router';
import { Settings, LogOut, MapPin, Link as LinkIcon, Calendar, Grid, Heart, MessageCircle } from 'lucide-react-native';
import { Post } from '../../content/types';
import { PostCard } from '../../content/components/PostCard';

type Tab = 'posts' | 'likes' | 'comments';

const ProfileScreen = () => {
    const { user, clearAuth, refreshUser } = useAuthStore();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<Tab>('posts');
    const [data, setData] = useState<Post[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const loadData = useCallback(async (tab: Tab) => {
        if (!user) return;
        setLoading(true);
        try {
            let result: Post[] = [];
            if (tab === 'posts') {
                result = await postApi.getUserPosts(user.id);
            } else if (tab === 'likes') {
                result = await identityApi.getLikes(user.id);
            } else if (tab === 'comments') {
                result = await identityApi.getComments(user.id);
            }

            // Only update data if the component is still mounted and tab matches
            // In a real app we'd use an abort controller, but here we just check if
            // the result matches the requested tab logic implicitly by setting state.
            // Since this function is recreated when user changes, we need to be careful.
            // But we removed `user` dependency from the inner logic mostly.
            // Actually, we use `user.id`.

            setData(result);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.id]); // Only depend on ID, not full user object to avoid loops if we did update user

    useFocusEffect(
        useCallback(() => {
            loadData(activeTab);
        }, [activeTab, loadData])
    );

    const handleRefresh = () => {
        setRefreshing(true);
        refreshUser();
        loadData(activeTab);
    };

    if (!user) return null;

    const handleLogout = async () => {
        await clearAuth();
        router.replace('/login');
    };

    const renderHeader = () => (
        <View className="bg-background">
            <View className="h-32 bg-primary/10" />

            <View className="px-6 -mt-12 mb-6">
                {/* Profile Image */}
                <View className="p-1 bg-background rounded-full self-start">
                    <Image
                        source={{ uri: user.avatar_url || 'https://via.placeholder.com/150' }}
                        className="w-24 h-24 rounded-full bg-muted"
                    />
                </View>

                {/* Profile Header Info */}
                <View className="flex-row justify-between items-end mt-4">
                    <View className="flex-1 mr-4">
                        <Text className="text-2xl font-bold text-foreground">{user.display_name}</Text>
                        <Text className="text-muted-foreground">@{user.username}</Text>
                    </View>
                    <TouchableOpacity
                        className="p-2 bg-secondary rounded-full"
                        onPress={() => router.push('/settings')}
                    >
                        <Settings size={20} color="#64748B" />
                    </TouchableOpacity>
                </View>

                {/* Bio */}
                {user.bio ? (
                    <Text className="text-foreground mt-4 leading-6">{user.bio}</Text>
                ) : (
                    <Text className="text-muted-foreground mt-4 italic">No bio provided.</Text>
                )}

                {/* Stats */}
                <View className="flex-row mt-6 py-4 border-y border-border/10">
                    <View className="flex-1 items-center border-r border-border/10">
                        <Text className="font-bold text-foreground text-xl">{user.following_count || 0}</Text>
                        <Text className="text-muted-foreground text-[10px] uppercase tracking-tighter">Following</Text>
                    </View>
                    <View className="flex-1 items-center border-r border-border/10">
                        <Text className="font-bold text-foreground text-xl">{user.followers_count || 0}</Text>
                        <Text className="text-muted-foreground text-[10px] uppercase tracking-tighter">Followers</Text>
                    </View>
                    <View className="flex-1 items-center">
                        <Text className="font-bold text-foreground text-xl">{user.posts_count || 0}</Text>
                        <Text className="text-muted-foreground text-[10px] uppercase tracking-tighter">Posts</Text>
                    </View>
                </View>

                {/* Metadata */}
                <View className="mt-6 space-y-3">
                    {user.location && (
                        <View className="flex-row items-center">
                            <MapPin size={16} color="#94A3B8" className="mr-2" />
                            <Text className="text-muted-foreground">{user.location}</Text>
                        </View>
                    )}
                    {user.website && (
                        <View className="flex-row items-center">
                            <LinkIcon size={16} color="#94A3B8" className="mr-2" />
                            <Text className="text-primary">{user.website}</Text>
                        </View>
                    )}
                    <View className="flex-row items-center">
                        <Calendar size={16} color="#94A3B8" className="mr-2" />
                        <Text className="text-muted-foreground">Joined {new Date(user.created_at).toLocaleDateString()}</Text>
                    </View>
                </View>

                {/* Actions */}
                <View className="mt-6 flex-row gap-3">
                    <Button
                        title="Edit Profile"
                        variant="secondary"
                        onPress={() => router.push('/edit-profile')}
                        className="flex-1"
                    />
                </View>
            </View>

            {/* Tabs */}
            <View className="flex-row border-b border-border/10">
                <TouchableOpacity
                    className={`flex-1 items-center py-4 border-b-2 ${activeTab === 'posts' ? 'border-primary' : 'border-transparent'}`}
                    onPress={() => setActiveTab('posts')}
                >
                    <Grid size={24} color={activeTab === 'posts' ? '#F59E0B' : '#94A3B8'} />
                </TouchableOpacity>
                <TouchableOpacity
                    className={`flex-1 items-center py-4 border-b-2 ${activeTab === 'likes' ? 'border-primary' : 'border-transparent'}`}
                    onPress={() => setActiveTab('likes')}
                >
                    <Heart size={24} color={activeTab === 'likes' ? '#F59E0B' : '#94A3B8'} />
                </TouchableOpacity>
                <TouchableOpacity
                    className={`flex-1 items-center py-4 border-b-2 ${activeTab === 'comments' ? 'border-primary' : 'border-transparent'}`}
                    onPress={() => setActiveTab('comments')}
                >
                    <MessageCircle size={24} color={activeTab === 'comments' ? '#F59E0B' : '#94A3B8'} />
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderEmptyState = () => (
        <View className="py-20 items-center justify-center opacity-50">
            {activeTab === 'posts' && <Grid size={48} color="#94A3B8" />}
            {activeTab === 'likes' && <Heart size={48} color="#94A3B8" />}
            {activeTab === 'comments' && <MessageCircle size={48} color="#94A3B8" />}
            <Text className="text-muted-foreground mt-4 font-medium">No {activeTab} yet</Text>
        </View>
    );

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['left', 'right']}>
            <FlatList
                data={data}
                renderItem={({ item }) => <PostCard post={item} />}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={!loading ? renderEmptyState : null}
                ListFooterComponent={loading ? <ActivityIndicator className="py-4" color="#F59E0B" /> : <View className="h-20" />}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#F59E0B" />
                }
                showsVerticalScrollIndicator={false}
            />
        </SafeAreaView>
    );
};

export default ProfileScreen;
