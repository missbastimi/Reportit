import { create } from 'zustand';

type OnboardingState = {
  // null = not yet checked against AsyncStorage.
  completed: boolean | null;
  setCompleted: (completed: boolean) => void;
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
  completed: null,
  setCompleted: (completed) => set({ completed }),
}));
