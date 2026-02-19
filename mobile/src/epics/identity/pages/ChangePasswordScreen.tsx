import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Platform, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { identityApi } from '../api/identityApi';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { useRouter } from 'expo-router';
import { ChevronLeft, Lock, ShieldCheck } from 'lucide-react-native';
import { useAuthStore } from '../store/authStore';

const ChangePasswordScreen = () => {
    const router = useRouter();
    const { clearAuth } = useAuthStore();
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (!oldPassword || !newPassword || !confirmPassword) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        if (newPassword !== confirmPassword) {
            Alert.alert('Error', 'New passwords do not match');
            return;
        }

        if (newPassword.length < 8) {
            Alert.alert('Error', 'Password must be at least 8 characters long');
            return;
        }

        setLoading(true);
        try {
            await identityApi.changePassword({
                old_password: oldPassword,
                new_password: newPassword,
            });

            Alert.alert(
                'Success',
                'Password changed successfully. Please log in again.',
                [{
                    text: 'OK',
                    onPress: async () => {
                        await clearAuth();
                        router.replace('/login');
                    }
                }]
            );
        } catch (error: any) {
            console.error('Change password error:', error);
            Alert.alert('Error', error.response?.data?.message || 'Failed to change password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
            <View className="flex-row items-center px-4 py-2 border-b border-border/10">
                <TouchableOpacity onPress={() => router.back()} className="p-2">
                    <ChevronLeft size={24} color="#64748B" />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-foreground ml-2">Change Password</Text>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
            >
                <ScrollView className="p-6">
                    <View className="items-center mb-10 mt-4">
                        <View className="bg-primary/10 p-5 rounded-full mb-4">
                            <ShieldCheck size={48} color="#F59E0B" />
                        </View>
                        <Text className="text-muted-foreground text-center px-4">
                            To ensure your account's security, we recommend using a unique password that you don't use elsewhere.
                        </Text>
                    </View>

                    <View className="space-y-4">
                        <Input
                            label="Current Password"
                            value={oldPassword}
                            onChangeText={setOldPassword}
                            placeholder="Enter current password"
                            secureTextEntry
                        />

                        <Input
                            label="New Password"
                            value={newPassword}
                            onChangeText={setNewPassword}
                            placeholder="Enter new password"
                            secureTextEntry
                        />
                        <Text className="text-[10px] text-muted-foreground ml-1 -mt-2">Minimum 8 characters</Text>

                        <Input
                            label="Confirm New Password"
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            placeholder="Confirm new password"
                            secureTextEntry
                        />

                        <Button
                            title="Update Password"
                            onPress={handleSave}
                            loading={loading}
                            className="mt-8"
                        />
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default ChangePasswordScreen;
