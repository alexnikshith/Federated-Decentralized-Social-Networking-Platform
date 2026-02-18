import React from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { Button } from '../../../components/ui/Button';
import { useRouter, useFocusEffect } from 'expo-router';
import { Settings, LogOut, Shield, MapPin, Link as LinkIcon, Calendar } from 'lucide-react-native';

const ProfileScreen = () => {
    const { user, clearAuth, refreshUser } = useAuthStore();
    const router = useRouter();

    useFocusEffect(
        React.useCallback(() => {
            refreshUser();
        }, [])
    );

    if (!user) return null;

    const handleLogout = async () => {
        await clearAuth();
        router.replace('/login');
    };

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['left', 'right']}>
            <ScrollView className="flex-1">
                {/* Header / Cover Area */}
                <View className="h-32 bg-primary/10" />

                <View className="px-6 -mt-12">
                    {/* Profile Image */}
                    <View className="p-1 bg-background rounded-full self-start">
                        <Image
                            source={{ uri: user.avatar_url || 'https://via.placeholder.com/150' }}
                            className="w-24 h-24 rounded-full bg-muted"
                        />
                    </View>

                    {/* Profile Header Info */}
                    <View className="flex-row justify-between items-end mt-4">
                        <View>
                            <Text className="text-2xl font-bold text-foreground">{user.display_name}</Text>
                            <Text className="text-muted-foreground">@{user.username}</Text>
                        </View>
                        <TouchableOpacity
                            className="p-2 bg-secondary rounded-full"
                            onPress={() => { }}
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
                    <View className="mt-10 space-y-3">
                        <Button
                            title="Edit Profile"
                            variant="secondary"
                            onPress={() => { }}
                            className="py-3"
                        />
                        <TouchableOpacity
                            className="flex-row items-center justify-center py-4 rounded-xl border-2 border-destructive/10 bg-destructive/5"
                            onPress={handleLogout}
                        >
                            <LogOut size={20} color="#EF4444" className="mr-2" />
                            <Text className="text-destructive font-bold">Log Out</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View className="h-20" />
            </ScrollView>
        </SafeAreaView>
    );
};

export default ProfileScreen;
