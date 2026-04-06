import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Link, Tabs } from 'expo-router';
import { Pressable } from 'react-native';

import { Home, User as UserIcon } from 'lucide-react-native';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#F59E0B', // Nexus Gold
        headerShown: useClientOnlyValue(false, true),
        headerStyle: {
          backgroundColor: colorScheme === 'dark' ? '#0F172A' : '#FDFCFB',
        },
        tabBarStyle: {
          backgroundColor: colorScheme === 'dark' ? '#0F172A' : '#FDFCFB',
        }
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color }) => <Home size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <UserIcon size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
