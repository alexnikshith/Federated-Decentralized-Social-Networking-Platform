import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Switch, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { identityApi } from '../api/identityApi';
import { Button } from '../../../components/ui/Button';
import { useRouter } from 'expo-router';
import {
    ChevronLeft,
    Lock,
    Shield,
    Bell,
    AlertTriangle,
    Activity as ActivityIcon,
    ChevronRight,
    LogOut,
    Clock
} from 'lucide-react-native';
import { ActivityLog } from '../types';
import { useSettingsStore } from '../store/settingsStore';

const SettingsScreen = () => {
    const { user, clearAuth, updateUser } = useAuthStore();
    const router = useRouter();
    const [is2FAEnabled, setIs2FAEnabled] = useState(user?.is_2fa_enabled || false);
    const [loading, setLoading] = useState(false);
    const { timeLimitMinutes, setTimeLimit } = useSettingsStore();

    const handleToggle2FA = async (enabled: boolean) => {
        try {
            await identityApi.toggle2FA(enabled);
            setIs2FAEnabled(enabled);
            if (user) {
                updateUser({ ...user, is_2fa_enabled: enabled });
            }
        } catch (error: any) {
            console.error('Toggle 2FA error:', error);
            Alert.alert('Error', 'Failed to update security settings');
            setIs2FAEnabled(!enabled);
        }
    };

    const handleLogout = async () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to log out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        await clearAuth();
                        router.replace('/login');
                    }
                }
            ]
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
            <View className="flex-row items-center px-4 py-2 border-b border-border/10">
                <TouchableOpacity onPress={() => router.back()} className="p-2">
                    <ChevronLeft size={24} color="#64748B" />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-foreground ml-2">Settings</Text>
            </View>

            <ScrollView className="flex-1">
                <View className="p-6">
                    {/* Security Section */}
                    <Text className="text-sm font-bold text-muted-foreground mb-4 uppercase tracking-wider ml-1">Security</Text>

                    <View className="bg-secondary/30 rounded-3xl overflow-hidden mb-8">
                        <TouchableOpacity
                            className="flex-row items-center justify-between p-5 border-b border-border/10"
                            onPress={() => router.push('/change-password')}
                        >
                            <View className="flex-row items-center">
                                <View className="bg-primary/10 p-2 rounded-lg mr-4">
                                    <Lock size={20} color="#F59E0B" />
                                </View>
                                <Text className="text-foreground font-bold text-base">Change Password</Text>
                            </View>
                            <ChevronRight size={20} color="#94A3B8" />
                        </TouchableOpacity>

                        <View className="flex-row items-center justify-between p-5">
                            <View className="flex-row items-center">
                                <View className="bg-primary/10 p-2 rounded-lg mr-4">
                                    <Shield size={20} color="#F59E0B" />
                                </View>
                                <View>
                                    <Text className="text-foreground font-bold text-base">Two-Factor Auth</Text>
                                    <Text className="text-xs text-muted-foreground">Extra security for your login</Text>
                                </View>
                            </View>
                            <Switch
                                value={is2FAEnabled}
                                onValueChange={handleToggle2FA}
                                trackColor={{ false: '#767577', true: '#F59E0B' }}
                            />
                        </View>
                    </View>

                    {/* Time Management Section */}
                    <Text className="text-sm font-bold text-muted-foreground mb-4 uppercase tracking-wider ml-1">Time Management</Text>
                    <View className="bg-secondary/30 rounded-3xl overflow-hidden mb-8 p-5">
                        <View className="flex-row items-center mb-4">
                            <View className="bg-primary/10 p-2 rounded-lg mr-4">
                                <Clock size={20} color="#F59E0B" />
                            </View>
                            <View>
                                <Text className="text-foreground font-bold text-base">Daily Time Limit</Text>
                                <Text className="text-xs text-muted-foreground">Alert when daily usage exceeds limit</Text>
                            </View>
                        </View>

                        <View className="flex-row flex-wrap gap-2">
                            {[15, 30, 45, 60, 120].map((mins) => (
                                <TouchableOpacity
                                    key={mins}
                                    onPress={() => setTimeLimit(timeLimitMinutes === mins ? null : mins)}
                                    className={`px-4 py-2 rounded-full border ${timeLimitMinutes === mins
                                        ? 'bg-primary border-primary'
                                        : 'bg-transparent border-border'
                                        }`}
                                >
                                    <Text className={`${timeLimitMinutes === mins ? 'text-white font-bold' : 'text-foreground'
                                        }`}>
                                        {mins >= 60 ? `${mins / 60} ${mins === 60 ? 'hour' : 'hours'}` : `${mins} mins`}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Account Management Section */}
                    <Text className="text-sm font-bold text-muted-foreground mb-4 uppercase tracking-wider ml-1">Account</Text>

                    <View className="bg-secondary/30 rounded-3xl overflow-hidden mb-8">
                        <TouchableOpacity
                            className="flex-row items-center justify-between p-5"
                            onPress={() => router.push('/activity')}
                        >
                            <View className="flex-row items-center">
                                <View className="bg-primary/10 p-2 rounded-lg mr-4">
                                    <ActivityIcon size={20} color="#F59E0B" />
                                </View>
                                <Text className="text-foreground font-bold text-base">Security Activity</Text>
                            </View>
                            <ChevronRight size={20} color="#94A3B8" />
                        </TouchableOpacity>
                    </View>

                    {/* Danger Zone */}
                    <TouchableOpacity
                        className="flex-row items-center justify-center py-4 rounded-3xl bg-destructive/5 border border-destructive/10 mt-4"
                        onPress={handleLogout}
                    >
                        <LogOut size={20} color="#EF4444" className="mr-2" />
                        <Text className="text-destructive font-bold text-base">Log Out</Text>
                    </TouchableOpacity>
                </View>
                <View className="h-20" />
            </ScrollView>
        </SafeAreaView>
    );
};

export default SettingsScreen;
