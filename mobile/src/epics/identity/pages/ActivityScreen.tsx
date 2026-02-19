import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { identityApi } from '../api/identityApi';
import { ChevronLeft, Info } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { ActivityLog } from '../types';

const ActivityScreen = () => {
    const router = useRouter();
    const [activities, setActivities] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadActivity = async () => {
            try {
                const data = await identityApi.getActivity(20);
                setActivities(data);
            } catch (error) {
                console.error('Failed to load activity', error);
            } finally {
                setLoading(false);
            }
        };
        loadActivity();
    }, []);

    const getIcon = (action: string) => {
        switch (action) {
            case 'login': return '🔐';
            case 'logout': return '🚪';
            case 'profile_update': return '✏️';
            case 'password_change': return '🔑';
            case 'signup': return '✨';
            default: return '📍';
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
            <View className="flex-row items-center px-4 py-2 border-b border-border/10">
                <TouchableOpacity onPress={() => router.back()} className="p-2">
                    <ChevronLeft size={24} color="#64748B" />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-foreground ml-2">Security Activity</Text>
            </View>

            {loading ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#F59E0B" />
                </View>
            ) : (
                <FlatList
                    data={activities}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ padding: 24 }}
                    ListHeaderComponent={() => (
                        <View className="bg-secondary/20 p-4 rounded-2xl mb-6 flex-row items-start">
                            <Info size={18} color="#64748B" className="mr-3 mt-0.5" />
                            <Text className="text-muted-foreground text-sm flex-1">
                                This is a log of important security actions taken on your account. If you see activity you don't recognize, please change your password immediately.
                            </Text>
                        </View>
                    )}
                    renderItem={({ item }) => (
                        <View className="flex-row items-center gap-4 p-4 rounded-2xl border border-border/10 bg-secondary/10 mb-3">
                            <View className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-xl">
                                <Text>{getIcon(item.action)}</Text>
                            </View>
                            <View className="flex-1">
                                <View className="flex-row justify-between items-center mb-1">
                                    <Text className="font-bold text-xs uppercase tracking-wider text-primary">
                                        {item.action.replace('_', ' ')}
                                    </Text>
                                    <Text className="text-[10px] text-muted-foreground">
                                        {new Date(item.timestamp).toLocaleDateString()}
                                    </Text>
                                </View>
                                <Text className="text-sm text-foreground/80 font-medium" numberOfLines={1}>{item.details}</Text>
                                <Text className="text-[10px] text-muted-foreground mt-1">IP: {item.ip_address}</Text>
                            </View>
                        </View>
                    )}
                    ListEmptyComponent={() => (
                        <View className="p-10 items-center">
                            <Text className="text-muted-foreground italic">No activity logs found.</Text>
                        </View>
                    )}
                />
            )}
        </SafeAreaView>
    );
};

export default ActivityScreen;
