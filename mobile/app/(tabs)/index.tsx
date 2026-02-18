import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/epics/identity/store/authStore';

export default function FeedScreen() {
  const { user } = useAuthStore();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      <View className="flex-1 items-center justify-center p-6">
        <View className="bg-primary/10 p-6 rounded-3xl items-center">
          <Text className="text-2xl font-bold text-foreground mb-2">Welcome to Nexus, {user?.display_name || 'User'}!</Text>
          <Text className="text-muted-foreground text-center">
            You have successfully verified your decentralized identity.
          </Text>
        </View>
        <Text className="mt-10 text-muted-foreground italic">
          Phase 2: Content Sharing (Feed) is coming next...
        </Text>
      </View>
    </SafeAreaView>
  );
}
