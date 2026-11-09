import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { queryClient } from './lib/queryClient.js';
import { api } from './lib/api.js';
import { useUiStore } from './stores/uiStore.js';
import { CheckCircle2, AlertCircle, Loader2, Moon, Sun, Layers, Palette } from 'lucide-react';
import DesignSystemPage from './pages/DesignSystemPage.jsx';

function HomePage() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { theme, toggleTheme } = useUiStore();

  useEffect(() => {
    let isMounted = true;
    api
      .get('/health')
      .then((res) => {
        if (isMounted) {
          setHealth(res.data?.data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Failed to connect to backend server');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 selection:bg-indigo-500 selection:text-white">
      {/* Top right controls */}
      <div className="fixed top-6 right-6 flex items-center gap-2">
        <Link
          to="/design"
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-crm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-subtle hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
        >
          <Palette className="w-3.5 h-3.5" />
          <span>Design System</span>
        </Link>
        <button
          onClick={toggleTheme}
          aria-label="Toggle Theme"
          className="p-2.5 rounded-crm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white shadow-subtle hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600" />
          )}
        </button>
      </div>

      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-crm border border-slate-200 dark:border-slate-800 shadow-card p-8">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 rounded-crm bg-indigo-600 flex items-center justify-center text-white shadow-subtle">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50 tracking-tight">
              SmartConnect CRM
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Scaffold Environment v1.0.0
            </p>
          </div>
        </div>

        <div className="border-t border-slate-100 dark:border-slate-800/60 pt-6">
          {loading ? (
            <div className="flex items-center space-x-3 text-slate-500 dark:text-slate-400 py-3">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
              <span className="text-sm">Connecting to backend service...</span>
            </div>
          ) : error ? (
            <div className="rounded-crm bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 p-4 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-rose-900 dark:text-rose-200">
                  Connection Failed
                </p>
                <p className="text-xs text-rose-700 dark:text-rose-400 mt-1">{error}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-crm bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 p-4 flex items-start space-x-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                    SmartConnect CRM is connected
                  </p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                    Backend Status: <span className="font-mono font-medium">{health?.status}</span>
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950/60 rounded-crm p-3 border border-slate-100 dark:border-slate-800/60 text-xs text-slate-500 dark:text-slate-400 flex justify-between">
                <span>API Endpoint</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">/api/v1/health</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const theme = useUiStore((state) => state.theme);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/design" element={<DesignSystemPage />} />
          <Route path="*" element={<HomePage />} />
        </Routes>
        <Toaster richColors closeButton position="top-right" theme={theme} />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
