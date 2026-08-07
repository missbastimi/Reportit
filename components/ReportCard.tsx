import { Image, Pressable, Text, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { getStatusStyle } from '@/constants/status';
import { formatDate } from '@/lib/format';
import type { Report } from '@/types/models';

type ReportCardProps = {
  report: Report;
  onPress?: () => void;
};

export function ReportCard({ report, onPress }: ReportCardProps) {
  const statusStyle = getStatusStyle(report.status);

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
