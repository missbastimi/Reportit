import { useRouter } from 'expo-router';
import { onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ReportCard } from '@/components/ReportCard';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Palette } from '@/constants/colors';
import { reportsCollection } from '@/lib/firestore';
import { useAuthStore } from '@/store/useAuthStore';
import type { Report } from '@/types/models';

function StatTile({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <View className="flex-1 items-center rounded-lg border border-gray-200 py-3">
      <Text className="text-xl font-bold text-gray-900" style={color ? { color } : undefined}>
        {value}
      </Text>
      <Text className="mt-0.5 text-xs text-gray-500">{label}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setReports([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Single ordered query (userId + createdAt — the same composite index
    // My Reports already relies on) serves both the recent-reports list and
    // the status counts below, client-side, so there's only one listener
    // and no extra index needed for the stats.
    const reportsQuery = query(
      reportsCollection,
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      reportsQuery,
      (snapshot) => {
        setReports(snapshot.docs.map((doc) => doc.data()));
        setLoading(false);
      },
      (err) => {
        console.error('Failed to load dashboard reports:', err);
        setError('Could not load your reports. Please try again.');
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user]);

  const stats = useMemo(() => {
    const counts: Partial<Record<Report['status'], number>> = {};
    for (const report of reports) {
      counts[report.status] = (counts[report.status] ?? 0) + 1;
    }
    return {
      total: reports.length,
      pending: counts.Pending ?? 0,
      inProgress: counts['In Progress'] ?? 0,
      resolved: counts.Resolved ?? 0,
    };
  }, [reports]);

  const recentReports = reports.slice(0, 3);
  const firstName = profile?.name?.trim().split(/\s+/)[0];

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1" contentContainerClassName="px-6 pb-10">
        <View className="mb-6 pt-4">
          <Text className="text-2xl font-bold text-gray-900">Hi, {firstName || 'there'}</Text>
        </View>

        <Pressable
          onPress={() => router.push('/report')}
          className="mb-6 flex-row items-center justify-center rounded-lg bg-primary px-4 py-4">
          <IconSymbol name="exclamationmark.bubble.fill" size={20} color="#fff" />
          <Text className="ml-2 text-base font-semibold text-white">Report an issue</Text>
        </Pressable>

        <Text className="mb-2 text-sm font-semibold text-gray-900">Your reports</Text>
        <View className="mb-6 flex-row gap-2">
          <StatTile label="Total" value={stats.total} />
          <StatTile label="Pending" value={stats.pending} color={Palette.status.pending} />
          <StatTile label="In Progress" value={stats.inProgress} color={Palette.status.inProgress} />
          <StatTile label="Resolved" value={stats.resolved} color={Palette.status.resolved} />
        </View>

        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-sm font-semibold text-gray-900">Recent reports</Text>
          <Pressable onPress={() => router.push('/my-reports')}>
            <Text className="text-sm font-medium text-primary">View all</Text>
          </Pressable>
        </View>

        {loading ? (
          <View className="items-center py-10">
            <ActivityIndicator size="large" color={Palette.primary} />
          </View>
        ) : error ? (
          <View className="items-center py-10 px-2">
            <Text className="text-center text-sm text-error">{error}</Text>
          </View>
        ) : recentReports.length === 0 ? (
          <View className="items-center rounded-lg border border-gray-200 py-10 px-6">
            <IconSymbol name="tray.fill" size={36} color="#9CA3AF" />
            <Text className="mb-1 mt-3 text-center text-base font-semibold text-gray-900">
              You haven&apos;t reported any issues yet
            </Text>
            <Text className="text-center text-sm text-gray-500">
              Use the button above to submit your first report.
            </Text>
          </View>
        ) : (
          recentReports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onPress={() => router.push(`/report/${report.id}`)}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
