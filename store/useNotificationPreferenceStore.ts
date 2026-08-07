import { create } from 'zustand';

// Reactive mirror of the AsyncStorage-persisted preference (lib/notifications.ts),
// so the status-change listener picks up a toggle immediately without needing
// a restart, and the Profile screen's switch can reflect/update it.
type NotificationPreferenceState = {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
};

export const useNotificationPreferenceStore = create<NotificationPreferenceState>((set) => ({
  enabled: true,
  setEnabled: (enabled) => set({ enabled }),
}));
