import { Outlet, Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function RoleRoute({ allowedRoles = [], children }) {
  const { user, role } = useAuthStore();

  const isAllowed = user && allowedRoles.includes(role);

  if (!isAllowed) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center p-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/15 text-destructive mb-4">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">Access Restricted</h2>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          You do not have the required permissions to view this page ({role || 'Anonymous'}). Please
          contact your administrator if you believe this is an error.
        </p>
        <div className="mt-6">
          <Link to="/dashboard">
            <Button variant="default">Return to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return children ? children : <Outlet />;
}

export default RoleRoute;
