import type { User as FirebaseUser } from 'firebase/auth';
import { create } from 'zustand';

import type { User } from '@/types/models';

type AuthState = {
  user: FirebaseUser | null;
  profile: User | null;
  loading: boolean;
  setUser: (user: FirebaseUser | null) => void;
  setProfile: (profile: User | null) => void;
  setLoading: (loading: boolean) => void;
  clear: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  loading: true,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
  clear: () => set({ user: null, profile: null }),
}));
