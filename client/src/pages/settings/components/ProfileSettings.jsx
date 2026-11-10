import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { KeyRound, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { initials } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter';

export function ProfileSettings() {
  const { user, setUser } = useAuthStore();

  // Profile Form state
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');

  // Password Form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // 1. Update Profile Mutation
  const profileMutation = useMutation({
    mutationFn: async () => {
      const res = await api.patch('/users/me', {
        name: name.trim(),
        phone: phone.trim() || null,
        avatarUrl: avatarUrl.trim() || null,
      });
      return res.data?.data;
    },
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      toast.success('Profile updated successfully');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to update profile');
    },
  });

  // 2. Change Password Mutation
  const passwordMutation = useMutation({
    mutationFn: async () => {
      if (newPassword !== confirmPassword) {
        throw new Error('New passwords do not match');
      }
      const res = await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || err.message || 'Failed to change password');
    },
  });

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    profileMutation.mutate();
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error('Current password is required');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    passwordMutation.mutate();
  };

  return (
    <div className="space-y-6">
      {/* Profile Details Card */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Profile Information</CardTitle>
          <CardDescription className="text-xs">
            Manage your personal profile, contact information, and avatar display.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSubmit} className="space-y-5">
            {/* Avatar Row */}
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border-2 border-border">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
                <AvatarFallback className="text-base font-bold bg-primary/10 text-primary">
                  {initials(name || 'SC')}
                </AvatarFallback>
              </Avatar>

              <div className="space-y-1.5 flex-1 max-w-sm">
                <Label htmlFor="avatar-url" className="text-xs font-semibold">
                  Avatar Image URL
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="avatar-url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://example.com/photo.jpg"
                    className="h-9 text-xs"
                  />
                  {avatarUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setAvatarUrl('')}
                      className="h-9 text-xs text-muted-foreground"
                    >
                      Clear
                    </Button>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Paste a direct image link or leave empty to use your fallback initials.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Name */}
              <div className="space-y-1.5">
                <Label htmlFor="prof-name" className="text-xs font-semibold">
                  Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="prof-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>

              {/* Email (Readonly) */}
              <div className="space-y-1.5">
                <Label htmlFor="prof-email" className="text-xs font-semibold">
                  Email Address
                </Label>
                <Input
                  id="prof-email"
                  value={user?.email || ''}
                  disabled
                  className="h-9 text-xs bg-muted/40 cursor-not-allowed"
                />
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <Label htmlFor="prof-phone" className="text-xs font-semibold">
                  Phone Number
                </Label>
                <Input
                  id="prof-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="h-9 text-xs"
                />
              </div>

              {/* Role */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Account Role</Label>
                <Input
                  value={user?.role || 'REP'}
                  disabled
                  className="h-9 text-xs bg-muted/40 cursor-not-allowed uppercase font-mono font-semibold"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" size="sm" disabled={profileMutation.isPending}>
                {profileMutation.isPending ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Save Profile
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Change Password Card */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Change Password</CardTitle>
          <CardDescription className="text-xs">
            Update your account password with standard complexity requirements.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
            {/* Current Password */}
            <div className="space-y-1.5">
              <Label htmlFor="curr-pass" className="text-xs font-semibold">
                Current Password <span className="text-destructive">*</span>
              </Label>
              <Input
                id="curr-pass"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>

            {/* New Password */}
            <div className="space-y-1.5">
              <Label htmlFor="new-pass" className="text-xs font-semibold">
                New Password <span className="text-destructive">*</span>
              </Label>
              <Input
                id="new-pass"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-9 text-xs"
                required
              />
              <PasswordStrengthMeter password={newPassword} />
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <Label htmlFor="conf-pass" className="text-xs font-semibold">
                Confirm New Password <span className="text-destructive">*</span>
              </Label>
              <Input
                id="conf-pass"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="pt-2">
              <Button type="submit" size="sm" disabled={passwordMutation.isPending}>
                {passwordMutation.isPending ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Updating...
                  </>
                ) : (
                  <>
                    <KeyRound className="mr-1.5 h-3.5 w-3.5" /> Update Password
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
