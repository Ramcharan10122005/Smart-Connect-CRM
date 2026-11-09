/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect } from 'react';
import { useUiStore } from '@/stores/uiStore';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const theme = useUiStore((state) => state.theme);
  const setTheme = useUiStore((state) => state.setTheme);
  const toggleTheme = useUiStore((state) => state.toggleTheme);

  useEffect(() => {
    // Ensure document element has proper class on mount
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    const store = useUiStore.getState();
    return {
      theme: store.theme,
      setTheme: store.setTheme,
      toggleTheme: store.toggleTheme,
    };
  }
  return context;
}
