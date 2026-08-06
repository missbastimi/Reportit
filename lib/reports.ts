import { doc, serverTimestamp, setDoc } from 'firebase/firestore';

import { reportsCollection } from '@/lib/firestore';
import type { Category } from '@/types/models';

export type NewReportInput = {
  userId: string;
  title: string;
  description: string;
  category: Category;
  imageUrl: string | null;
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
    location: null,
    address: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    adminNotes: null,
  });

  return ref.id;
}
