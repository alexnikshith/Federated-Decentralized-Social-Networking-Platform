import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { useAuthStore } from '../store/authStore';
import { identityApi } from '../api/identityApi';
import { Globe, ArrowRight, ArrowLeft, Check, Users, Loader2 } from 'lucide-react-native';
import { COMMUNITIES, DEFAULT_COMMUNITY, getCommunityUrl } from '../../../config/communities';
import { api } from '../../../lib/api';

const SignupScreen = () => {
    const router = useRouter();
    const { setAuth, setActiveInstance, activeInstanceUrl } = useAuthStore();

    const [step, setStep] = useState<1 | 2>(1);
    const [selectedCommunity, setSelectedCommunity] = useState(
        COMMUNITIES.find(c => c.url === activeInstanceUrl) || DEFAULT_COMMUNITY
    );

    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        display_name: '',
        is_discoverable: true,
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Username validation
    const [isCheckingUsername, setIsCheckingUsername] = useState(false);
    const [usernameError, setUsernameError] = useState('');
    const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);

    // Initialize active instance from store
    useEffect(() => {
        if (!activeInstanceUrl) {
            setActiveInstance(DEFAULT_COMMUNITY.url);
        } else {
            const found = COMMUNITIES.find(c => c.url === activeInstanceUrl);
            if (found) setSelectedCommunity(found);
        }
    }, []);

    // Debounced username check
    useEffect(() => {
        if (!formData.username) {
            setUsernameError('');
            setUsernameAvailable(null);
            return;
        }

        if (formData.username.includes(' ')) {
            setUsernameError('Username cannot contain spaces');
            setUsernameAvailable(null);
            return;
        }

        if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
            setUsernameError('Only letters, numbers and underscores');
            setUsernameAvailable(null);
            return;
        }

        setUsernameError('');
        const timer = setTimeout(async () => {
            // Skip check if we are on step 1
            if (step === 1) return;

            setIsCheckingUsername(true);
            try {
                // Ensure we use the correct instance URL for checks
                const baseUrl = getCommunityUrl(selectedCommunity.url);

                // We use standard axios check here for simplicity or add it to identityApi
                const response = await api.get(`/auth/check-username?username=${formData.username}`);
                const taken = response.data.taken;

                setUsernameAvailable(!taken);
                if (taken) {
                    setUsernameError('Username is already taken');
                }
            } catch (err) {
                console.log('Username check failed, skipping validation', err);
            } finally {
                setIsCheckingUsername(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [formData.username, step, selectedCommunity]);


    const handleCommunitySelect = (community: typeof DEFAULT_COMMUNITY) => {
        setSelectedCommunity(community);
        setActiveInstance(community.url);
    };

    const handleNextStep = () => {
        setStep(2);
    };

    const isSubmittingRef = React.useRef(false);

    const handleSignup = async () => {
        if (isSubmittingRef.current) return;

        if (!formData.username || !formData.email || !formData.password || !formData.confirmPassword) {
            setError('Please fill in required fields');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (usernameError) return;

        isSubmittingRef.current = true;
        setLoading(true);
        setError('');

        try {
            // Update store one last time to be sure
            await setActiveInstance(selectedCommunity.url);

            const data = await identityApi.signup({
                username: formData.username,
                email: formData.email,
                password: formData.password,
                display_name: formData.display_name || formData.username,
                is_discoverable: formData.is_discoverable
            });

            // Web flow redirects to login, but mobile often auto-logs in.
            if (data.token && data.user) {
                await setAuth(data.user, data.token);
                router.replace('/(tabs)');
            } else {
                router.replace('/login');
            }

        } catch (err: any) {
            console.error('Signup error:', err);
            setError(err.response?.data?.message || 'Signup failed. Please try again.');
        } finally {
            setLoading(false);
            isSubmittingRef.current = false;
        }
    };

    const updateForm = (key: string, value: any) => {
        setFormData(prev => ({ ...prev, [key]: value }));
        if (error) setError('');
    };

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
            >
                <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="p-6">

                    {/* Header */}
                    <View className="mb-8">
                        <TouchableOpacity onPress={() => router.back()} className="flex-row items-center mb-6">
                            <ArrowLeft size={20} color="#94A3B8" />
                            <Text className="text-muted-foreground ml-2">Back to home</Text>
                        </TouchableOpacity>

                        <View className="flex-row items-center mb-4">
                            <View className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mr-4">
                                <Globe size={24} color="#F59E0B" />
                            </View>
                            <View>
                                <Text className="text-3xl font-extrabold text-foreground">Join the</Text>
                                <Text className="text-3xl font-extrabold text-primary italic">Federation</Text>
                            </View>
                        </View>
                        <Text className="text-muted-foreground text-lg">
                            Create your account on a community instance that fits you.
                        </Text>
                    </View>

                    {step === 1 ? (
                        <View className="space-y-4">
                            <Text className="text-xs font-bold text-primary uppercase tracking-widest mb-2">
                                CHOOSE YOUR COMMUNITY
                            </Text>

                            {COMMUNITIES.map((community) => (
                                <TouchableOpacity
                                    key={community.id}
                                    onPress={() => handleCommunitySelect(community)}
                                    className={`relative p-5 rounded-3xl border transition-all ${selectedCommunity.id === community.id
                                        ? "bg-primary/10 border-primary"
                                        : "bg-secondary/30 border-border"
                                        }`}
                                >
                                    <View className="flex-row items-start gap-4">
                                        <View className={`w-12 h-12 rounded-xl flex items-center justify-center ${selectedCommunity.id === community.id ? "bg-primary" : "bg-muted"
                                            }`}>
                                            <Users size={24} color={selectedCommunity.id === community.id ? "white" : "#94A3B8"} />
                                        </View>
                                        <View className="flex-1">
                                            <Text className={`font-bold text-lg mb-1 ${selectedCommunity.id === community.id ? "text-primary" : "text-foreground"
                                                }`}>
                                                {community.name}
                                            </Text>
                                            <Text className="text-xs text-muted-foreground" numberOfLines={2}>
                                                {community.description}
                                            </Text>
                                        </View>
                                    </View>

                                    <View className="flex-row items-center justify-end mt-2 gap-2">
                                        <Text className="text-[10px] font-bold text-emerald-500 uppercase">ACTIVE</Text>
                                        {selectedCommunity.id === community.id && (
                                            <View className="bg-primary rounded-full p-1">
                                                <Check size={10} color="white" />
                                            </View>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            ))}

                            <Button
                                title="Continue to Account Details"
                                onPress={handleNextStep}
                                className="mt-4"
                                icon={<ArrowRight size={20} color="white" />}
                            />
                        </View>
                    ) : (
                        <View className="space-y-4 animate-fade-in">
                            {/* Selected Community Summary */}
                            <View className="p-4 rounded-2xl bg-primary/5 border border-primary/20 flex-row items-center justify-between mb-4">
                                <View className="flex-row items-center gap-3">
                                    <View className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                                        <Users size={20} color="#F59E0B" />
                                    </View>
                                    <View>
                                        <Text className="font-bold text-foreground text-sm">{selectedCommunity.name}</Text>
                                        {/* <Text className="text-xs text-muted-foreground">{selectedCommunity.url}</Text> */}
                                    </View>
                                </View>
                                <TouchableOpacity onPress={() => setStep(1)}>
                                    <Text className="text-[10px] font-bold text-primary uppercase">CHANGE</Text>
                                </TouchableOpacity>
                            </View>

                            <Text className="text-xl font-bold text-foreground mb-4">Account Details</Text>

                            <Input
                                label="Display Name"
                                value={formData.display_name}
                                onChangeText={(v) => updateForm('display_name', v)}
                                placeholder="John Doe"
                            />

                            <View>
                                <Input
                                    label="Username"
                                    value={formData.username}
                                    onChangeText={(v) => updateForm('username', v.toLowerCase())}
                                    placeholder="your_username"
                                    error={usernameError}
                                />
                                {isCheckingUsername && (
                                    <View className="absolute right-4 top-10">
                                        <Loader2 size={16} color="#F59E0B" className="animate-spin" />
                                    </View>
                                )}
                                {usernameAvailable === true && !usernameError && (
                                    <View className="absolute right-4 top-10">
                                        <Check size={16} color="#10B981" />
                                    </View>
                                )}
                            </View>

                            <Input
                                label="Email"
                                value={formData.email}
                                onChangeText={(v) => updateForm('email', v)}
                                placeholder="you@example.com"
                                keyboardType="email-address"
                                error={error && !formData.email ? 'Email is required' : ''}
                            />

                            <View className="flex-row gap-4">
                                <View className="flex-1">
                                    <Input
                                        label="Password"
                                        value={formData.password}
                                        onChangeText={(v) => updateForm('password', v)}
                                        placeholder="••••••••"
                                        secureTextEntry
                                        error={error && !formData.password ? 'Required' : ''}
                                    />
                                </View>
                                <View className="flex-1">
                                    <Input
                                        label="Confirm"
                                        value={formData.confirmPassword}
                                        onChangeText={(v) => updateForm('confirmPassword', v)}
                                        placeholder="••••••••"
                                        secureTextEntry
                                        error={error && !formData.confirmPassword ? 'Required' : ''}
                                    />
                                </View>
                            </View>

                            {error && (
                                <Text className="text-destructive text-center mb-2 font-medium">{error}</Text>
                            )}

                            <Text className="text-[10px] text-muted-foreground text-center px-4 mt-2">
                                By clicking "Create Account", you agree to our <Text className="text-primary">Terms of Service</Text> and <Text className="text-primary">Privacy Policy</Text>.
                            </Text>

                            <Button
                                title="Create Account"
                                onPress={handleSignup}
                                loading={loading}
                                className="mt-4"
                            />
                        </View>
                    )}

                    <View className="flex-row justify-center mt-8 pb-10">
                        <Text className="text-muted-foreground mr-2">Already have an account?</Text>
                        <TouchableOpacity onPress={() => router.push('/login')}>
                            <Text className="text-primary font-bold">Sign In</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default SignupScreen;
