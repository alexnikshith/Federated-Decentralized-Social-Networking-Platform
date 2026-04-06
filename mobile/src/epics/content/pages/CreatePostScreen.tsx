import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { X, Image as ImageIcon, Send } from 'lucide-react-native';
import { Button } from '../../../components/ui/Button';
import { postApi } from '../api/postApi';
import * as Haptics from 'expo-haptics';

const CreatePostScreen = () => {
    const router = useRouter();
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleCreate = async () => {
        if (!content.trim()) return;

        setLoading(true);
        setError('');

        try {
            await postApi.createPost({ content });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.back();
        } catch (err: any) {
            console.error('Failed to create post:', err);
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right', 'bottom']}>
            <View className="px-6 py-4 flex-row justify-between items-center border-b border-border/30">
                <TouchableOpacity onPress={() => router.back()} disabled={loading}>
                    <X size={24} color="#64748B" />
                </TouchableOpacity>
                <Text className="text-lg font-bold text-foreground">Create Post</Text>
                <TouchableOpacity
                    onPress={handleCreate}
                    disabled={loading || !content.trim()}
                    className={`px-4 py-2 rounded-full ${content.trim() ? 'bg-primary' : 'bg-muted'}`}
                >
                    {loading ? (
                        <ActivityIndicator size="small" color="#0F172A" />
                    ) : (
                        <Text className={`font-bold ${content.trim() ? 'text-foreground' : 'text-muted-foreground'}`}>Post</Text>
                    )}
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                className="flex-1"
            >
                <ScrollView className="flex-1 p-6">
                    <TextInput
                        placeholder="What's happening in your community?"
                        placeholderTextColor="#94A3B8"
                        multiline
                        autoFocus
                        className="text-lg text-foreground min-h-[200px]"
                        style={{ textAlignVertical: 'top' }}
                        value={content}
                        onChangeText={setContent}
                        maxLength={500}
                    />

                    {error ? (
                        <Text className="text-destructive mt-2">{error}</Text>
                    ) : null}

                    <Text className="text-right text-muted-foreground text-xs mt-2">
                        {content.length}/500
                    </Text>
                </ScrollView>

                {/* Toolbar */}
                <View className="p-4 border-t border-border/30 flex-row items-center bg-card">
                    <TouchableOpacity className="p-3 bg-secondary rounded-full mr-4">
                        <ImageIcon size={20} color="#0D9488" />
                    </TouchableOpacity>
                    <Text className="text-muted-foreground text-sm">Tap icon to add media</Text>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default CreatePostScreen;
