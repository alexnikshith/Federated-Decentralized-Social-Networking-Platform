import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { useAuthStore } from '../store/authStore';
import { identityApi } from '../api/identityApi';
import { Activity, Globe, ChevronDown, Check, X } from 'lucide-react-native';
import { COMMUNITIES, DEFAULT_COMMUNITY, getCommunityUrl } from '../../../config/communities';

const LoginScreen = () => {
    const router = useRouter();
    const { setAuth, setActiveInstance, activeInstanceUrl } = useAuthStore();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState(1); // 1: Login, 2: OTP
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [showInstanceSelector, setShowInstanceSelector] = useState(false);
    const [selectedCommunity, setSelectedCommunity] = useState(
        COMMUNITIES.find(c => c.url === activeInstanceUrl) || DEFAULT_COMMUNITY
    );

    useEffect(() => {
        // Initialize active instance
        if (!activeInstanceUrl) {
            setActiveInstance(DEFAULT_COMMUNITY.url);
        } else {
            const found = COMMUNITIES.find(c => c.url === activeInstanceUrl);
            if (found) setSelectedCommunity(found);
        }
    }, []);

    const handleCommunitySelect = (community: typeof DEFAULT_COMMUNITY) => {
        setSelectedCommunity(community);
        setActiveInstance(community.url);
        setShowInstanceSelector(false);
    };

    const isSubmittingRef = React.useRef(false);

    const handleLogin = async () => {
        if (isSubmittingRef.current) return;

        if (step === 1 && (!email || !password)) {
            setError('Please fill in email and password');
            return;
        }
        if (step === 2 && !otp) {
            setError('Please enter the verification code');
            return;
        }

        isSubmittingRef.current = true;
        setLoading(true);
        setError('');

        try {
            // Ensure we use the correct instance URL (handling emulator localhost)
            const baseUrl = getCommunityUrl(selectedCommunity.url);
            console.log('LoginScreen: Attempting login to:', baseUrl);

            if (step === 1) {
                const data = await identityApi.login({ email, password });
                const { token, user } = data;

                if (token) {
                    await setAuth(user, token);
                    router.replace('/(tabs)');
                } else {
                    // No token means OTP is required
                    setStep(2);
                }
            } else {
                // Verify OTP
                const data = await identityApi.verifyOTP({ email, code: otp });
                const { token, user } = data;

                if (token) {
                    await setAuth(user, token);
                    router.replace('/(tabs)');
                } else {
                    setError('Verification failed. No token received.');
                }
            }
        } catch (err: any) {
            console.error('Login error:', err);
            if (err.response) {
                console.error('Error status:', err.response.status);
                console.error('Error data:', err.response.data);
            }
            setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
            isSubmittingRef.current = false;
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
            {/* ... KeyboardAvoidingView and ScrollView ... */}
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
                            <Text className="text-3xl font-bold text-foreground mb-2">
                                {step === 1 ? 'Welcome Back' : 'Verify It\'s You'}
                            </Text>
                            <Text className="text-muted-foreground text-center">
                                {step === 1
                                    ? 'Join the decentralized conversation in the Nexus.'
                                    : `We've sent a 6-digit code to ${email}. Please enter it below.`}
                            </Text>
                        </View>

                        <View className="space-y-4">
                            {step === 1 ? (
                                <>
                                    {/* Instance Selector */}
                                    <View>
                                        <Text className="text-sm font-bold text-muted-foreground mb-2 ml-1">INSTANCE</Text>
                                        <TouchableOpacity
                                            onPress={() => setShowInstanceSelector(true)}
                                            className="flex-row items-center justify-between bg-secondary/50 border border-border rounded-2xl p-4"
                                        >
                                            <View className="flex-row items-center">
                                                <View className="bg-primary/10 p-2 rounded-lg mr-3">
                                                    <Globe size={20} color="#F59E0B" />
                                                </View>
                                                <View>
                                                    <Text className="text-foreground font-bold">{selectedCommunity.name}</Text>
                                                    {/* <Text className="text-xs text-muted-foreground">{selectedCommunity.url}</Text> */}
                                                </View>
                                            </View>
                                            <ChevronDown size={20} color="#94A3B8" />
                                        </TouchableOpacity>
                                        <Text className="text-xs text-muted-foreground mt-1 ml-1">
                                            Select the community instance your account belongs to
                                        </Text>
                                    </View>

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
                                </>
                            ) : (
                                <View>
                                    <View className="mb-4">
                                        <Input
                                            label="Verification Code"
                                            value={otp}
                                            onChangeText={setOtp}
                                            placeholder="Enter 6-digit code"
                                            keyboardType="number-pad"
                                            maxLength={6}
                                            className="text-center text-2xl tracking-widest font-mono h-16"
                                            error={error && !otp ? 'OTP is required' : ''}
                                        />
                                    </View>
                                    <TouchableOpacity onPress={() => setStep(1)} className="items-center mt-2">
                                        <Text className="text-primary font-bold">Use a different email</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {error && !((step === 1 && (!email || !password)) || (step === 2 && !otp)) && (
                                <Text className="text-destructive text-center mb-4 font-medium">{error}</Text>
                            )}

                            <Button
                                title={step === 1 ? "Sign In" : "Verify Code"}
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

            {/* Instance Selector Modal */}
            <Modal
                visible={showInstanceSelector}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowInstanceSelector(false)}
            >
                <View className="flex-1 justify-end bg-black/50">
                    <View className="bg-background rounded-t-[32px] p-6 max-h-[80%]">
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-xl font-bold text-foreground">Select Community</Text>
                            <TouchableOpacity onPress={() => setShowInstanceSelector(false)} className="p-2 bg-secondary rounded-full">
                                <X size={20} color="#94A3B8" />
                            </TouchableOpacity>
                        </View>

                        <FlatList
                            data={COMMUNITIES}
                            keyExtractor={item => item.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    onPress={() => handleCommunitySelect(item)}
                                    className={`flex-row items-center justify-between p-4 mb-3 rounded-2xl border ${selectedCommunity.id === item.id ? 'bg-primary/10 border-primary' : 'bg-secondary/30 border-border'}`}
                                >
                                    <View className="flex-row items-center flex-1">
                                        <View className={`w-12 h-12 rounded-xl flex items-center justify-center mr-4 ${selectedCommunity.id === item.id ? 'bg-primary' : 'bg-secondary'}`}>
                                            <Globe size={24} color={selectedCommunity.id === item.id ? 'white' : '#94A3B8'} />
                                        </View>
                                        <View className="flex-1">
                                            <Text className={`font-bold text-lg ${selectedCommunity.id === item.id ? 'text-primary' : 'text-foreground'}`}>{item.name}</Text>
                                            <Text className="text-xs text-muted-foreground" numberOfLines={1}>{item.description}</Text>
                                        </View>
                                    </View>
                                    {selectedCommunity.id === item.id && (
                                        <View className="bg-primary rounded-full p-1 ml-2">
                                            <Check size={12} color="white" />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

export default LoginScreen;
