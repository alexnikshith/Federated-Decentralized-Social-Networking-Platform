import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { identityApi } from '../api/identityApi';
import { Button } from '../../../components/ui/Button';
import { useRouter } from 'expo-router';
import { ChevronLeft, AlertTriangle, Trash2, PowerOff } from 'lucide-react-native';
import { useAuthStore } from '../store/authStore';

const AccountManagementScreen = () => {
    const router = useRouter();
    const { clearAuth } = useAuthStore();
    const [loading, setLoading] = useState(false);

    const handleDeactivate = async () => {
        Alert.alert(
            'Deactivate Account',
            'Are you sure? This will hide your profile and content. You will need to contact support to reactivate.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Deactivate',
                    style: 'destructive',
                    onPress: async () => {
                        setLoading(true);
                        try {
                            await identityApi.deactivateAccount();
                            await clearAuth();
                            router.replace('/login');
                        } catch (error: any) {
                            Alert.alert('Error', error.response?.data?.message || 'Failed to deactivate account');
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const handleDelete = async () => {
        Alert.alert(
            'PERMANENT DELETE',
            'THIS CANNOT BE UNDONE. All your data will be permanently removed. Are you absolutely sure?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'DELETE PERMANENTLY',
                    style: 'destructive',
                    onPress: async () => {
                        setLoading(true);
                        try {
                            await identityApi.deleteAccount();
                            await clearAuth();
                            router.replace('/login');
                        } catch (error: any) {
                            Alert.alert('Error', error.response?.data?.message || 'Failed to delete account');
                        } finally {
                            setLoading(false);
                        }
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
                <Text className="text-xl font-bold text-foreground ml-2">Account Management</Text>
            </View>

            <ScrollView className="p-6">
                <View className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-900/30 rounded-3xl p-6 mb-6">
                    <View className="flex-row items-start mb-4">
                        <View className="bg-orange-100 dark:bg-orange-900/40 p-3 rounded-full mr-4">
                            <PowerOff size={24} color="#EA580C" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-orange-900 dark:text-orange-400 font-bold text-lg mb-1">Deactivate Account</Text>
                            <Text className="text-orange-800/70 dark:text-orange-400/70 text-sm leading-5">
                                Temporarily disable your account. Your profile and posts will be hidden until you reactivate.
                            </Text>
                        </View>
                    </View>
                    <Button
                        title="Deactivate My Account"
                        variant="outline"
                        onPress={handleDeactivate}
                        disabled={loading}
                        className="border-orange-200"
                    />
                </View>

                <View className="bg-destructive/5 border border-destructive/10 rounded-3xl p-6">
                    <View className="flex-row items-start mb-4">
                        <View className="bg-destructive/10 p-3 rounded-full mr-4">
                            <Trash2 size={24} color="#EF4444" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-destructive font-bold text-lg mb-1">Delete Account</Text>
                            <Text className="text-destructive/70 text-sm leading-5">
                                Permanently delete your account and all associated data from the Nexus. This action is irreversible.
                            </Text>
                        </View>
                    </View>
                    <Button
                        title="Delete Permanently"
                        variant="destructive"
                        onPress={handleDelete}
                        disabled={loading}
                    />
                </View>

                <View className="mt-8 px-2 flex-row items-start">
                    <AlertTriangle size={16} color="#94A3B8" className="mr-2 mt-0.5" />
                    <Text className="text-muted-foreground text-xs flex-1">
                        By performing these actions, you acknowledge that your data may be retained in federated instances if your content was shared with them prior to account closure.
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default AccountManagementScreen;
