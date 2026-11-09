import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthStore } from '@/stores/authStore';
import { User, Bell, Users, Workflow, Tag } from 'lucide-react';

export default function SettingsPage() {
  const { user, role } = useAuthStore();
  const isAdmin = role === 'ADMIN';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your profile, notification preferences, team members, and pipeline configurations."
      />

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="flex flex-wrap h-auto p-1 bg-muted/60">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" /> Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" /> Notifications
          </TabsTrigger>
          {isAdmin && (
            <>
              <TabsTrigger value="team" className="gap-2">
                <Users className="h-4 w-4" /> Team Management
              </TabsTrigger>
              <TabsTrigger value="pipeline" className="gap-2">
                <Workflow className="h-4 w-4" /> Pipeline Stages
              </TabsTrigger>
              <TabsTrigger value="tags" className="gap-2">
                <Tag className="h-4 w-4" /> Tags & Sources
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Personal Profile</CardTitle>
              <CardDescription>Update your display name and view account details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                Name: <strong className="text-foreground">{user?.name}</strong>
              </p>
              <p>
                Email: <strong className="text-foreground">{user?.email}</strong>
              </p>
              <p>
                Role: <strong className="text-foreground">{role}</strong>
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Configure in-app alerts and daily morning email briefings.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Daily digest email: Enabled at 08:00 server time.
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <>
            <TabsContent value="team">
              <Card>
                <CardHeader>
                  <CardTitle>Team Management</CardTitle>
                  <CardDescription>
                    Invite new users, assign roles (ADMIN, MANAGER, REP), and manage statuses.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  User invitation and role-based permissions management.
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pipeline">
              <Card>
                <CardHeader>
                  <CardTitle>Pipeline Stages</CardTitle>
                  <CardDescription>
                    Customize stage order, win probabilities, and stage classifications.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Pipeline reordering and stage configuration.
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tags">
              <Card>
                <CardHeader>
                  <CardTitle>Tags & Lead Sources</CardTitle>
                  <CardDescription>
                    Manage global tags and configure marketing lead sources.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Global taxonomy and lead origin channels.
                </CardContent>
              </Card>
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
