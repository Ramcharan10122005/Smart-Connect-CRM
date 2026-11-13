import { NavLink, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Users,
  Target,
  CheckSquare,
  CalendarDays,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function Sidebar({ isMobile = false, onCloseMobile }) {
  const location = useLocation();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const { role } = useAuthStore();

  const collapsed = !isMobile && sidebarCollapsed;

  // Fetch overdue count for follow-ups badge
  const { data: followUpsSummary } = useQuery({
    queryKey: queryKeys.followUps.summary(),
    queryFn: async () => {
      const res = await api.get('/follow-ups/summary');
      return res.data?.data || { overdue: 0 };
    },
    refetchInterval: 60000,
  });

  const overdueCount = followUpsSummary?.overdue || 0;

  const navItems = [
    { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { label: 'Customers', to: '/customers', icon: Users },
    { label: 'Leads', to: '/leads', icon: Target },
    {
      label: 'Follow-ups',
      to: '/follow-ups',
      icon: CheckSquare,
      badge: overdueCount > 0 ? overdueCount : null,
      badgeVariant: 'destructive',
    },
    { label: 'Activities', to: '/activities', icon: CalendarDays },
    // Only show Reports for MANAGER and ADMIN
    ...(role !== 'REP' ? [{ label: 'Reports', to: '/reports', icon: BarChart3 }] : []),
    { label: 'Settings', to: '/settings', icon: Settings },
  ];

  return (
    <aside
      className={cn(
        'relative flex flex-col border-r border-border/60 bg-card transition-all duration-300 ease-in-out',
        isMobile ? 'h-full w-72' : collapsed ? 'w-[70px] min-h-screen' : 'w-64 min-h-screen'
      )}
    >
      {/* Brand Header */}
      <div
        className={cn(
          'relative flex h-16 items-center border-b border-border/60 transition-all duration-200',
          collapsed ? 'justify-center px-2' : 'justify-between px-4'
        )}
      >
        <NavLink
          to="/dashboard"
          onClick={isMobile ? onCloseMobile : undefined}
          className={cn(
            'flex items-center gap-3 overflow-hidden',
            collapsed && 'justify-center'
          )}
          title="SmartConnect CRM"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-crm bg-primary text-primary-foreground shadow-subtle hover:opacity-90 transition-opacity">
            <Layers className="h-5 w-5" />
          </div>
          {(!collapsed || isMobile) && (
            <div className="flex flex-col animate-in fade-in-50 duration-200">
              <span className="font-bold text-sm tracking-tight text-foreground">SmartConnect</span>
              <span className="text-[10px] text-muted-foreground font-mono -mt-0.5">
                RELATIONSHIP CRM
              </span>
            </div>
          )}
        </NavLink>

        {!isMobile && !collapsed && (
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="Collapse sidebar"
            className="flex h-7 w-7 items-center justify-center rounded-crm border border-border/60 bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Collapse Toggle when Sidebar is Collapsed (Floats cleanly on border divider below header) */}
      {!isMobile && collapsed && (
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label="Expand sidebar"
          className="absolute -right-3 top-20 z-30 flex h-6 w-6 items-center justify-center rounded-full border border-border/80 bg-card text-muted-foreground shadow-md hover:scale-110 hover:border-primary/50 hover:text-foreground transition-all duration-200"
          title="Expand sidebar"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1.5 p-3 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isItemActive =
            item.to === '/dashboard'
              ? location.pathname === '/dashboard' || location.pathname === '/'
              : location.pathname.startsWith(item.to);

          const linkContent = (
            <NavLink
              to={item.to}
              onClick={isMobile ? onCloseMobile : undefined}
              className={() =>
                cn(
                  'group relative flex items-center transition-all duration-150',
                  collapsed && !isMobile
                    ? 'h-10 w-10 mx-auto justify-center rounded-crm'
                    : 'w-full rounded-crm px-3 py-2.5 text-xs font-medium justify-between',
                  isItemActive
                    ? 'bg-primary text-primary-foreground shadow-subtle'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )
              }
            >
              {() => (
                <>
                  <div className={cn('flex items-center', collapsed && !isMobile ? 'justify-center' : 'gap-3')}>
                    <Icon
                      className={cn(
                        'h-4 w-4 shrink-0 transition-transform duration-150 group-hover:scale-105',
                        isItemActive
                          ? 'text-primary-foreground'
                          : 'text-muted-foreground group-hover:text-foreground'
                      )}
                    />
                    {(!collapsed || isMobile) && <span className="truncate">{item.label}</span>}
                  </div>

                  {item.badge && (!collapsed || isMobile) && (
                    <span
                      className={cn(
                        'flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold tracking-tight shadow-sm',
                        item.badgeVariant === 'destructive'
                          ? isItemActive
                            ? 'bg-rose-500 text-white'
                            : 'bg-rose-600 text-white'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {item.badge}
                    </span>
                  )}

                  {item.badge && collapsed && !isMobile && (
                    <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-rose-600 ring-2 ring-card" />
                  )}
                </>
              )}
            </NavLink>
          );

          if (collapsed && !isMobile) {
            return (
              <Tooltip key={item.to}>
                <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                <TooltipContent side="right" className="font-medium text-xs">
                  {item.label}
                  {item.badge && (
                    <span className="ml-1.5 text-rose-500 font-bold">({item.badge})</span>
                  )}
                </TooltipContent>
              </Tooltip>
            );
          }

          return <div key={item.to}>{linkContent}</div>;
        })}
      </nav>

      {/* Footer Info */}
      {(!collapsed || isMobile) && (
        <div className="border-t border-border/60 p-4 text-[11px] text-muted-foreground">
          <p className="font-medium text-foreground">SmartConnect CRM</p>
          <p className="text-[10px] text-muted-foreground/80 mt-0.5">v1.0.0 Production Ready</p>
        </div>
      )}
    </aside>
  );
}

export default Sidebar;
