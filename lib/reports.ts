import { deleteDoc, doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';

import { reportsCollection } from '@/lib/firestore';
import type { Category, Status } from '@/types/models';

export type NewReportInput = {
  userId: string;
  title: string;
  description: string;
  category: Category;
  imageUrl: string | null;
  location: { lat: number; lng: number } | null;
  address: string | null;
};

export async function createReport(input: NewReportInput): Promise<string> {
  // doc(reportsCollection) generates a fresh id client-side using the same
  // scheme addDoc uses internally, so we can store `id` on the document
  // itself (required by the Report type) in a single write.
  const ref = doc(reportsCollection);

  await setDoc(ref, {
    id: ref.id,
    userId: input.userId,
    title: input.title,
    description: input.description,
    category: input.category,
    status: 'Pending',
    imageUrl: input.imageUrl,
    location: input.location,
    address: input.address,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    adminNotes: null,
  });

  return ref.id;
}

// Security rules restrict changing status/adminNotes to admins; a non-admin
// (or stale session) attempting this gets a permission-denied error from
// Firestore, which the caller should catch and surface as a friendly message.
// `adminNotes` is optional so a status-only change doesn't touch notes at all;
// pass `null` explicitly to clear them.
export async function updateReportStatus(
  reportId: string,
  status: Status,
  adminNotes?: string | null
): Promise<void> {
  const ref = doc(reportsCollection, reportId);

  await updateDoc(ref, {
    status,
    updatedAt: serverTimestamp(),
    ...(adminNotes !== undefined ? { adminNotes } : {}),
  });
}

export async function deleteReport(reportId: string): Promise<void> {
  const ref = doc(reportsCollection, reportId);
  await deleteDoc(ref);
}
