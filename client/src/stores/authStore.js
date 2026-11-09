import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: null,
  role: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) =>
    set({
      user,
      role: user?.role || null,
      isAuthenticated: Boolean(user),
      isLoading: false,
    }),

  setRole: (role) => set({ role }),

  setLoading: (isLoading) => set({ isLoading }),

  logout: () =>
    set({
      user: null,
      role: null,
      isAuthenticated: false,
      isLoading: false,
    }),
}));

export default useAuthStore;
