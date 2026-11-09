import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Layers, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';

export default function SetupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSetup = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await api.post('/auth/setup', { name, email, password });
      toast.success('Admin account created! Please sign in.');
      navigate('/login');
    } catch (err) {
      setError(err.message || 'Setup is only allowed when zero users exist');
      toast.error(err.message || 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-subtle">
            <Layers className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            SmartConnect CRM Setup
          </h1>
          <p className="text-sm text-muted-foreground">
            Create the first Super Administrator account
          </p>
        </div>

        <Card>
          <form onSubmit={handleSetup}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <span>Initial Admin Account</span>
              </CardTitle>
              <CardDescription>
                This endpoint only works when zero users exist in the system.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {error && (
                <div className="rounded-crm border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                  {error}
                </div>
              )}

              <FormField id="name" label="Administrator Name" required>
                <Input
                  id="name"
                  placeholder="System Admin"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </FormField>

              <FormField id="email" label="Admin Email" required>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@smartconnect.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </FormField>

              <FormField
                id="password"
                label="Admin Password"
                required
                description="Min 8 characters, with upper, lower, and number"
              >
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </FormField>
            </CardContent>

            <CardFooter className="flex flex-col gap-3">
              <Button type="submit" className="w-full" loading={loading}>
                Initialize System
              </Button>
              <Link to="/login" className="text-xs text-muted-foreground hover:text-foreground">
                Already set up? Sign in instead
              </Link>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
