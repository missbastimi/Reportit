import type { Timestamp } from 'firebase/firestore';

export type Status = 'Pending' | 'Under Review' | 'In Progress' | 'Resolved';

export type Category =
  | 'Potholes'
  | 'Water Leak'
  | 'Gutters'
  | 'Streetlights'
  | 'Illegal Dumping'
  | 'Public Facility'
  | 'Other';

export type Role = 'citizen' | 'admin';

export interface User {
  uid: string;
  name: string;
  email: string;
  role: Role;
  createdAt: Timestamp;
}

export interface Report {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: Category;
  status: Status;
  imageUrl: string | null;
  location: { lat: number; lng: number } | null;
  address: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  adminNotes: string | null;
}
