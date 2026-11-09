import { create } from 'zustand';
import { api } from '../lib/api.js';

export const useAuthStore = create((set, get) => ({
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

  setLoading: (isLoading) => set({ isLoading }),

  checkAuth: async () => {
    try {
      set({ isLoading: true });
      const res = await api.get('/auth/me', { skipAuthRedirect: true });
      const user = res.data?.data?.user || res.data?.data;
      if (user) {
        set({
          user,
          role: user.role,
          isAuthenticated: true,
          isLoading: false,
        });
        return user;
      }
      set({ user: null, role: null, isAuthenticated: false, isLoading: false });
      return null;
    } catch {
      set({ user: null, role: null, isAuthenticated: false, isLoading: false });
      return null;
    }
  },

  login: async (credentials) => {
    const res = await api.post('/auth/login', credentials);
    const user = res.data?.data?.user || res.data?.data;
    if (user) {
      set({
        user,
        role: user.role,
        isAuthenticated: true,
        isLoading: false,
      });
    }
    return user;
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore network errors on logout
    } finally {
      set({
        user: null,
        role: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  isAdmin: () => get().role === 'ADMIN',
  isManager: () => get().role === 'MANAGER' || get().role === 'ADMIN',
  isRep: () => get().role === 'REP',
}));

export default useAuthStore;
