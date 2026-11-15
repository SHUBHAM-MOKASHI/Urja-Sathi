import React from 'react';
import { cn } from '../../utils/cn';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'destructive' | 'solar';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:opacity-55 disabled:cursor-not-allowed select-none active:scale-[0.98] shrink-0';

  const variants = {
    primary:
      'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs hover:shadow-glow border border-emerald-500/30',
    secondary:
      'bg-forest-900 hover:bg-forest-950 text-white shadow-xs border border-forest-800',
    outline:
      'bg-white hover:bg-emerald-50/70 text-emerald-800 border border-slate-200 hover:border-emerald-300 shadow-xs',
    ghost:
      'bg-transparent hover:bg-slate-100 text-slate-700 hover:text-slate-900',
    danger:
      'bg-rose-600 hover:bg-rose-700 text-white shadow-xs border border-rose-500/30',
    destructive:
      'bg-rose-600 hover:bg-rose-700 text-white shadow-xs border border-rose-500/30',
    solar:
      'bg-gradient-to-r from-amber-500 to-solar-600 hover:from-amber-600 hover:to-solar-700 text-white shadow-xs border border-amber-400/40',
  };

  const sizes = {
    sm: 'h-8 text-xs px-3 gap-1.5',
    md: 'h-10 text-sm px-4 gap-2',
    lg: 'h-12 text-base px-6 gap-2.5',
  };

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current shrink-0" aria-hidden="true" />
      ) : (
        icon && <span className="inline-flex shrink-0" aria-hidden="true">{icon}</span>
      )}
      <span>{children}</span>
    </button>
  );
};
