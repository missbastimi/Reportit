import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { onAuthStateChanged } from 'firebase/auth';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';

import { Palette } from '@/constants/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { fetchUserProfile } from '@/lib/auth';
import { auth } from '@/lib/firebase';
import { getOnboardingComplete } from '@/lib/onboarding';
import { useAuthStore } from '@/store/useAuthStore';
import { useOnboardingStore } from '@/store/useOnboardingStore';

import '@/global.css';

function LoadingScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <ActivityIndicator size="large" color={Palette.primary} />
    </View>
  );
}

function RootNavigator() {
  const user = useAuthStore((state) => state.user);
  // Guaranteed true or false by the time this renders — RootLayout only
  // mounts it once both authLoading is false and onboardingComplete !== null.
  const onboardingComplete = useOnboardingStore((state) => state.completed);

  return (
    <Stack>
      <Stack.Protected guard={onboardingComplete === false}>
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={onboardingComplete === true && !!user}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        <Stack.Screen name="report/[id]" options={{ title: 'Report' }} />
      </Stack.Protected>
      <Stack.Protected guard={onboardingComplete === true && !user}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const authLoading = useAuthStore((state) => state.loading);
  const setUser = useAuthStore((state) => state.setUser);
  const setProfile = useAuthStore((state) => state.setProfile);
  const setLoading = useAuthStore((state) => state.setLoading);

  const onboardingComplete = useOnboardingStore((state) => state.completed);
  const setOnboardingCompleted = useOnboardingStore((state) => state.setCompleted);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        const profile = await fetchUserProfile(firebaseUser.uid);
        setProfile(profile);
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, [setUser, setProfile, setLoading]);

  useEffect(() => {
    getOnboardingComplete().then(setOnboardingCompleted);
  }, [setOnboardingCompleted]);

  const appReady = !authLoading && onboardingComplete !== null;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {appReady ? <RootNavigator /> : <LoadingScreen />}
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
