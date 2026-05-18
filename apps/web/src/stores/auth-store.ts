import { create } from 'zustand';
import type { UserProfile } from '@uims/shared-types';

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: UserProfile | null) => void;
  logout: () => void;
}

/**
 * Auth store — manages user session state.
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
      isLoading: false,
    }),

  logout: () => {
    localStorage.removeItem('university_access_token');
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },
}));
