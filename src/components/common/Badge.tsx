import React from 'react';
import { cn } from '../../utils/cn';

export type BadgeVariant =
  | 'emerald'
  | 'forest'
  | 'amber'
  | 'slate'
  | 'blue'
  | 'rose'
  | 'purple'
  | 'verified'
  | 'pending'
  | 'demo'
  | 'live'
  | 'estimated'
  | 'offline'
  | 'error';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  className?: string;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'emerald',
  size = 'md',
  className,
  icon,
}) => {
  const variantMap: Record<BadgeVariant, string> = {
    emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
    forest: 'bg-forest-900 text-emerald-300 border-forest-800',
    amber: 'bg-amber-50 text-amber-800 border-amber-200/90',
    slate: 'bg-slate-100 text-slate-700 border-slate-200/90',
    blue: 'bg-sky-50 text-sky-800 border-sky-200/90',
    rose: 'bg-rose-50 text-rose-800 border-rose-200/90',
    purple: 'bg-purple-50 text-purple-800 border-purple-200/90',
    // Semantic aliases
    verified: 'bg-emerald-50 text-emerald-800 border-emerald-200/90',
    pending: 'bg-amber-50 text-amber-800 border-amber-200/90',
    demo: 'bg-slate-100 text-slate-700 border-slate-300',
    live: 'bg-blue-50 text-blue-800 border-blue-200/90',
    estimated: 'bg-purple-50 text-purple-800 border-purple-200/90',
    offline: 'bg-amber-50 text-amber-900 border-amber-300',
    error: 'bg-rose-50 text-rose-800 border-rose-200/90',
  };

  const sizes = {
    sm: 'text-[11px] px-2 py-0.5 gap-1 font-semibold leading-tight',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-semibold leading-tight',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border transition-colors select-none shrink-0',
        variantMap[variant],
        sizes[size],
        className
      )}
    >
      {icon && <span className="inline-flex shrink-0" aria-hidden="true">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
