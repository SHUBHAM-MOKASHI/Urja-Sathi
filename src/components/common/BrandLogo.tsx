import React from 'react';
import { Link } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface BrandLogoProps {
  collapsed?: boolean;
  to?: string;
  className?: string;
  showTagline?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  collapsed = false,
  to = '/',
  className,
  showTagline = true,
  size = 'md',
  onClick,
}) => {
  const sizeClasses = {
    sm: {
      mark: 'w-8 h-8 rounded-lg',
      icon: 'w-4 h-4',
      title: 'text-sm font-bold',
      tagline: 'text-[9px]',
    },
    md: {
      mark: 'w-9 h-9 rounded-xl',
      icon: 'w-4.5 h-4.5',
      title: 'text-base font-extrabold',
      tagline: 'text-[10px]',
    },
    lg: {
      mark: 'w-10 h-10 rounded-xl',
      icon: 'w-5 h-5',
      title: 'text-lg font-extrabold',
      tagline: 'text-[10px]',
    },
  };

  const selectedSize = sizeClasses[size];

  const content = (
    <div
      className={cn(
        'flex items-center gap-2.5 group select-none min-w-0 overflow-hidden',
        collapsed ? 'justify-center w-full' : '',
        className
      )}
      title={collapsed ? 'URJA SAATHI' : 'URJA SAATHI — Har Ghar Bachat, Har Haath Kaam'}
    >
      {/* Brand Icon Mark */}
      <div
        className={cn(
          'bg-gradient-to-tr from-forest-950 via-forest-900 to-emerald-600 flex items-center justify-center text-white shadow-xs group-hover:shadow-glow transition-all shrink-0 border border-emerald-500/30',
          selectedSize.mark
        )}
        aria-hidden="true"
      >
        <Zap className={cn('text-amber-300 fill-amber-300', selectedSize.icon)} />
      </div>

      {/* Brand Text Block (hidden when collapsed) */}
      {!collapsed && (
        <div className="flex flex-col min-w-0 overflow-hidden leading-tight">
          <span
            className={cn(
              'font-display tracking-tight text-slate-900 group-hover:text-emerald-700 transition-colors truncate',
              selectedSize.title
            )}
          >
            URJA SAATHI
          </span>
          {showTagline && (
            <span
              className={cn(
                'font-semibold text-emerald-700 tracking-wide uppercase truncate mt-0.5 opacity-90',
                selectedSize.tagline
              )}
            >
              Har Ghar Bachat, Har Haath Kaam
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (to) {
    return (
      <Link
        to={to}
        onClick={onClick}
        className="focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-xl inline-flex max-w-full"
        aria-label="Go to URJA SAATHI home"
      >
        {content}
      </Link>
    );
  }

  return content;
};
