import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, UserCheck, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';

const acceptInviteSchema = z
  .object({
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

export default function AcceptInvitePage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { setUser } = useAuthStore();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [serverError, setServerError] = useState(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(acceptInviteSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const passwordValue = watch('password');

  const onSubmit = async (values) => {
    setServerError(null);
    try {
      const res = await api.post('/auth/accept-invite', {
        token,
        password: values.password,
      });

      const user = res.data?.data?.user;
      if (user) {
        setUser(user);
      }

      toast.success('Invitation accepted! Welcome to the team.');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const msg = err.message || 'Invalid or expired invitation token';
      setServerError(msg);
      toast.error(msg);
    }
  };

  return (
    <AuthLayout
      title="Accept Invitation"
      subtitle="Set your account password to complete your profile setup and access SmartConnect"
      footer={
        <Link to="/login" className="text-xs text-muted-foreground hover:text-foreground">
          Already accepted? Sign in
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

        <div className="rounded-crm bg-emerald-500/10 border border-emerald-500/20 p-3 flex items-start gap-2.5 text-xs text-emerald-700 dark:text-emerald-400">
          <UserCheck className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            You have been invited to join your team workspace. Create a password to activate your
            access.
          </span>
        </div>

        {/* Password */}
        <FormField id="password" label="Create password" required error={errors.password?.message}>
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
          Activate Account & Enter Workspace
        </Button>
      </form>
    </AuthLayout>
  );
}
