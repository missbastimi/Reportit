import type { Category } from '@/types/models';

// Single source of truth for the category list, shared by the report form
// and the admin dashboard's category filter.
export const CATEGORY_ORDER: Category[] = [
  'Potholes',
  'Water Leak',
  'Gutters',
  'Streetlights',
  'Illegal Dumping',
  'Public Facility',
  'Other',
];
