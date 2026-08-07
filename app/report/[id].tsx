import { Stack, useLocalSearchParams } from 'expo-router';
import { doc, onSnapshot } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { getStatusStyle, STAGE_DOT_CLASS, STATUS_ORDER } from '@/constants/status';
import { reportsCollection } from '@/lib/firestore';
import { formatDate } from '@/lib/format';
import type { Report } from '@/types/models';

// Same Leaflet + OpenStreetMap CDN approach as the main map (app/(tabs)/map.tsx),
// but static: a single fixed marker with all interaction disabled, since this
// is just a location preview, not a navigable map. lat/lng are validated
// finite numbers before this is ever called, so splicing them directly into
// the template is safe (no string/HTML content, nothing to escape).
function buildMiniMapHtml(lat: number, lng: number): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; }
    .leaflet-control-attribution { font-size: 9px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map = L.map('map', {
      zoomControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      tap: false,
      touchZoom: false
    }).setView([${lat}, ${lng}], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    var icon = L.divIcon({
      className: '',
      html: '<div style="background:#0F766E;width:18px;height:18px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 3px rgba(0,0,0,0.5);"></div>',
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });

    L.marker([${lat}, ${lng}], { icon: icon }).addTo(map);
  </script>
</body>
</html>
`;
}

function StatusTimeline({ status }: { status: Report['status'] }) {
  const currentIndex = STATUS_ORDER.indexOf(status);

  return (
    <View>
      {STATUS_ORDER.map((stage, index) => {
        const isCompleted = currentIndex >= 0 && index < currentIndex;
        const isCurrent = index === currentIndex;
        const reached = isCompleted || isCurrent;
        const isLast = index === STATUS_ORDER.length - 1;

        const dotClass = isCurrent ? STAGE_DOT_CLASS[stage] : isCompleted ? 'bg-primary' : 'bg-gray-200';

        return (
          <View key={stage} className="flex-row">
            <View className="items-center" style={{ width: 24 }}>
              <View className={`h-4 w-4 rounded-full ${dotClass}`} />
              {!isLast ? (
                <View
                  className={`w-0.5 flex-1 ${isCompleted ? 'bg-primary' : 'bg-gray-200'}`}
                  style={{ minHeight: 24 }}
                />
              ) : null}
            </View>
            <Text
              className={`ml-3 mb-6 text-sm ${
                isCurrent ? 'font-semibold text-gray-900' : reached ? 'text-gray-700' : 'text-gray-400'
              }`}>
              {stage}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export default function ReportDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    setError(null);

    const ref = doc(reportsCollection, id);

    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        setReport(snapshot.exists() ? snapshot.data() : null);
        setLoading(false);
      },
      (err) => {
        console.error('Failed to load report:', err);
        setError('Could not load this report. Please try again.');
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [id]);

  const lat = report?.location?.lat;
  const lng = report?.location?.lng;
  const miniMapHtml = useMemo(() => {
    if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }
    return buildMiniMapHtml(lat, lng);
  }, [lat, lng]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#0F766E" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-center text-sm text-error">{error}</Text>
      </SafeAreaView>
    );
  }

  if (!report) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white px-6">
        <IconSymbol name="tray.fill" size={40} color="#9CA3AF" />
        <Text className="mb-1 mt-3 text-center text-base font-semibold text-gray-900">
          Report not found
        </Text>
        <Text className="text-center text-sm text-gray-500">
          This report may have been removed.
        </Text>
      </SafeAreaView>
    );
  }

  const statusStyle = getStatusStyle(report.status);
  const hasAdminNotes = !!report.adminNotes && report.adminNotes.trim().length > 0;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Stack.Screen options={{ title: report.title || 'Report' }} />

      <ScrollView className="flex-1" contentContainerClassName="pb-10">
        {report.imageUrl ? (
          <Image source={{ uri: report.imageUrl }} className="h-56 w-full" resizeMode="cover" />
        ) : (
          <View className="h-56 w-full items-center justify-center bg-gray-100">
            <IconSymbol name="photo.fill" size={40} color="#9CA3AF" />
          </View>
        )}

        <View className="px-6 pt-4">
          <View className="mb-1 flex-row items-start justify-between gap-2">
            <Text className="flex-1 text-2xl font-bold text-gray-900">{report.title}</Text>
            <View className={`rounded-full px-2 py-0.5 ${statusStyle.bg}`}>
              <Text className={`text-xs font-medium ${statusStyle.text}`}>{report.status}</Text>
            </View>
          </View>
          <Text className="mb-4 text-sm text-gray-500">{report.category}</Text>

          <Text className="mb-6 text-base text-gray-700">{report.description}</Text>

          <Text className="mb-1 text-sm font-semibold text-gray-900">Location</Text>
          <Text className="mb-2 text-sm text-gray-600">{report.address ?? 'No address on file'}</Text>
          {miniMapHtml ? (
            <View className="mb-6 h-[200px] w-full overflow-hidden rounded-lg border border-gray-200">
              <WebView
                source={{ html: miniMapHtml }}
                originWhitelist={['*']}
                scrollEnabled={false}
                style={{ flex: 1 }}
              />
            </View>
          ) : (
            <Text className="mb-6 text-sm text-gray-400">No location provided</Text>
          )}

          <Text className="mb-3 text-sm font-semibold text-gray-900">Status</Text>
          <View className="mb-6">
            <StatusTimeline status={report.status} />
          </View>

          <Text className="mb-1 text-sm font-semibold text-gray-900">Admin Notes</Text>
          {hasAdminNotes ? (
            <View className="mb-6 rounded-lg border border-accent/30 bg-accent/10 p-4">
              <Text className="text-sm text-gray-700">{report.adminNotes}</Text>
            </View>
          ) : (
            <Text className="mb-6 text-sm text-gray-400">No notes yet</Text>
          )}

          <View className="flex-row justify-between border-t border-gray-100 pt-4">
            <Text className="text-xs text-gray-400">Reported {formatDate(report.createdAt)}</Text>
            <Text className="text-xs text-gray-400">Updated {formatDate(report.updatedAt)}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
