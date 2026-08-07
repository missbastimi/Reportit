import { useRouter } from 'expo-router';
import { onSnapshot, orderBy, query } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ReportCard } from '@/components/ReportCard';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { CATEGORY_ORDER } from '@/constants/category';
import { Palette } from '@/constants/colors';
import { STATUS_ORDER } from '@/constants/status';
import { reportsCollection } from '@/lib/firestore';
import { useAuthStore } from '@/store/useAuthStore';
import type { Category, Report, Status } from '@/types/models';

type StatusFilter = Status | 'All';
type CategoryFilter = Category | 'All';

const STATUS_FILTERS: StatusFilter[] = ['All', ...STATUS_ORDER];
const CATEGORY_FILTERS: CategoryFilter[] = ['All', ...CATEGORY_ORDER];

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`mr-2 rounded-full px-3 py-1.5 ${
        active ? 'bg-primary' : 'border border-gray-200 bg-white'
      }`}>
      <Text className={`text-xs font-medium ${active ? 'text-white' : 'text-gray-700'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function AdminScreen() {
  const profile = useAuthStore((state) => state.profile);
  const isAdmin = profile?.role === 'admin';
  const router = useRouter();

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('All');
  const [search, setSearch] = useState('');
  const [oldestFirst, setOldestFirst] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Sort-only order (no filters at the query level) needs no composite
    // index; all status/category/search filtering happens client-side
    // below over this one real-time snapshot.
    const reportsQuery = query(reportsCollection, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      reportsQuery,
      (snapshot) => {
        setReports(snapshot.docs.map((doc) => doc.data()));
        setLoading(false);
      },
      (err) => {
        console.error('Failed to load reports for admin dashboard:', err);
        setError('Could not load reports. Please try again.');
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [isAdmin]);

  const filteredReports = useMemo(() => {
    let result = reports;

    if (statusFilter !== 'All') {
      result = result.filter((report) => report.status === statusFilter);
    }

    if (categoryFilter !== 'All') {
      result = result.filter((report) => report.category === categoryFilter);
    }

    const searchTerm = search.trim().toLowerCase();
    if (searchTerm) {
      result = result.filter((report) => {
        return (
          report.title.toLowerCase().includes(searchTerm) ||
          report.description.toLowerCase().includes(searchTerm) ||
          (report.address ?? '').toLowerCase().includes(searchTerm)
        );
      });
    }

    // Base query is already newest-first; reverse for the oldest-first toggle
    // instead of re-querying.
    return oldestFirst ? [...result].reverse() : result;
  }, [reports, statusFilter, categoryFilter, search, oldestFirst]);

  if (!isAdmin) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white px-6">
        <IconSymbol name="xmark.shield.fill" size={40} color="#9CA3AF" />
        <Text className="mb-1 mt-3 text-center text-base font-semibold text-gray-900">
          Access denied
        </Text>
        <Text className="text-center text-sm text-gray-500">
          You don&apos;t have permission to view this page.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-6 pb-2 pt-4">
        <Text className="text-3xl font-bold text-gray-900">Admin</Text>
      </View>

      <View className="px-6">
        <View className="mb-3 flex-row items-center rounded-lg border border-gray-200 px-3">
          <IconSymbol name="magnifyingglass" size={16} color="#9CA3AF" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search title, description, or address"
            placeholderTextColor="#9CA3AF"
            className="ml-2 flex-1 py-2.5 text-sm text-gray-900"
          />
        </View>

        <View className="mb-2 flex-row flex-wrap">
          {STATUS_FILTERS.map((status) => (
            <FilterChip
              key={status}
              label={status}
              active={statusFilter === status}
              onPress={() => setStatusFilter(status)}
            />
          ))}
        </View>

        <View className="mb-3 flex-row flex-wrap">
          {CATEGORY_FILTERS.map((category) => (
            <FilterChip
              key={category}
              label={category}
              active={categoryFilter === category}
              onPress={() => setCategoryFilter(category)}
            />
          ))}
        </View>

        <View className="mb-2 flex-row items-center justify-between">
          <Text className="text-xs text-gray-500">
            {filteredReports.length} report{filteredReports.length === 1 ? '' : 's'}
          </Text>
          <Pressable
            onPress={() => setOldestFirst((value) => !value)}
            className="flex-row items-center">
            <IconSymbol name="arrow.up.arrow.down" size={14} color="#0F766E" />
            <Text className="ml-1 text-xs font-medium text-primary">
              {oldestFirst ? 'Oldest first' : 'Newest first'}
            </Text>
          </Pressable>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={Palette.primary} />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-sm text-error">{error}</Text>
        </View>
      ) : filteredReports.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <IconSymbol name="tray.fill" size={40} color="#9CA3AF" />
          <Text className="mb-1 mt-3 text-center text-base font-semibold text-gray-900">
            No reports match your filters
          </Text>
          <Text className="text-center text-sm text-gray-500">
            Try a different status, category, or search term.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredReports}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-6 pb-10"
          renderItem={({ item }) => (
            <ReportCard report={item} onPress={() => router.push(`/report/${item.id}`)} />
          )}
        />
      )}
    </SafeAreaView>
  );
}
