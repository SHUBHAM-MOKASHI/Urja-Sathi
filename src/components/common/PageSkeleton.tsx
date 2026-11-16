import React from 'react';

interface PageSkeletonProps {
  title?: string;
}

export const PageSkeleton: React.FC<PageSkeletonProps> = ({ title = 'Loading page' }) => {
  return (
    <div
      role="status"
      aria-label={title}
      aria-busy="true"
      className="space-y-6 animate-pulse max-w-7xl mx-auto py-2"
    >
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2.5">
          <div className="flex items-center gap-3">
            <div className="h-8 w-64 bg-slate-200 rounded-xl" />
            <div className="h-6 w-24 bg-emerald-100 rounded-full" />
          </div>
          <div className="h-4 w-96 max-w-full bg-slate-200/80 rounded-lg" />
        </div>
        <div className="h-10 w-44 bg-slate-200 rounded-xl self-start md:self-auto" />
      </div>

      {/* KPI Stat Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-28 bg-slate-200 rounded-md" />
              <div className="w-8 h-8 rounded-xl bg-slate-100" />
            </div>
            <div className="h-8 w-36 bg-slate-200 rounded-lg" />
            <div className="h-3.5 w-48 bg-slate-100 rounded-md" />
          </div>
        ))}
      </div>

      {/* Main Content Workspace Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="h-6 w-48 bg-slate-200 rounded-lg" />
            <div className="h-5 w-20 bg-slate-100 rounded-md" />
          </div>
          <div className="h-64 bg-slate-100/70 rounded-2xl" />
          <div className="space-y-3">
            <div className="h-4 w-full bg-slate-100 rounded-md" />
            <div className="h-4 w-5/6 bg-slate-100 rounded-md" />
            <div className="h-4 w-4/6 bg-slate-100 rounded-md" />
          </div>
        </div>

        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <div className="h-5 w-36 bg-slate-200 rounded-lg" />
            <div className="h-32 bg-slate-100/70 rounded-2xl" />
            <div className="h-10 w-full bg-slate-200 rounded-xl" />
          </div>
          <div className="bg-emerald-50/50 rounded-3xl border border-emerald-100/80 p-6 space-y-3">
            <div className="h-4 w-32 bg-emerald-200 rounded-md" />
            <div className="h-3 w-full bg-emerald-100 rounded-md" />
            <div className="h-3 w-4/5 bg-emerald-100 rounded-md" />
          </div>
        </div>
      </div>

      <span className="sr-only">Loading content, please wait...</span>
    </div>
  );
};
