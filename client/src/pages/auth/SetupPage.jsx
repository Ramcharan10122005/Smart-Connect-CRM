import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, ShieldCheck, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';

const setupSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters long'),
    email: z.string().trim().email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .regex(/[A-Z]/, 'Must include at least one uppercase letter')
      .regex(/[a-z]/, 'Must include at least one lowercase letter')
      .regex(/[0-9]/, 'Must include at least one number'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export default function SetupPage() {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();

  const [checkingStatus, setCheckingStatus] = useState(true);
  const [setupRequired, setSetupRequired] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [serverError, setServerError] = useState(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const passwordValue = watch('password');

  useEffect(() => {
    let isCurrent = true;
    api
      .get('/auth/setup-status')
      .then((res) => {
        if (isCurrent) {
          setSetupRequired(res.data?.data?.setupRequired ?? false);
          setCheckingStatus(false);
        }
      })
      .catch(() => {
        if (isCurrent) {
          // If endpoint fails, fallback to allowing form attempt
          setSetupRequired(true);
          setCheckingStatus(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  const onSubmit = async (values) => {
    setServerError(null);
    try {
      const res = await api.post('/auth/setup', {
        name: values.name,
        email: values.email,
        password: values.password,
      });

      const user = res.data?.data?.user;
      if (user) {
        setUser(user);
      }

      toast.success('System initialized! Welcome to SmartConnect.');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const msg = err.message || 'System setup failed';
      setServerError(msg);
      toast.error(msg);
    }
  };

  if (checkingStatus) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
        <p className="text-sm text-muted-foreground">Checking setup status...</p>
      </div>
    );
  }

  // If system is already initialized, prevent re-setup
  if (!setupRequired) {
    return (
      <AuthLayout
        title="Setup Already Completed"
        subtitle="The initial super administrator account has already been initialized"
        footer={
          <Link to="/login" className="text-xs text-primary font-medium hover:underline">
            Proceed to Login
          </Link>
        }
      >
        <div className="rounded-card border bg-card p-6 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            SmartConnect CRM is already initialized. Additional team members must be invited by an
            Administrator through Settings &gt; Team.
          </p>
          <div className="pt-2">
            <Link to="/login">
              <Button className="w-full">Sign In to Workspace</Button>
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Initial Admin Setup"
      subtitle="Create the first Super Administrator account to configure your workspace"
      footer={
        <Link to="/login" className="text-xs text-muted-foreground hover:text-foreground">
          Already have an account? Sign in
        </Link>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {serverError && (
          <div className="rounded-crm border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{serverError}</span>
          </div>
        )}

        <div className="rounded-crm bg-primary/10 border border-primary/20 p-3 flex items-start gap-2.5 text-xs text-primary">
          <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            This screen creates the root administrator with full organizational privileges.
          </span>
        </div>

        {/* Full Name */}
        <FormField id="name" label="Full name" required error={errors.name?.message}>
          <Input
            id="name"
            placeholder="Jane Doe"
            error={Boolean(errors.name)}
            {...register('name')}
          />
        </FormField>

        {/* Email */}
        <FormField id="email" label="Admin email" required error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            placeholder="admin@company.com"
            error={Boolean(errors.email)}
            {...register('email')}
          />
        </FormField>

        {/* Password */}
        <FormField id="password" label="Master password" required error={errors.password?.message}>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="••••••••"
              error={Boolean(errors.password)}
              className="pr-10"
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </FormField>

        <PasswordStrengthMeter password={passwordValue} />

        {/* Confirm Password */}
        <FormField
          id="confirmPassword"
          label="Confirm password"
          required
          error={errors.confirmPassword?.message}
        >
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="••••••••"
              error={Boolean(errors.confirmPassword)}
              className="pr-10"
              {...register('confirmPassword')}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((prev) => !prev)}
              aria-label={showConfirm ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors"
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </FormField>

        <Button type="submit" className="w-full mt-2" loading={isSubmitting}>
          Initialize System & Log In
        </Button>
      </form>
    </AuthLayout>
  );
}
