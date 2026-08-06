import { Image, Pressable, Text, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import type { Report, Status } from '@/types/models';

const STATUS_STYLES: Record<Status, { bg: string; text: string }> = {
  Pending: { bg: 'bg-status-pending/15', text: 'text-status-pending' },
  'Under Review': { bg: 'bg-status-underReview/15', text: 'text-status-underReview' },
  'In Progress': { bg: 'bg-status-inProgress/15', text: 'text-status-inProgress' },
  Resolved: { bg: 'bg-status-resolved/15', text: 'text-status-resolved' },
};

// Firestore has no schema enforcement, so report.status can hold a value
// that doesn't match the Status union at runtime (e.g. a hand-edited
// console value or a future status not yet themed here). Fall back to a
// neutral style instead of crashing the render.
const DEFAULT_STATUS_STYLE = { bg: 'bg-gray-100', text: 'text-gray-500' };

// Pending writes can briefly hold a null serverTimestamp() sentinel in the
// local cache before the server confirms it, so this stays defensive even
// though Report['createdAt'] is typed as always present.
function formatDate(timestamp: Report['createdAt']): string {
  const date = timestamp?.toDate?.();
  if (!date) return 'Just now';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

type ReportCardProps = {
  report: Report;
  onPress?: () => void;
};

export function ReportCard({ report, onPress }: ReportCardProps) {
  const statusStyle = STATUS_STYLES[report.status] ?? DEFAULT_STATUS_STYLE;

  return (
    <Pressable onPress={onPress} className="mb-3 flex-row rounded-lg border border-gray-200 p-3">
      {report.imageUrl ? (
        <Image
          source={{ uri: report.imageUrl }}
          className="mr-3 h-16 w-16 rounded-lg"
          resizeMode="cover"
        />
      ) : (
        <View className="mr-3 h-16 w-16 items-center justify-center rounded-lg bg-gray-100">
          <IconSymbol name="photo.fill" size={24} color="#9CA3AF" />
        </View>
      )}

      <View className="flex-1">
        <View className="mb-1 flex-row items-start justify-between gap-2">
          <Text className="flex-1 text-base font-semibold text-gray-900" numberOfLines={1}>
            {report.title}
          </Text>
          <View className={`rounded-full px-2 py-0.5 ${statusStyle.bg}`}>
            <Text className={`text-xs font-medium ${statusStyle.text}`}>{report.status}</Text>
          </View>
        </View>

        <Text className="mb-1 text-sm text-gray-500">{report.category}</Text>

        <View className="mb-1 flex-row items-center">
          <IconSymbol name="mappin.circle.fill" size={14} color="#9CA3AF" />
          <Text className="ml-1 flex-1 text-sm text-gray-500" numberOfLines={1}>
            {report.address ?? 'No location'}
          </Text>
        </View>

        <Text className="text-xs text-gray-400">{formatDate(report.createdAt)}</Text>
      </View>
    </Pressable>
  );
}
