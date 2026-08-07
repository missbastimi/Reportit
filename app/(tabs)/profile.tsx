import { onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Palette } from '@/constants/colors';
import { signOutUser } from '@/lib/auth';
import { reportsCollection } from '@/lib/firestore';
import { formatDate } from '@/lib/format';
import { useAuthStore } from '@/store/useAuthStore';

export default function ProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);

  const [reportCount, setReportCount] = useState<number | null>(null);
  const [countError, setCountError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setReportCount(null);
      return;
    }

    // No orderBy — a bare equality filter needs no composite index, and a
    // count is all this screen needs.
    const reportsQuery = query(reportsCollection, where('userId', '==', user.uid));

    const unsubscribe = onSnapshot(
      reportsQuery,
      (snapshot) => {
        setReportCount(snapshot.size);
        setCountError(null);
      },
      (err) => {
        console.error('Failed to load report count:', err);
        setCountError('Could not load your report count.');
      }
    );

    return unsubscribe;
  }, [user]);

  const handleSignOut = async () => {
    setSignOutError(null);
    setSigningOut(true);
    try {
      await signOutUser();
      // Root layout's auth listener + Stack.Protected guard handle navigation.
    } catch (error) {
      console.error('Failed to sign out:', error);
      setSignOutError(
        error instanceof Error ? error.message : 'Could not sign out. Please try again.'
      );
      setSigningOut(false);
    }
  };

  const isAdmin = profile?.role === 'admin';

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-6 pt-4">
        <Text className="mb-6 text-2xl font-bold text-gray-900">Profile</Text>

        <View className="mb-6 items-center">
          <View className="mb-3 h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <IconSymbol name="person.fill" size={36} color="#0F766E" />
          </View>
          <Text className="text-lg font-semibold text-gray-900">{profile?.name ?? 'Unknown'}</Text>
          <Text className="text-sm text-gray-500">{profile?.email ?? user?.email ?? ''}</Text>
          {isAdmin ? (
            <View className="mt-2 rounded-full bg-accent/15 px-3 py-1">
              <Text className="text-xs font-semibold text-accent-dark">Admin</Text>
            </View>
          ) : null}
        </View>

        <View className="mb-6 flex-row gap-3">
          <View className="flex-1 items-center rounded-lg border border-gray-200 py-4">
            {reportCount === null ? (
              <ActivityIndicator color={Palette.primary} />
            ) : (
              <Text className="text-2xl font-bold text-gray-900">{reportCount}</Text>
            )}
            <Text className="mt-1 text-xs text-gray-500">Reports submitted</Text>
          </View>
          <View className="flex-1 items-center rounded-lg border border-gray-200 py-4">
            <Text className="text-sm font-semibold text-gray-900">
              {formatDate(profile?.createdAt)}
            </Text>
            <Text className="mt-1 text-xs text-gray-500">Member since</Text>
          </View>
        </View>

        {countError ? <Text className="mb-4 text-sm text-error">{countError}</Text> : null}

        <Pressable
          onPress={handleSignOut}
          disabled={signingOut}
          className={`items-center rounded-lg bg-error px-4 py-3 ${signingOut ? 'opacity-60' : ''}`}>
          {signingOut ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-base font-semibold text-white">Sign Out</Text>
          )}
        </Pressable>
        {signOutError ? (
          <Text className="mt-2 text-center text-sm text-error">{signOutError}</Text>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
