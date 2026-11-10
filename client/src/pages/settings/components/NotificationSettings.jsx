import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Bell, Mail, Clock, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export function NotificationSettings() {
  const { user, setUser } = useAuthStore();
  const prefs = user?.notificationPreferences || {};

  const [emailReminders, setEmailReminders] = useState(
    prefs.emailReminders !== undefined ? prefs.emailReminders : true
  );
  const [dailyDigest, setDailyDigest] = useState(
    prefs.dailyDigest !== undefined ? prefs.dailyDigest : true
  );
  const [inAppAlerts, setInAppAlerts] = useState(
    prefs.inAppAlerts !== undefined ? prefs.inAppAlerts : true
  );

  useEffect(() => {
    if (user?.notificationPreferences) {
      setEmailReminders(user.notificationPreferences.emailReminders !== false);
      setDailyDigest(user.notificationPreferences.dailyDigest !== false);
      setInAppAlerts(user.notificationPreferences.inAppAlerts !== false);
    }
  }, [user]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        notificationPreferences: {
          emailReminders,
          dailyDigest,
          inAppAlerts,
        },
      };
      const res = await api.patch('/users/me', payload);
      return res.data?.data;
    },
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      toast.success('Notification preferences updated!');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to update preferences');
    },
  });

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Notification Preferences</CardTitle>
        <CardDescription className="text-xs">
          Choose which channels and alerts you want to receive for task reminders and team digests.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Email Reminders */}
        <div className="flex items-center justify-between gap-4 py-2 border-b">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-crm bg-blue-500/10 text-blue-600 dark:text-blue-400 mt-0.5">
              <Mail className="h-4 w-4" />
            </div>
            <div>
              <Label htmlFor="toggle-reminders" className="text-xs font-semibold cursor-pointer">
                Email Reminders
              </Label>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Receive instant email notifications when tasks or follow-ups are assigned to you or become overdue.
              </p>
            </div>
          </div>
          <Switch
            id="toggle-reminders"
            checked={emailReminders}
            onCheckedChange={setEmailReminders}
          />
        </div>

        {/* Daily Digest */}
        <div className="flex items-center justify-between gap-4 py-2 border-b">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-crm bg-amber-500/10 text-amber-600 dark:text-amber-400 mt-0.5">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <Label htmlFor="toggle-digest" className="text-xs font-semibold cursor-pointer">
                Daily Morning Digest
              </Label>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Receive a daily briefing email at 8:00 AM with your overdue tasks, agenda for the day, and new inbound leads.
              </p>
            </div>
          </div>
          <Switch
            id="toggle-digest"
            checked={dailyDigest}
            onCheckedChange={setDailyDigest}
          />
        </div>

        {/* In-app Alerts */}
        <div className="flex items-center justify-between gap-4 py-2">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-crm bg-primary/10 text-primary mt-0.5">
              <Bell className="h-4 w-4" />
            </div>
            <div>
              <Label htmlFor="toggle-inapp" className="text-xs font-semibold cursor-pointer">
                In-App Realtime Alerts
              </Label>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Display badge badges in the top navigation bell for live notifications and assigned updates.
              </p>
            </div>
          </div>
          <Switch
            id="toggle-inapp"
            checked={inAppAlerts}
            onCheckedChange={setInAppAlerts}
          />
        </div>

        <div className="flex justify-end pt-4">
          <Button
            type="button"
            size="sm"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Save Preferences
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
