import React from 'react';
import { cn } from '../../utils/cn';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'rectangular' | 'circular' | 'card';
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = 'rectangular',
  width,
  height,
  style,
  ...props
}) => {
  const variantStyles = {
    text: 'h-4 w-full rounded-md',
    rectangular: 'rounded-xl',
    circular: 'rounded-full',
    card: 'h-36 w-full rounded-2xl',
  };

  const customStyle: React.CSSProperties = {
    ...style,
    width: width !== undefined ? width : undefined,
    height: height !== undefined ? height : undefined,
  };

  return (
    <div
      role="status"
      aria-label="Loading content..."
      className={cn(
        'bg-slate-200/80 animate-pulse select-none overflow-hidden relative',
        variantStyles[variant],
        className
      )}
      style={customStyle}
      {...props}
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
};

