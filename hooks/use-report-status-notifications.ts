import { onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useRef } from 'react';

import { reportsCollection } from '@/lib/firestore';
import {
  getNotificationsEnabled,
  notifyStatusChange,
  requestNotificationPermissions,
} from '@/lib/notifications';
import { useAuthStore } from '@/store/useAuthStore';
import { useNotificationPreferenceStore } from '@/store/useNotificationPreferenceStore';
import type { Status } from '@/types/models';

// Watches the signed-in user's own reports and fires a local notification
// whenever one's status actually CHANGES — never on the listener's initial
// snapshot (that's just establishing a baseline for reports that already
// existed), and never for a report that's simply new to the listener
// (brand-new report, or one created elsewhere mid-session).
export function useReportStatusNotifications() {
  const user = useAuthStore((state) => state.user);
  const notificationsEnabled = useNotificationPreferenceStore((state) => state.enabled);
  const setNotificationsEnabledInStore = useNotificationPreferenceStore(
    (state) => state.setEnabled
  );

  const lastKnownStatuses = useRef<Map<string, Status>>(new Map());
  const isFirstSnapshot = useRef(true);

  useEffect(() => {
    getNotificationsEnabled().then(setNotificationsEnabledInStore);
  }, [setNotificationsEnabledInStore]);

  useEffect(() => {
    // Reset the baseline on every run (user change, sign-out, or the
    // notifications toggle flipping) so a fresh listener never compares
    // against stale statuses from a previous user or a previous run.
    lastKnownStatuses.current = new Map();
    isFirstSnapshot.current = true;

    if (!user || !notificationsEnabled) return;

    // Non-blocking — the listener below works regardless of whether
    // permission is granted; permission only affects whether the OS
    // actually displays the notification scheduleNotificationAsync queues.
    void requestNotificationPermissions();

    const reportsQuery = query(reportsCollection, where('userId', '==', user.uid));

    const unsubscribe = onSnapshot(
      reportsQuery,
      (snapshot) => {
        const previous = lastKnownStatuses.current;
        const next = new Map<string, Status>();

        for (const doc of snapshot.docs) {
          const report = doc.data();
          next.set(report.id, report.status);

          if (!isFirstSnapshot.current) {
            const previousStatus = previous.get(report.id);
            if (previousStatus && previousStatus !== report.status) {
              notifyStatusChange(report.title, report.status);
            }
          }
        }

        lastKnownStatuses.current = next;
        isFirstSnapshot.current = false;
      },
      (error) => {
        console.error('Failed to watch report status changes:', error);
      }
    );

    return unsubscribe;
  }, [user, notificationsEnabled]);
}
