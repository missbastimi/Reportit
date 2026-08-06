import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Placeholder — full report detail view is built in issue #10.
export default function ReportDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center px-6">
        <Text className="mb-2 text-xl font-bold text-gray-900">Report details</Text>
        <Text className="text-center text-base text-gray-500">
          Full details for report {id} are coming soon.
        </Text>
      </View>
    </SafeAreaView>
  );
}
