import {
  collection,
  type DocumentData,
  type FirestoreDataConverter,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';
import type { Report, User } from '@/types/models';

function converter<T extends DocumentData>(): FirestoreDataConverter<T> {
  return {
    toFirestore: (data: T) => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot) => snapshot.data() as T,
  };
}

export const usersCollection = collection(db, 'users').withConverter(converter<User>());

export const reportsCollection = collection(db, 'reports').withConverter(converter<Report>());
