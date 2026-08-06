/**
 * Brand color palette, mirrored from tailwind.config.js `theme.extend.colors`.
 * Use these for places that need a color value in code rather than a NativeWind
 * className (e.g. ActivityIndicator `color`, icon `color` props).
 */
export const Palette = {
  primary: '#0F766E',
  primaryDark: '#115E59',
  primaryLight: '#14B8A6',

  accent: '#F59E0B',
  accentDark: '#D97706',

  background: '#FFFFFF',
  text: '#111827',
  muted: '#6B7280',
  border: '#E5E7EB',

  // Reserved strictly for errors/urgent states, never for branding.
  error: '#DC2626',

  status: {
    pending: '#F59E0B',
    underReview: '#3B82F6',
    inProgress: '#6366F1',
    resolved: '#16A34A',
  },
} as const;
