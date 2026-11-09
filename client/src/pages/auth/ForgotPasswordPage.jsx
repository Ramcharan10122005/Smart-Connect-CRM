import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Layers, ArrowLeft, MailCheck } from 'lucide-react';
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

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post('/auth/forgot-password', { email });
      setSubmitted(true);
      toast.success('Reset link dispatched if email exists');
    } catch {
      // Security: always display same message
      setSubmitted(true);
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
          <h1 className="text-2xl font-bold tracking-tight text-foreground">SmartConnect CRM</h1>
          <p className="text-sm text-muted-foreground">Reset your account password</p>
        </div>

        <Card>
          {submitted ? (
            <CardContent className="pt-6 text-center space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
                <MailCheck className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">Check your inbox</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                If an account exists for{' '}
                <span className="font-semibold text-foreground">{email}</span>, we have dispatched a
                secure password reset link valid for 1 hour.
              </p>
              <div className="pt-2">
                <Link to="/login">
                  <Button variant="outline" className="w-full">
                    Return to Login
                  </Button>
                </Link>
              </div>
            </CardContent>
          ) : (
            <form onSubmit={handleSubmit}>
              <CardHeader>
                <CardTitle>Forgot Password</CardTitle>
                <CardDescription>
                  Enter your registered email address and we&apos;ll send you a password reset link.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <FormField id="email" label="Email Address" required>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </FormField>
              </CardContent>

              <CardFooter className="flex flex-col gap-3">
                <Button type="submit" className="w-full" loading={loading}>
                  Send Reset Link
                </Button>
                <Link
                  to="/login"
                  className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back to Login
                </Link>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
