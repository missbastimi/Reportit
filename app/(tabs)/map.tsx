import { onSnapshot } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';

import { Palette } from '@/constants/colors';
import { reportsCollection } from '@/lib/firestore';
import type { Report } from '@/types/models';

type MapReport = {
  id: string;
  title: string;
  category: string;
  status: string;
  address: string | null;
  location: { lat: number; lng: number };
};

const LEGEND_ITEMS: { label: string; color: string }[] = [
  { label: 'Pending', color: Palette.status.pending },
  { label: 'Under Review', color: Palette.status.underReview },
  { label: 'In Progress', color: Palette.status.inProgress },
  { label: 'Resolved', color: Palette.status.resolved },
];

// Leaflet + OpenStreetMap via CDN, loaded inside a WebView — no native map
// module, no API key, works in Expo Go. Report data is never embedded into
// this HTML string; it's pushed in afterwards via injectJavaScript() once
// the page posts "ready", which keeps user-submitted text out of raw HTML
// markup (see escapeHtml below for the popup content itself).
const LEAFLET_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var DEFAULT_CENTER = [7.9465, -1.0232]; // roughly the geographic center of Ghana
    var DEFAULT_ZOOM = 7;
    var MAX_FIT_ZOOM = 16; // cap auto-zoom so a single pin doesn't zoom in absurdly tight

    var STATUS_COLORS = {
      'Pending': '#F59E0B',
      'Under Review': '#3B82F6',
      'In Progress': '#6366F1',
      'Resolved': '#16A34A'
    };
    var DEFAULT_COLOR = '#6B7280';

    var map = L.map('map', { zoomControl: true }).setView(DEFAULT_CENTER, DEFAULT_ZOOM);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    var markersLayer = L.layerGroup().addTo(map);

    function escapeHtml(value) {
      return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function makeIcon(color) {
      return L.divIcon({
        className: '',
        html: '<div style="background:' + color + ';width:16px;height:16px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 2px rgba(0,0,0,0.5);"></div>',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
        popupAnchor: [0, -8]
      });
    }

    window.setReports = function(reports) {
      markersLayer.clearLayers();

      var points = [];

      (reports || []).forEach(function(report) {
        if (!report || !report.location) return;
        var lat = report.location.lat;
        var lng = report.location.lng;
        if (typeof lat !== 'number' || typeof lng !== 'number' || !isFinite(lat) || !isFinite(lng)) return;

        var color = STATUS_COLORS[report.status] || DEFAULT_COLOR;
        var marker = L.marker([lat, lng], { icon: makeIcon(color) });

        var popupHtml =
          '<div style="min-width:160px">' +
          '<div style="font-weight:600;margin-bottom:2px;">' + escapeHtml(report.title || 'Untitled') + '</div>' +
          '<div style="font-size:12px;color:#6B7280;margin-bottom:2px;">' + escapeHtml(report.category || '') + '</div>' +
          '<div style="font-size:12px;font-weight:600;margin-bottom:2px;color:' + color + ';">' + escapeHtml(report.status || '') + '</div>' +
          '<div style="font-size:12px;color:#6B7280;">' + escapeHtml(report.address || 'No address') + '</div>' +
          '</div>';

        marker.bindPopup(popupHtml);
        markersLayer.addLayer(marker);

        points.push([lat, lng]);
      });

      // The WebView's container can report a stale/zero size at the moment
      // Leaflet is constructed (before the native layout pass has settled),
      // which makes fitBounds compute against the wrong viewport. Force a
      // re-measure right before fitting — cheap, and the standard fix for
      // Leaflet maps rendered inside dynamically-sized containers.
      map.invalidateSize();

      if (points.length > 0) {
        map.fitBounds(points, { padding: [40, 40], maxZoom: MAX_FIT_ZOOM });
      } else {
        map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
      }
    };

    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage('ready');
    }
  </script>
</body>
</html>
`;

export default function MapScreen() {
  const webViewRef = useRef<WebView>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      reportsCollection,
      (snapshot) => {
        setReports(snapshot.docs.map((doc) => doc.data()));
        setLoading(false);
      },
      (err) => {
        console.error('Failed to load reports for map:', err);
        setError('Could not load the map. Please try again.');
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  useEffect(() => {
    // Wait for both signals before ever calling setReports: the WebView
    // posting "ready" (map/Leaflet initialized) AND Firestore's first
    // snapshot actually resolving (loading -> false). Without the `loading`
    // gate, if "ready" arrives before Firestore responds, this would inject
    // an empty array — indistinguishable from "genuinely zero reports" —
    // and fitBounds would never run against the real data, since the
    // fallback view is applied as if there truly were no pins. Reports that
    // arrive after this (real-time updates) still flow through normally,
    // since `reports` stays in the dependency array.
    if (!mapReady || loading) return;

    const payload: MapReport[] = reports
      .filter(
        (report): report is Report & { location: { lat: number; lng: number } } =>
          !!report.location &&
          Number.isFinite(report.location.lat) &&
          Number.isFinite(report.location.lng)
      )
      .map((report) => ({
        id: report.id,
        title: report.title,
        category: report.category,
        status: report.status,
        address: report.address,
        location: report.location,
      }));

    webViewRef.current?.injectJavaScript(`window.setReports(${JSON.stringify(payload)}); true;`);
  }, [mapReady, loading, reports]);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-6 pb-2 pt-4">
        <Text className="text-3xl font-bold text-gray-900">Map</Text>
      </View>

      <View className="flex-1">
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html: LEAFLET_HTML }}
          onMessage={(event) => {
            if (event.nativeEvent.data === 'ready') {
              setMapReady(true);
            }
          }}
          style={{ flex: 1 }}
        />

        {loading ? (
          <View className="absolute inset-0 items-center justify-center bg-white/70">
            <ActivityIndicator size="large" color={Palette.primary} />
          </View>
        ) : null}

        {error ? (
          <View className="absolute inset-x-6 top-4 rounded-lg border border-error/30 bg-error/10 p-3">
            <Text className="text-sm text-error">{error}</Text>
          </View>
        ) : null}

        <View className="absolute bottom-4 left-4 gap-1 rounded-lg border border-gray-200 bg-white/95 p-3">
          {LEGEND_ITEMS.map((item) => (
            <View key={item.label} className="flex-row items-center">
              <View
                className="mr-2 h-3 w-3 rounded-full border border-white"
                style={{ backgroundColor: item.color }}
              />
              <Text className="text-xs text-gray-700">{item.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}
