import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  User,
  Bell,
  Users,
  Workflow,
  Tag,
  Globe,
  Palette,
  Mail,
  Zap,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/layout/PageHeader';
import { ProfileSettings } from './components/ProfileSettings';
import { NotificationSettings } from './components/NotificationSettings';
import { TeamSettings } from './components/TeamSettings';
import { PipelineSettings } from './components/PipelineSettings';
import { TagsAndSourcesSettings } from './components/TagsAndSourcesSettings';
import { LeadCaptureSettings } from './components/LeadCaptureSettings';
import { AppearanceSettings } from './components/AppearanceSettings';
import { EmailTemplatesSettings } from './components/EmailTemplatesSettings';
import { AutomationsSettings } from './components/AutomationsSettings';

export default function SettingsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { role } = useAuthStore();

  const isAdmin = role === 'ADMIN';
  const isManager = role === 'MANAGER';
  const canManageTeam = isAdmin || isManager;

  // Compute active tab from URL path (e.g. /settings/team -> 'team')
  const pathParts = location.pathname.split('/').filter(Boolean);
  const currentTabFromPath = pathParts[1] || 'profile';

  const [activeTab, setActiveTab] = useState(currentTabFromPath);

  useEffect(() => {
    if (pathParts[1]) {
      setActiveTab(pathParts[1]);
    } else {
      setActiveTab('profile');
    }
  }, [location.pathname, pathParts]);

  const navItems = [
    {
      id: 'profile',
      label: 'Personal Profile',
      description: 'Account info & password',
      icon: User,
      visible: true,
    },
    {
      id: 'notifications',
      label: 'Notifications',
      description: 'Reminders & digests',
      icon: Bell,
      visible: true,
    },
    {
      id: 'appearance',
      label: 'Appearance',
      description: 'Theme & display',
      icon: Palette,
      visible: true,
    },
    {
      id: 'team',
      label: 'Team Management',
      description: 'Members & roles',
      icon: Users,
      visible: canManageTeam,
      badge: isManager ? 'Manager' : undefined,
    },
    {
      id: 'pipeline',
      label: 'Pipeline Stages',
      description: 'Stages & win probability',
      icon: Workflow,
      visible: isAdmin,
      badge: 'Admin',
    },
    {
      id: 'tags',
      label: 'Tags & Sources',
      description: 'Labels & lead channels',
      icon: Tag,
      visible: canManageTeam,
    },
    {
      id: 'templates',
      label: 'Email Templates',
      description: 'Canned emails & variables',
      icon: Mail,
      visible: canManageTeam,
      badge: isManager ? 'Manager' : undefined,
    },
    {
      id: 'automations',
      label: 'Automations',
      description: 'Rules & background triggers',
      icon: Zap,
      visible: canManageTeam,
      badge: isManager ? 'Manager' : undefined,
    },
    {
      id: 'lead-capture',
      label: 'Lead Capture Form',
      description: 'Website embed & routing',
      icon: Globe,
      visible: isAdmin,
      badge: 'Admin',
    },
  ].filter((item) => item.visible);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    navigate(`/settings/${tabId}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Settings & Administration"
        description="Configure your profile, notification preferences, team access levels, and sales workflow settings."
      />

      {/* Tabbed Layout with Left Sub-Navigation */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Left Sub-Navigation Sidebar */}
        <aside className="w-full md:w-64 shrink-0 rounded-card border bg-card p-2 shadow-sm space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isSelected = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleTabChange(item.id)}
                className={cn(
                  'w-full flex items-center justify-between p-2.5 rounded-crm text-left transition-colors',
                  isSelected
                    ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className={cn('h-4 w-4 shrink-0', isSelected ? 'text-primary-foreground' : 'text-muted-foreground')} />
                  <div className="truncate">
                    <p className="text-xs leading-none">{item.label}</p>
                    <p
                      className={cn(
                        'text-[10px] mt-1 truncate leading-none',
                        isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground/70'
                      )}
                    >
                      {item.description}
                    </p>
                  </div>
                </div>

                {item.badge && (
                  <span
                    className={cn(
                      'text-[9px] uppercase font-mono px-1.5 py-0.5 rounded-full font-semibold',
                      isSelected
                        ? 'bg-primary-foreground/20 text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </aside>

        {/* Right Content Area */}
        <main className="flex-1 w-full min-w-0">
          {activeTab === 'profile' && <ProfileSettings />}
          {activeTab === 'notifications' && <NotificationSettings />}
          {activeTab === 'appearance' && <AppearanceSettings />}
          {activeTab === 'team' && canManageTeam && <TeamSettings />}
          {activeTab === 'pipeline' && isAdmin && <PipelineSettings />}
          {activeTab === 'tags' && canManageTeam && <TagsAndSourcesSettings />}
          {activeTab === 'templates' && canManageTeam && <EmailTemplatesSettings />}
          {activeTab === 'automations' && canManageTeam && <AutomationsSettings />}
          {activeTab === 'lead-capture' && isAdmin && <LeadCaptureSettings />}
        </main>
      </div>
    </div>
  );
}
