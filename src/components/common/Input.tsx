import React, { forwardRef, useId } from 'react';
import { cn } from '../../utils/cn';
import { AlertCircle } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  icon?: React.ReactNode;
  endAdornment?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      helperText,
      error,
      icon,
      endAdornment,
      id: customId,
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = customId || generatedId;
    const errorId = `${id}-error`;
    const helperId = `${id}-helper`;

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label htmlFor={id} className="block text-xs font-bold text-slate-700 tracking-wide uppercase">
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-3.5 pointer-events-none text-slate-400 shrink-0">
              {icon}
            </div>
          )}

          <input
            ref={ref}
            id={id}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            className={cn(
              'w-full h-10 sm:h-11 rounded-xl bg-white border text-sm text-slate-900 placeholder:text-slate-400 transition-all duration-150',
              'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500',
              'disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed',
              icon ? 'pl-10' : 'pl-3.5',
              endAdornment || error ? 'pr-10' : 'pr-3.5',
              error
                ? 'border-rose-400 focus:ring-rose-400 text-rose-950'
                : 'border-slate-200/90 hover:border-slate-300 shadow-xs',
              className
            )}
            {...props}
          />

          {error ? (
            <div className="absolute right-3 text-rose-600 pointer-events-none">
              <AlertCircle className="w-4 h-4" />
            </div>
          ) : endAdornment ? (
            <div className="absolute right-3 text-slate-400">
              {endAdornment}
            </div>
          ) : null}
        </div>

        {error ? (
          <p id={errorId} className="text-xs font-semibold text-rose-600 flex items-center gap-1 mt-1">
            {error}
          </p>
        ) : helperText ? (
          <p id={helperId} className="text-xs text-slate-500 mt-1">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';

