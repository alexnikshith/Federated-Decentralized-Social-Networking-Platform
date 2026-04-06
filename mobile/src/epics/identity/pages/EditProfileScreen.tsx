import React, { useState } from 'react';
import { View, Text, ScrollView, Switch, TouchableOpacity, Alert, Platform, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { identityApi } from '../api/identityApi';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { useRouter } from 'expo-router';
import { ChevronLeft, Globe, Lock } from 'lucide-react-native';

const EditProfileScreen = () => {
    const { user, updateUser, refreshUser } = useAuthStore();
    const router = useRouter();

    if (!user) return null;

    const [displayName, setDisplayName] = useState(user.display_name || '');
    const [bio, setBio] = useState(user.bio || '');
    const [visibility, setVisibility] = useState<'public' | 'private' | 'followers'>(user.profile_visibility || 'public');
    const [isDiscoverable, setIsDiscoverable] = useState(user.is_discoverable ?? false);
    const [loading, setLoading] = useState(false);

    React.useEffect(() => {
        refreshUser();
    }, []);

    React.useEffect(() => {
        if (user) {
            setDisplayName(user.display_name || '');
            setBio(user.bio || '');
            setVisibility(user.profile_visibility || 'public');
            setIsDiscoverable(user.is_discoverable ?? false);
        }
    }, [user]);

    const isSubmittingRef = React.useRef(false);

    const handleSave = async () => {
        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;
        setLoading(true);

        try {
            const updatedUser = await identityApi.updateProfile({
                display_name: displayName,
                bio: bio,
                // Map 'private' to 'followers' if it happens to be set that way, 
                // but primarily we are switching to 'followers' for non-public.
                profile_visibility: visibility === 'private' ? 'followers' : visibility,
                is_discoverable: isDiscoverable,
            });
            updateUser(updatedUser);
            Alert.alert('Success', 'Profile updated successfully');
            router.back();
        } catch (error: any) {
            console.error('Update profile error:', error);
            if (error.response) {
                console.error('Error data:', error.response.data);
                console.error('Error status:', error.response.status);
            }
            Alert.alert('Error', error.response?.data?.message || 'Failed to update profile');
        } finally {
            setLoading(false);
            isSubmittingRef.current = false;
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
            <View className="flex-row items-center px-4 py-2 border-b border-border/10">
                <TouchableOpacity onPress={() => router.back()} className="p-2">
                    <ChevronLeft size={24} color="#64748B" />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-foreground ml-2">Edit Profile</Text>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
            >
                <ScrollView className="p-6">
                    <View className="space-y-6">
                        <Input
                            label="Display Name"
                            value={displayName}
                            onChangeText={setDisplayName}
                            placeholder="Your display name"
                        />

                        <View className="mb-4">
                            <Text className="text-foreground/70 mb-2 ml-1 font-medium text-sm">Bio</Text>
                            <Input
                                value={bio}
                                onChangeText={setBio}
                                placeholder="Tell us about yourself"
                                className="h-32 text-top"
                            // multiline={true} // Input component might not support this yet, but good to have
                            />
                        </View>

                        <Text className="text-sm font-bold text-muted-foreground mt-4 mb-2 ml-1 uppercase tracking-wider">Privacy Settings</Text>

                        <View className="bg-secondary/30 rounded-2xl p-4 space-y-4">
                            <View className="flex-row items-center justify-between">
                                <View className="flex-row items-center">
                                    <View className="bg-primary/10 p-2 rounded-lg mr-3">
                                        <Globe size={20} color="#F59E0B" />
                                    </View>
                                    <View>
                                        <Text className="text-foreground font-bold">Public Profile</Text>
                                        <Text className="text-xs text-muted-foreground">Anyone can see your posts</Text>
                                    </View>
                                </View>
                                <Switch
                                    value={visibility === 'public'}
                                    onValueChange={(val) => setVisibility(val ? 'public' : 'followers')}
                                    trackColor={{ false: '#767577', true: '#F59E0B' }}
                                />
                            </View>

                            <View className="flex-row items-center justify-between">
                                <View className="flex-row items-center">
                                    <View className="bg-primary/10 p-2 rounded-lg mr-3">
                                        <Lock size={20} color="#F59E0B" />
                                    </View>
                                    <View>
                                        <Text className="text-foreground font-bold">Discoverable</Text>
                                        <Text className="text-xs text-muted-foreground">List profile in global directory</Text>
                                    </View>
                                </View>
                                <Switch
                                    value={isDiscoverable}
                                    onValueChange={setIsDiscoverable}
                                    trackColor={{ false: '#767577', true: '#F59E0B' }}
                                />
                            </View>
                        </View>

                        <Button
                            title="Save Changes"
                            onPress={handleSave}
                            loading={loading}
                            className="mt-10"
                        />
                    </View>
                    <View className="h-20" />
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default EditProfileScreen;
