import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FeedList } from '@/src/epics/content/components/FeedList';
import { Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function FeedScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      {/* Header */}
      <View className="px-6 py-3 flex-row justify-between items-center border-b border-border/30">
        <Text className="text-2xl font-black text-foreground tracking-tighter">NEXUS</Text>
        <TouchableOpacity
          className="bg-primary p-2 rounded-full shadow-lg shadow-primary/50"
          onPress={() => router.push('/create-post')}
        >
          <Plus size={24} color="#0F172A" />
        </TouchableOpacity>
      </View>

      {/* Feed Content */}
      <View className="flex-1">
        <FeedList />
      </View>
    </SafeAreaView>
  );
}
