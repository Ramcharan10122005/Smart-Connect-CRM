import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { queryClient } from './lib/queryClient.js';
import { useAuthStore } from './stores/authStore.js';
import { useUIStore } from './stores/uiStore.js';
import { LoadingScreen } from './components/common/LoadingScreen.jsx';
import { PageSkeleton } from './components/common/PageSkeleton.jsx';
import { ProtectedRoute } from './components/auth/ProtectedRoute.jsx';
import { RoleRoute } from './components/auth/RoleRoute.jsx';
import { AppLayout } from './layouts/AppLayout.jsx';

// Lazy-loaded pages
const LoginPage = lazy(() => import('./pages/auth/LoginPage.jsx'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage.jsx'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage.jsx'));
const SetupPage = lazy(() => import('./pages/auth/SetupPage.jsx'));

const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage.jsx'));
const CustomersPage = lazy(() => import('./pages/customers/CustomersPage.jsx'));
const CustomerDetailPage = lazy(() => import('./pages/customers/CustomerDetailPage.jsx'));
const LeadsPage = lazy(() => import('./pages/leads/LeadsPage.jsx'));
const FollowUpsPage = lazy(() => import('./pages/followups/FollowUpsPage.jsx'));
const ActivitiesPage = lazy(() => import('./pages/activities/ActivitiesPage.jsx'));
const ReportsPage = lazy(() => import('./pages/reports/ReportsPage.jsx'));
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage.jsx'));

const NotFoundPage = lazy(() => import('./pages/NotFoundPage.jsx'));
const DesignSystemPage = lazy(() => import('./pages/DesignSystemPage.jsx'));

function SuspenseWrapper({ children }) {
  return <Suspense fallback={<PageSkeleton />}>{children}</Suspense>;
}

export default function App() {
  const { checkAuth, isLoading } = useAuthStore();
  const theme = useUIStore((state) => state.theme);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return <LoadingScreen message="Initializing SmartConnect..." />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public Auth Routes */}
          <Route
            path="/login"
            element={
              <SuspenseWrapper>
                <LoginPage />
              </SuspenseWrapper>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <SuspenseWrapper>
                <ForgotPasswordPage />
              </SuspenseWrapper>
            }
          />
          <Route
            path="/reset-password/:token"
            element={
              <SuspenseWrapper>
                <ResetPasswordPage />
              </SuspenseWrapper>
            }
          />
          <Route
            path="/setup"
            element={
              <SuspenseWrapper>
                <SetupPage />
              </SuspenseWrapper>
            }
          />

          {/* Hidden Visual Review Route */}
          <Route
            path="/design"
            element={
              <SuspenseWrapper>
                <DesignSystemPage />
              </SuspenseWrapper>
            }
          />

          {/* Protected Application Routes */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route
              path="/dashboard"
              element={
                <SuspenseWrapper>
                  <DashboardPage />
                </SuspenseWrapper>
              }
            />
            <Route
              path="/customers"
              element={
                <SuspenseWrapper>
                  <CustomersPage />
                </SuspenseWrapper>
              }
            />
            <Route
              path="/customers/:type/:id"
              element={
                <SuspenseWrapper>
                  <CustomerDetailPage />
                </SuspenseWrapper>
              }
            />
            <Route
              path="/leads"
              element={
                <SuspenseWrapper>
                  <LeadsPage />
                </SuspenseWrapper>
              }
            />
            <Route
              path="/follow-ups"
              element={
                <SuspenseWrapper>
                  <FollowUpsPage />
                </SuspenseWrapper>
              }
            />
            <Route
              path="/activities"
              element={
                <SuspenseWrapper>
                  <ActivitiesPage />
                </SuspenseWrapper>
              }
            />
            <Route
              path="/reports"
              element={
                <RoleRoute allowedRoles={['ADMIN', 'MANAGER']}>
                  <SuspenseWrapper>
                    <ReportsPage />
                  </SuspenseWrapper>
                </RoleRoute>
              }
            />
            <Route
              path="/settings/*"
              element={
                <SuspenseWrapper>
                  <SettingsPage />
                </SuspenseWrapper>
              }
            />
          </Route>

          {/* 404 Route */}
          <Route
            path="*"
            element={
              <SuspenseWrapper>
                <NotFoundPage />
              </SuspenseWrapper>
            }
          />
        </Routes>

        <Toaster richColors closeButton position="top-right" theme={theme} />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
