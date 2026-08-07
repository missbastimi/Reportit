import type { Status } from '@/types/models';

// Single source of truth for status → theme mapping, shared by ReportCard
// and the report detail screen's timeline. Firestore has no schema
// enforcement, so any lookup keyed by a live report's status must go
// through getStatusStyle() rather than indexing STATUS_STYLES directly —
// see the ReportCard status-badge crash fix for why.
export const STATUS_ORDER: Status[] = ['Pending', 'Under Review', 'In Progress', 'Resolved'];

export const STATUS_STYLES: Record<Status, { bg: string; text: string }> = {
  Pending: { bg: 'bg-status-pending/15', text: 'text-status-pending' },
  'Under Review': { bg: 'bg-status-underReview/15', text: 'text-status-underReview' },
  'In Progress': { bg: 'bg-status-inProgress/15', text: 'text-status-inProgress' },
  Resolved: { bg: 'bg-status-resolved/15', text: 'text-status-resolved' },
};

// Solid (non-tinted) fill classes, used for the timeline's current-stage dot.
export const STAGE_DOT_CLASS: Record<Status, string> = {
  Pending: 'bg-status-pending',
  'Under Review': 'bg-status-underReview',
  'In Progress': 'bg-status-inProgress',
  Resolved: 'bg-status-resolved',
};

export const DEFAULT_STATUS_STYLE = { bg: 'bg-gray-100', text: 'text-gray-500' };

export function getStatusStyle(status: string): { bg: string; text: string } {
  return (STATUS_STYLES as Record<string, { bg: string; text: string }>)[status] ?? DEFAULT_STATUS_STYLE;
}
