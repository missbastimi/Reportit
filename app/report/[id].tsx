import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { doc, onSnapshot } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ALL_STATUSES, getStatusStyle, STAGE_DOT_CLASS, STATUS_ORDER } from '@/constants/status';
import { reportsCollection } from '@/lib/firestore';
import { formatDate } from '@/lib/format';
import { deleteReport, updateReportStatus } from '@/lib/reports';
import { useAuthStore } from '@/store/useAuthStore';
import type { Report, Status } from '@/types/models';

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

// 'Rejected' is a terminal state, not a step on the Pending → Resolved
// progression, so it gets its own end-state view instead of the timeline.
function RejectedState({ reason }: { reason: string | null }) {
  return (
    <View className="flex-row items-start rounded-lg border border-error/30 bg-error/10 p-4">
      <IconSymbol name="xmark.circle.fill" size={20} color="#DC2626" />
      <View className="ml-3 flex-1">
        <Text className="mb-1 text-sm font-semibold text-error">Rejected</Text>
        <Text className="text-sm text-gray-700">
          {reason && reason.trim() ? reason : 'No reason provided.'}
        </Text>
      </View>
    </View>
  );
}

export default function ReportDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const profile = useAuthStore((state) => state.profile);
  const isAdmin = profile?.role === 'admin';

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Admin edit draft. Seeded once from the first snapshot, then left alone —
  // the live listener must not clobber an admin's in-progress edit if the
  // doc changes elsewhere while they're mid-edit.
  const [draftInitialized, setDraftInitialized] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<Status | null>(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (report && !draftInitialized) {
      setSelectedStatus(report.status);
      setNotesDraft(report.adminNotes ?? '');
      setDraftInitialized(true);
    }
  }, [report, draftInitialized]);

  const handleSave = async () => {
    if (!report || !selectedStatus) return;

    setSaveError(null);
    setSaveSuccess(false);

    if (selectedStatus === 'Rejected' && !notesDraft.trim()) {
      setSaveError('Please provide a reason in the notes before rejecting this report.');
      return;
    }

    setSaving(true);
    try {
      await updateReportStatus(report.id, selectedStatus, notesDraft.trim() ? notesDraft.trim() : null);
      setSaveSuccess(true);
    } catch (err) {
      console.error('Failed to update report:', err);
      const code = (err as { code?: string } | null)?.code;
      setSaveError(
        code === 'permission-denied'
          ? "You don't have permission to make this change."
          : 'Could not save changes. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!report) return;

    setDeleteError(null);
    setDeleting(true);
    try {
      await deleteReport(report.id);
      router.back();
    } catch (err) {
      console.error('Failed to delete report:', err);
      const code = (err as { code?: string } | null)?.code;
      setDeleteError(
        code === 'permission-denied'
          ? "You don't have permission to delete this report."
          : 'Could not delete this report. Please try again.'
      );
      setDeleting(false);
    }
  };

  const handleDeletePress = () => {
    Alert.alert(
      'Delete report?',
      'This will permanently delete this report. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: handleConfirmDelete },
      ]
    );
  };

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
            {report.status === 'Rejected' ? (
              <RejectedState reason={report.adminNotes} />
            ) : (
              <StatusTimeline status={report.status} />
            )}
          </View>

          <Text className="mb-1 text-sm font-semibold text-gray-900">Admin Notes</Text>
          {hasAdminNotes ? (
            <View className="mb-6 rounded-lg border border-accent/30 bg-accent/10 p-4">
              <Text className="text-sm text-gray-700">{report.adminNotes}</Text>
            </View>
          ) : (
            <Text className="mb-6 text-sm text-gray-400">No notes yet</Text>
          )}

          {isAdmin ? (
            <View className="mb-6 rounded-lg border border-accent/30 bg-accent/5 p-4">
              <View className="mb-3 flex-row items-center">
                <IconSymbol name="shield.fill" size={16} color="#D97706" />
                <Text className="ml-2 text-sm font-semibold text-accent-dark">Admin Controls</Text>
              </View>

              <Text className="mb-2 text-xs font-medium text-gray-700">Status</Text>
              <View className="mb-4 flex-row flex-wrap">
                {ALL_STATUSES.map((option) => {
                  const selected = selectedStatus === option;
                  return (
                    <Pressable
                      key={option}
                      onPress={() => {
                        setSelectedStatus(option);
                        setSaveSuccess(false);
                        setSaveError(null);
                      }}
                      className={`mb-2 mr-2 rounded-full px-3 py-1.5 ${
                        selected ? STAGE_DOT_CLASS[option] : 'border border-gray-200 bg-white'
                      }`}>
                      <Text className={`text-xs font-medium ${selected ? 'text-white' : 'text-gray-700'}`}>
                        {option}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text className="mb-2 text-xs font-medium text-gray-700">Notes for reporter</Text>
              <TextInput
                value={notesDraft}
                onChangeText={(text) => {
                  setNotesDraft(text);
                  setSaveSuccess(false);
                  setSaveError(null);
                }}
                placeholder="Add notes visible to the reporter"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                className="mb-4 min-h-[100px] rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900"
              />

              <Pressable
                onPress={handleSave}
                disabled={saving}
                className={`items-center rounded-lg bg-primary px-4 py-3 ${saving ? 'opacity-60' : ''}`}>
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-base font-semibold text-white">Save changes</Text>
                )}
              </Pressable>

              {saveSuccess ? (
                <Text className="mt-2 text-sm text-primary">Changes saved.</Text>
              ) : null}
              {saveError ? <Text className="mt-2 text-sm text-error">{saveError}</Text> : null}

              <View className="mt-4 border-t border-accent/20 pt-4">
                <Pressable
                  onPress={handleDeletePress}
                  disabled={deleting}
                  className={`flex-row items-center justify-center rounded-lg border border-error px-4 py-3 ${
                    deleting ? 'opacity-60' : ''
                  }`}>
                  {deleting ? (
                    <ActivityIndicator color="#DC2626" />
                  ) : (
                    <>
                      <IconSymbol name="trash.fill" size={16} color="#DC2626" />
                      <Text className="ml-2 text-base font-semibold text-error">Delete report</Text>
                    </>
                  )}
                </Pressable>
                {deleteError ? (
                  <Text className="mt-2 text-sm text-error">{deleteError}</Text>
                ) : null}
              </View>
            </View>
          ) : null}

          <View className="flex-row justify-between border-t border-gray-100 pt-4">
            <Text className="text-xs text-gray-400">Reported {formatDate(report.createdAt)}</Text>
            <Text className="text-xs text-gray-400">Updated {formatDate(report.updatedAt)}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
