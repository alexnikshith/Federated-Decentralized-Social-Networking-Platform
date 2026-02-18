import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { useAuthStore } from '../store/authStore';
import { api } from '../../../lib/api';
import { Activity } from 'lucide-react-native';

const LoginScreen = () => {
    const router = useRouter();
    const setAuth = useAuthStore(state => state.setAuth);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async () => {
        if (!email || !password) {
            setError('Please fill in all fields');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await api.post('/auth/login', { email, password });
            const { token, user } = response.data;

            await setAuth(user, token);
            router.replace('/(tabs)');
        } catch (err: any) {
            console.error('Login error:', err);
            setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
            >
                <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="p-6">
                    <View className="flex-1 justify-center">
                        <View className="items-center mb-10">
                            <View className="bg-primary/20 p-4 rounded-3xl mb-4">
                                <Activity size={48} color="#F59E0B" />
                            </View>
                            <Text className="text-3xl font-bold text-foreground mb-2">Welcome Back</Text>
                            <Text className="text-muted-foreground text-center">
                                Join the decentralized conversation in the Nexus.
                            </Text>
                        </View>

                        <View className="space-y-4">
                            <Input
                                label="Email"
                                value={email}
                                onChangeText={setEmail}
                                placeholder="Enter your email"
                                keyboardType="email-address"
                                error={error && !email ? 'Email is required' : ''}
                            />

                            <Input
                                label="Password"
                                value={password}
                                onChangeText={setPassword}
                                placeholder="Enter your password"
                                secureTextEntry
                                error={error && !password ? 'Password is required' : ''}
                            />

                            {error && !(!email || !password) && (
                                <Text className="text-destructive text-center mb-4 font-medium">{error}</Text>
                            )}

                            <Button
                                title="Sign In"
                                onPress={handleLogin}
                                loading={loading}
                                className="mt-4"
                            />
                        </View>

                        <View className="flex-row justify-center mt-8">
                            <Text className="text-muted-foreground mr-2">Don't have an account?</Text>
                            <TouchableOpacity onPress={() => router.push('/signup')}>
                                <Text className="text-primary font-bold">Create Account</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default LoginScreen;
