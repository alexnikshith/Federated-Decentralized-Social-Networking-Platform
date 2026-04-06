import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FeedList } from '@/src/epics/content/components/FeedList';
import { Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function FeedScreen() {
  const router = useRouter();
  const [feedType, setFeedType] = useState<'home' | 'public'>('home');

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      {/* Header */}
      <View className="px-6 py-3 flex-row justify-between items-center bg-background border-b border-border/30">
        <View>
          <Text className="text-2xl font-black text-foreground tracking-tighter">NEXUS</Text>
          <View className="flex-row items-center mt-1">
            <TouchableOpacity
              onPress={() => setFeedType('home')}
              className="mr-4"
            >
              <Text className={`text-sm font-bold ${feedType === 'home' ? 'text-primary' : 'text-muted-foreground'}`}>Following</Text>
              {feedType === 'home' && <View className="h-0.5 bg-primary mt-0.5" />}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setFeedType('public')}>
              <Text className={`text-sm font-bold ${feedType === 'public' ? 'text-primary' : 'text-muted-foreground'}`}>Global</Text>
              {feedType === 'public' && <View className="h-0.5 bg-primary mt-0.5" />}
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity
          className="bg-primary p-2 rounded-full shadow-lg shadow-primary/50"
          onPress={() => router.push('/create-post')}
        >
          <Plus size={24} color="#0F172A" />
        </TouchableOpacity>
      </View>

      {/* Feed Content */}
      <View className="flex-1">
        <FeedList type={feedType} />
      </View>
    </SafeAreaView>
  );
}
