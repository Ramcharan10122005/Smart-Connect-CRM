import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PageHeader({ title, description, breadcrumbs = [], actions, className, children }) {
  return (
    <div className={cn('pb-6 border-b border-border/60 mb-6', className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav
          aria-label="Breadcrumb"
          className="flex items-center space-x-1 text-xs text-muted-foreground mb-2"
        >
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/60 shrink-0" />}
              {crumb.href ? (
                <Link
                  to={crumb.href}
                  className="hover:text-foreground transition-colors truncate max-w-[150px]"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-foreground font-medium truncate max-w-[200px]">
                  {crumb.label}
                </span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
          {description && <p className="text-sm text-muted-foreground max-w-2xl">{description}</p>}
        </div>

        {actions && (
          <div className="flex flex-wrap items-center gap-2.5 sm:self-center shrink-0">
            {actions}
          </div>
        )}
      </div>

      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

export default PageHeader;
