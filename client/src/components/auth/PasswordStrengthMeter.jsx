/* eslint-disable react-refresh/only-export-components */
import { useMemo } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function checkPasswordStrength(password = '') {
  const requirements = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'One lowercase letter', met: /[a-z]/.test(password) },
    { label: 'One number (0-9)', met: /[0-9]/.test(password) },
  ];

  const metCount = requirements.filter((r) => r.met).length;

  let strengthLabel = 'Very Weak';
  let strengthColor = 'bg-rose-500';
  let textClass = 'text-rose-600 dark:text-rose-400';

  if (metCount === 2) {
    strengthLabel = 'Weak';
    strengthColor = 'bg-amber-500';
    textClass = 'text-amber-600 dark:text-amber-400';
  } else if (metCount === 3) {
    strengthLabel = 'Good';
    strengthColor = 'bg-sky-500';
    textClass = 'text-sky-600 dark:text-sky-400';
  } else if (metCount === 4) {
    strengthLabel = 'Strong';
    strengthColor = 'bg-emerald-500';
    textClass = 'text-emerald-600 dark:text-emerald-400';
  }

  return { requirements, metCount, strengthLabel, strengthColor, textClass };
}

export function PasswordStrengthMeter({ password = '', showRequirements = true }) {
  const { requirements, metCount, strengthLabel, strengthColor, textClass } = useMemo(
    () => checkPasswordStrength(password),
    [password]
  );

  if (!password) return null;

  return (
    <div className="space-y-2.5 pt-1.5 animate-in fade-in-50 duration-150">
      {/* 4-bar strength indicator */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground font-medium">Password Strength:</span>
          <span className={cn('font-semibold text-xs', textClass)}>{strengthLabel}</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5 h-1.5">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className={cn(
                'rounded-full transition-all duration-300',
                index < metCount ? strengthColor : 'bg-muted/70'
              )}
            />
          ))}
        </div>
      </div>

      {/* Criteria checklist */}
      {showRequirements && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] pt-0.5">
          {requirements.map((req, i) => (
            <div
              key={i}
              className={cn(
                'flex items-center gap-1.5 transition-colors',
                req.met ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
              )}
            >
              {req.met ? (
                <Check className="h-3.5 w-3.5 shrink-0 stroke-[2.5]" />
              ) : (
                <X className="h-3 w-3 shrink-0 text-muted-foreground/50" />
              )}
              <span>{req.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PasswordStrengthMeter;
