import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { useAuthStore } from '../store/authStore';
import { api } from '../../../lib/api';
import { UserPlus } from 'lucide-react-native';

const SignupScreen = () => {
    const router = useRouter();
    const setAuth = useAuthStore(state => state.setAuth);

    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSignup = async () => {
        if (!username || !email || !password) {
            setError('Please fill in required fields');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await api.post('/auth/signup', {
                username,
                email,
                password,
                display_name: displayName || username
            });

            const { token, user } = response.data;
            await setAuth(user, token);
            router.replace('/(tabs)');
        } catch (err: any) {
            console.error('Signup error:', err);
            setError(err.response?.data?.message || 'Signup failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-background">
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
            >
                <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="p-6">
                    <View className="flex-1 justify-center">
                        <View className="items-center mb-10">
                            <View className="bg-accent/20 p-4 rounded-3xl mb-4">
                                <UserPlus size={48} color="#0D9488" />
                            </View>
                            <Text className="text-3xl font-bold text-foreground mb-2">Join Nexus</Text>
                            <Text className="text-muted-foreground text-center">
                                Create your decentralized identity today.
                            </Text>
                        </View>

                        <View className="space-y-4">
                            <Input
                                label="Username *"
                                value={username}
                                onChangeText={setUsername}
                                placeholder="Choose a unique username"
                                error={error && !username ? 'Username is required' : ''}
                            />

                            <Input
                                label="Display Name"
                                value={displayName}
                                onChangeText={setDisplayName}
                                placeholder="How others will see you"
                            />

                            <Input
                                label="Email *"
                                value={email}
                                onChangeText={setEmail}
                                placeholder="Enter your email"
                                keyboardType="email-address"
                                error={error && !email ? 'Email is required' : ''}
                            />

                            <Input
                                label="Password *"
                                value={password}
                                onChangeText={setPassword}
                                placeholder="Create a strong password"
                                secureTextEntry
                                error={error && !password ? 'Password is required' : ''}
                            />

                            {error && !(!username || !email || !password) && (
                                <Text className="text-destructive text-center mb-4 font-medium">{error}</Text>
                            )}

                            <Button
                                title="Create Account"
                                onPress={handleSignup}
                                loading={loading}
                                className="mt-4"
                                variant="primary"
                            />
                        </View>

                        <View className="flex-row justify-center mt-8">
                            <Text className="text-muted-foreground mr-2">Already have an account?</Text>
                            <TouchableOpacity onPress={() => router.push('/login')}>
                                <Text className="text-primary font-bold">Sign In</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default SignupScreen;
