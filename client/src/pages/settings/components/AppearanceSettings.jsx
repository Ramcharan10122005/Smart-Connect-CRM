import { Sun, Moon, Laptop, Check } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const THEMES = [
  {
    id: 'light',
    label: 'Light Mode',
    description: 'Clean high-contrast theme optimized for bright workspaces.',
    icon: Sun,
    bgPreview: 'bg-[#F8FAFC] border-slate-200 text-slate-900',
    sidebarPreview: 'bg-white border-slate-200',
  },
  {
    id: 'dark',
    label: 'Dark Mode',
    description: 'Modern low-light interface reducing eye fatigue during long sessions.',
    icon: Moon,
    bgPreview: 'bg-[#0F172A] border-slate-800 text-slate-100',
    sidebarPreview: 'bg-[#1E293B] border-slate-700',
  },
  {
    id: 'system',
    label: 'System Preference',
    description: 'Automatically synchronizes with your operating system color scheme.',
    icon: Laptop,
    bgPreview: 'bg-gradient-to-r from-slate-100 to-slate-900 text-slate-800 dark:text-slate-200',
    sidebarPreview: 'bg-muted border-border',
  },
];

export function AppearanceSettings() {
  const { theme, setTheme } = useUIStore();

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Appearance & Interface</CardTitle>
        <CardDescription className="text-xs">
          Select your visual appearance preference for SmartConnect CRM across all screens.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {THEMES.map((item) => {
            const Icon = item.icon;
            const isSelected = theme === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTheme(item.id)}
                className={cn(
                  'relative flex flex-col items-start p-4 rounded-card border text-left transition-all',
                  isSelected
                    ? 'border-primary ring-2 ring-primary/40 bg-primary/5 shadow-sm'
                    : 'border-border bg-card hover:bg-muted/40'
                )}
              >
                {/* Visual Preview Box */}
                <div
                  className={cn(
                    'w-full h-24 rounded-crm border mb-3 p-2 flex gap-1.5 shadow-inner',
                    item.bgPreview
                  )}
                >
                  <div className={cn('w-1/4 h-full rounded-sm border', item.sidebarPreview)} />
                  <div className="flex-1 space-y-1.5 pt-1">
                    <div className="h-2 w-3/4 bg-current opacity-30 rounded-full" />
                    <div className="h-2 w-1/2 bg-current opacity-20 rounded-full" />
                    <div className="h-2 w-2/3 bg-current opacity-20 rounded-full" />
                  </div>
                </div>

                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <Icon className={cn('h-4 w-4', isSelected ? 'text-primary' : 'text-muted-foreground')} />
                    <span className="text-xs font-semibold text-foreground">{item.label}</span>
                  </div>
                  {isSelected && (
                    <div className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                  {item.description}
                </p>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

