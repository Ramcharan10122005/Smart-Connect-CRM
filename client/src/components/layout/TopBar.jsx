import { Link, useNavigate } from 'react-router-dom';
import { Menu, Search, Sun, Moon, User, Settings, LogOut, Shield } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { initials } from '@/lib/utils';
import { NotificationsMenu } from './NotificationsMenu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function TopBar({ onOpenCommandPalette }) {
  const navigate = useNavigate();
  const { user, role, logout } = useAuthStore();
  const { theme, toggleTheme, setMobileSidebarOpen } = useUIStore();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border/60 bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-6">
      {/* Left side: Mobile menu toggle + Global Search trigger */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setMobileSidebarOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-crm border border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
          aria-label="Open navigation drawer"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Global Search Bar (desktop) */}
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="hidden sm:flex h-9 w-64 lg:w-80 items-center justify-between rounded-crm border border-border/60 bg-muted/40 px-3 text-xs text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-colors"
        >
          <div className="flex items-center gap-2">
            <Search className="h-3.5 w-3.5" />
            <span>Search records or actions...</span>
          </div>
          <kbd className="pointer-events-none rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground shadow-sm">
            ⌘K
          </kbd>
        </button>

        {/* Search icon for small mobile */}
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="flex sm:hidden h-9 w-9 items-center justify-center rounded-crm border border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Search"
        >
          <Search className="h-4 w-4" />
        </button>
      </div>

      {/* Right side controls: Notifications, Theme, User menu */}
      <div className="flex items-center gap-2.5">
        {/* Notifications dropdown */}
        <NotificationsMenu />

        {/* Theme toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="flex h-9 w-9 items-center justify-center rounded-crm border border-border/60 bg-background text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4 text-amber-400" />
          ) : (
            <Moon className="h-4 w-4 text-slate-700" />
          )}
        </button>

        {/* User profile dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded-full p-0.5 hover:ring-2 hover:ring-primary/40 focus:outline-none"
              aria-label="User account menu"
            >
              <Avatar className="h-8 w-8">
                {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user?.name} />}
                <AvatarFallback>{initials(user?.name || 'User')}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent className="w-56" align="end">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold leading-none text-foreground">
                    {user?.name || 'Authenticated User'}
                  </p>
                  <Badge
                    variant="secondary"
                    className="text-[10px] uppercase font-mono px-1.5 py-0"
                  >
                    {role || 'REP'}
                  </Badge>
                </div>
                <p className="text-xs leading-none text-muted-foreground truncate">
                  {user?.email || 'user@smartconnect.local'}
                </p>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem asChild>
              <Link to="/settings/profile" className="flex items-center cursor-pointer">
                <User className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>My Profile</span>
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild>
              <Link to="/settings" className="flex items-center cursor-pointer">
                <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>Settings</span>
              </Link>
            </DropdownMenuItem>

            {role === 'ADMIN' && (
              <DropdownMenuItem asChild>
                <Link to="/settings/team" className="flex items-center cursor-pointer">
                  <Shield className="mr-2 h-4 w-4 text-primary" />
                  <span>Team Management</span>
                </Link>
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive focus:text-destructive cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

export default TopBar;
