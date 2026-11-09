import * as React from 'react';
import { cn } from '../../lib/utils.js';
import { Label } from './label.jsx';

const FormField = React.forwardRef(
  ({ className, label, required = false, description, error, children, id, ...props }, ref) => {
    const generatedId = React.useId();
    const fieldId = id || generatedId;

    return (
      <div className={cn('space-y-1.5', className)} ref={ref} {...props}>
        {label && (
          <div className="flex items-center justify-between">
            <Label htmlFor={fieldId} className={cn(error && 'text-destructive')}>
              {label}
              {required && <span className="text-destructive ml-1">*</span>}
            </Label>
          </div>
        )}

        {React.isValidElement(children)
          ? React.cloneElement(children, {
              id: fieldId,
              error: Boolean(error),
              'aria-invalid': Boolean(error),
              'aria-describedby': error
                ? `${fieldId}-error`
                : description
                  ? `${fieldId}-desc`
                  : undefined,
            })
          : children}

        {description && !error && (
          <p id={`${fieldId}-desc`} className="text-[12px] text-muted-foreground">
            {description}
          </p>
        )}

        {error && (
          <p id={`${fieldId}-error`} className="text-[12px] font-medium text-destructive">
            {error}
          </p>
        )}
      </div>
    );
  }
);
FormField.displayName = 'FormField';

export { FormField };
export default FormField;
