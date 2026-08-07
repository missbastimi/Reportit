import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { Status } from '@/types/models';

const NOTIFICATIONS_ENABLED_KEY = 'reportit:status-notifications-enabled';
const ANDROID_CHANNEL_ID = 'status-updates';

// Registered once, at module load — same pattern as lib/firebase.ts's app
// init. Safe on every platform: it just registers an event listener, it
// doesn't touch any native-only API (unlike scheduling, see below).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Report status updates',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

// expo-notifications' scheduling API has no web implementation (it throws
// UnavailabilityError there — verified against the installed package), and
// local notifications don't make sense in a browser tab anyway, so every
// function here skips outright on web rather than attempting and catching.
export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  if (!Device.isDevice) {
    console.warn('Notification permissions requested on a non-physical device/simulator.');
  }

  try {
    const existing = await Notifications.getPermissionsAsync();
    let granted = existing.granted;

    if (!granted) {
      const requested = await Notifications.requestPermissionsAsync();
      granted = requested.granted;
    }

    if (granted) {
      await ensureAndroidChannel();
    }

    return granted;
  } catch (error) {
    console.error('Failed to request notification permissions:', error);
    return false;
  }
}

export async function notifyStatusChange(reportTitle: string, newStatus: Status): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Report status updated',
        body: `Your report "${reportTitle}" is now ${newStatus}.`,
      },
      trigger: null,
    });
  } catch (error) {
    console.error('Failed to schedule status-change notification:', error);
  }
}

// User-facing on/off preference, persisted so it survives app restarts.
// Defaults to enabled when never explicitly set.
export async function getNotificationsEnabled(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY);
    return value !== 'false';
  } catch (error) {
    console.error('Failed to read notification preference:', error);
    return true;
  }
}

export async function setNotificationsEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, enabled ? 'true' : 'false');
  } catch (error) {
    console.error('Failed to persist notification preference:', error);
  }
}
