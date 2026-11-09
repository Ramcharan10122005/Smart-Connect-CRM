import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { ArrowLeft, MailCheck, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';

const forgotPasswordSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Please enter a valid email address'),
});

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const submittedEmail = watch('email');

  const onSubmit = async (values) => {
    setServerError(null);
    try {
      await api.post('/auth/forgot-password', { email: values.email });
      setSubmitted(true);
      toast.success('Instructions dispatched');
    } catch (err) {
      // Per security specification: response is uniform, but if network error surface it
      if (err.status >= 500) {
        setServerError('Service temporarily unavailable. Please try again shortly.');
      } else {
        setSubmitted(true);
      }
    }
  };

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your verified work email address and we'll dispatch a secure recovery link"
      footer={
        <Link
          to="/login"
          className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Sign in
        </Link>
      }
    >
      {submitted ? (
        <div className="rounded-card border bg-card p-6 text-center space-y-4 animate-in fade-in-50 duration-200">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <MailCheck className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-foreground">Check your inbox</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              If an account is associated with{' '}
              <span className="font-semibold text-foreground">{submittedEmail}</span>, a secure
              password reset link has been dispatched. The link expires in 1 hour.
            </p>
          </div>
          <div className="pt-2">
            <Link to="/login">
              <Button variant="outline" className="w-full">
                Return to Login
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {serverError && (
            <div className="rounded-crm border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          <FormField id="email" label="Work email" required error={errors.email?.message}>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              error={Boolean(errors.email)}
              {...register('email')}
            />
          </FormField>

          <Button type="submit" className="w-full mt-2" loading={isSubmitting}>
            Send Reset Instructions
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
