import { Link } from 'react-router-dom';
import { Layers, TrendingUp, Calendar, CheckCircle2, Sun, Moon } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';

export function AuthLayout({ title, subtitle, children, footer }) {
  const { theme, toggleTheme } = useUIStore();

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-background text-foreground transition-colors duration-150">
      {/* Top right theme toggle */}
      <div className="absolute top-4 right-4 z-20">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="flex h-9 w-9 items-center justify-center rounded-crm border border-border/60 bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shadow-subtle"
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4 text-amber-400" />
          ) : (
            <Moon className="h-4 w-4 text-slate-700" />
          )}
        </button>
      </div>

      {/* Left Form Container */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-10 lg:p-14 max-w-xl mx-auto md:max-w-none md:w-1/2 lg:w-[48%] overflow-y-auto">
        {/* Brand header */}
        <div className="flex items-center gap-3 mb-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-crm bg-primary text-primary-foreground shadow-subtle">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-foreground block">
                SmartConnect
              </span>
              <span className="text-[10px] text-muted-foreground font-mono -mt-1 block">
                RELATIONSHIP CRM
              </span>
            </div>
          </Link>
        </div>

        {/* Center Form Section */}
        <div className="my-auto w-full max-w-sm mx-auto space-y-6">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground leading-relaxed">{subtitle}</p>
            )}
          </div>

          {children}

          {footer && <div className="pt-2 text-center text-xs text-muted-foreground">{footer}</div>}
        </div>

        {/* Bottom subtle copyright */}
        <div className="mt-8 text-xs text-muted-foreground/60 text-center md:text-left">
          &copy; {new Date().getFullYear()} SmartConnect CRM. All rights reserved.
        </div>
      </div>

      {/* Right Brand Panel (Theme-Aware) */}
      <div className="hidden md:flex flex-1 flex-col justify-between p-10 lg:p-14 relative overflow-hidden transition-colors duration-150 border-l border-border/60 bg-gradient-to-br from-indigo-50/80 via-slate-50/90 to-indigo-100/60 dark:from-slate-950 dark:via-indigo-950/40 dark:to-slate-900">
        {/* Subtle decorative glow effects */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-indigo-300/25 dark:bg-indigo-600/10 blur-3xl pointer-events-none transition-colors duration-150" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-indigo-400/20 dark:bg-indigo-500/15 blur-3xl pointer-events-none transition-colors duration-150" />

        {/* Top badge */}
        <div className="relative z-10 flex items-center gap-2">
          <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold tracking-wide backdrop-blur-sm border transition-colors duration-150 bg-primary/10 text-primary border-primary/20 dark:bg-white/10 dark:text-indigo-200 dark:border-white/10">
            Intelligent Pipeline & Relationship Engine
          </span>
        </div>

        {/* Center Value Statement */}
        <div className="relative z-10 max-w-lg space-y-6 my-auto py-12">
          <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight text-slate-900 dark:text-white transition-colors duration-150">
            Close deals faster with{' '}
            <span className="text-primary dark:text-indigo-400">unified intelligence.</span>
          </h2>
          <p className="text-sm lg:text-base text-slate-600 dark:text-indigo-100/80 leading-relaxed transition-colors duration-150">
            SmartConnect gives your revenue team total pipeline transparency, automated task
            cadence, and proactive reminders so high-value opportunities never fall through the
            cracks.
          </p>

          {/* 3 Feature Highlights */}
          <div className="space-y-4 pt-4">
            <div className="flex items-start gap-3.5 rounded-crm p-3.5 backdrop-blur-sm border transition-all duration-150 bg-white/80 dark:bg-slate-900/60 border-slate-200/80 dark:border-white/10 shadow-xs">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-subtle">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <h3 className="font-semibold text-sm text-slate-900 dark:text-white transition-colors duration-150">
                  Kanban Pipeline & Lead Scoring
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 transition-colors duration-150">
                  Visual stage transitions, dynamic lead scoring, and automated win/loss metrics.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 rounded-crm p-3.5 backdrop-blur-sm border transition-all duration-150 bg-white/80 dark:bg-slate-900/60 border-slate-200/80 dark:border-white/10 shadow-xs">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-subtle">
                <Calendar className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <h3 className="font-semibold text-sm text-slate-900 dark:text-white transition-colors duration-150">
                  Unified Activity Timeline
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 transition-colors duration-150">
                  Centralized history of all calls, emails, meetings, and notes linked to contacts
                  and companies.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 rounded-crm p-3.5 backdrop-blur-sm border transition-all duration-150 bg-white/80 dark:bg-slate-900/60 border-slate-200/80 dark:border-white/10 shadow-xs">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-subtle">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <h3 className="font-semibold text-sm text-slate-900 dark:text-white transition-colors duration-150">
                  Automated Cadence & Briefings
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 transition-colors duration-150">
                  Recurring follow-ups with snooze presets and 08:00 AM daily executive email
                  digests.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Social Proof / Trust */}
        <div className="relative z-10 pt-4 border-t border-border/80 dark:border-white/10 text-xs text-muted-foreground dark:text-indigo-200/80 flex items-center justify-between transition-colors duration-150">
          <span>Enterprise Role-Based Security</span>
          <span>Bcrypt 12 • HttpOnly JWT Session</span>
        </div>
      </div>
    </div>
  );
}

export default AuthLayout;
