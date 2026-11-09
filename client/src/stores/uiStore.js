import { create } from 'zustand';

function getInitialTheme() {
  if (typeof window === 'undefined') return 'light';
  const saved = localStorage.getItem('smartconnect_theme');
  if (saved === 'dark' || saved === 'light') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getInitialSidebar() {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('smartconnect_sidebar_collapsed') === 'true';
}

function applyThemeToDOM(theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export const useUIStore = create((set, get) => ({
  theme: getInitialTheme(),
  sidebarCollapsed: getInitialSidebar(),
  mobileSidebarOpen: false,

  setTheme: (theme) => {
    localStorage.setItem('smartconnect_theme', theme);
    applyThemeToDOM(theme);
    set({ theme });
  },

  toggleTheme: () => {
    const current = get().theme;
    const next = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem('smartconnect_theme', next);
    applyThemeToDOM(next);
    set({ theme: next });
  },

  setSidebarCollapsed: (sidebarCollapsed) => {
    localStorage.setItem('smartconnect_sidebar_collapsed', String(sidebarCollapsed));
    set({ sidebarCollapsed });
  },

  toggleSidebar: () => {
    const next = !get().sidebarCollapsed;
    localStorage.setItem('smartconnect_sidebar_collapsed', String(next));
    set({ sidebarCollapsed: next });
  },

  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
}));

export const useUiStore = useUIStore;
export default useUIStore;
