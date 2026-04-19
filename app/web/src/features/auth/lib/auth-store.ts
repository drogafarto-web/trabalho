import { create } from 'zustand';
import type { User } from 'firebase/auth';

export type AuthRole = 'professor' | 'student' | null;

export type AuthStatus =
  | 'initializing'   // checando sessão existente
  | 'unauthenticated'
  | 'authenticating' // oauth em andamento
  | 'bootstrapping'  // logou mas claim ainda sendo concedida
  | 'authenticated'  // pronto com role === 'professor'
  | 'unauthorized'   // logou mas não é professor
  | 'error';

interface AuthState {
  status: AuthStatus;
  user: User | null;
  role: AuthRole;
  email: string | null;
  errorMessage: string | null;

  setUser: (user: User | null) => void;
  setStatus: (status: AuthStatus) => void;
  setRole: (role: AuthRole) => void;
  setError: (message: string) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'initializing',
  user: null,
  role: null,
  email: null,
  errorMessage: null,

  setUser: (user) =>
    set({ user, email: user?.email ?? null }),

  setStatus: (status) => set({ status, errorMessage: null }),

  setRole: (role) => set({ role }),

  setError: (errorMessage) =>
    set({ status: 'error', errorMessage }),

  reset: () =>
    set({
      status: 'unauthenticated',
      user: null,
      role: null,
      email: null,
      errorMessage: null,
    }),
}));
