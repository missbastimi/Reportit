import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/store/useAuthStore';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isAdmin = useAuthStore((state) => state.profile?.role === 'admin');

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: 'Report',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="exclamationmark.bubble.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="my-reports"
        options={{
          title: 'My Reports',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="list.bullet.clipboard.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="map.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="paperplane.fill" color={color} />,
        }}
      />
      <Tabs.Protected guard={isAdmin}>
        <Tabs.Screen
          name="admin"
          options={{
            title: 'Admin',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="shield.fill" color={color} />,
          }}
        />
      </Tabs.Protected>
    </Tabs>
  );
}
