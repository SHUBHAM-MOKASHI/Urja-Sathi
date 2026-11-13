import React from 'react';
import { Card } from './Card';
import { cn } from '../../utils/cn';
import { TrendingDown, TrendingUp } from 'lucide-react';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: string;
    isPositive: boolean; // positive savings vs increase
    label?: string;
  };
  variant?: 'default' | 'emerald' | 'amber';
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  variant = 'default',
  className,
}) => {
  const iconBgStyles = {
    default: 'bg-slate-100 text-slate-700',
    emerald: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
    amber: 'bg-amber-50 text-amber-700 border border-amber-100',
  };

  return (
    <Card hoverEffect className={cn('p-5 sm:p-6', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
            {title}
          </p>
          <h4 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {value}
          </h4>
        </div>
        <div className={cn('p-3 rounded-xl flex items-center justify-center shrink-0', iconBgStyles[variant])}>
          {icon}
        </div>
      </div>

      {(trend || subtitle) && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          {trend ? (
            <div className="flex items-center gap-1.5 font-medium">
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md font-semibold',
                  trend.isPositive
                    ? 'text-emerald-700 bg-emerald-50'
                    : 'text-rose-700 bg-rose-50'
                )}
              >
                {trend.isPositive ? (
                  <TrendingDown className="w-3.5 h-3.5" />
                ) : (
                  <TrendingUp className="w-3.5 h-3.5" />
                )}
                {trend.value}
              </span>
              {trend.label && <span className="text-slate-500">{trend.label}</span>}
            </div>
          ) : (
            <span className="text-slate-500">{subtitle}</span>
          )}
        </div>
      )}
    </Card>
  );
};
