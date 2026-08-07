import type { Timestamp } from 'firebase/firestore';

// Pending writes can briefly hold a null serverTimestamp() sentinel in the
// local cache before the server confirms it, so this stays defensive even
// for fields typed as an always-present Timestamp.
export function formatDate(timestamp: Timestamp | null | undefined): string {
  const date = timestamp?.toDate?.();
  if (!date) return 'Just now';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
