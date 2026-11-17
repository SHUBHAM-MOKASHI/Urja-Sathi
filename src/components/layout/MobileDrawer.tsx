import React, { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  X,
  LayoutDashboard,
  FileSpreadsheet,
  Sun,
  Users,
  Settings,
  Lightbulb,
  Scale,
  Landmark,
  TrendingUp,
  HardDriveDownload,
  Info,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { BrandLogo } from '../common/BrandLogo';
import { cn } from '../../utils/cn';

export const MobileDrawer: React.FC = () => {
  const {
    isMobileDrawerOpen,
    setIsMobileDrawerOpen,
    savedBillsCount,
    pendingQueueCount,
  } = useApp();

  const location = useLocation();

  // Close drawer on route change
  useEffect(() => {
    setIsMobileDrawerOpen(false);
  }, [location.pathname, setIsMobileDrawerOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileDrawerOpen(false);
    };
    if (isMobileDrawerOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobileDrawerOpen, setIsMobileDrawerOpen]);

  if (!isMobileDrawerOpen) return null;

  const links = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    {
      to: '/bills',
      label: 'Bill Analyzer',
      icon: FileSpreadsheet,
      badge: savedBillsCount > 0 ? `${savedBillsCount}` : undefined,
    },
    { to: '/savings', label: 'Savings Planner', icon: Lightbulb },
    { to: '/solar', label: 'Solar ROI Audit', icon: Sun },
    { to: '/quotations', label: 'Compare Quotations', icon: Scale },
    { to: '/schemes', label: 'Govt Schemes & DBT', icon: Landmark },
    { to: '/workforce', label: 'Community Workforce', icon: Users },
    { to: '/impact', label: 'Impact Tracker', icon: TrendingUp },
    { to: '/settings', label: 'Settings & Cache', icon: Settings },
  ];

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Mobile Navigation">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-200"
        onClick={() => setIsMobileDrawerOpen(false)}
        aria-hidden="true"
      />

      {/* Slide-out Menu */}
      <div className="fixed inset-y-0 left-0 w-[280px] bg-white shadow-2xl flex flex-col z-50 transform transition-transform duration-200 ease-out">
        {/* Drawer Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100">
          <BrandLogo
            to="/"
            size="md"
            showTagline={true}
            onClick={() => setIsMobileDrawerOpen(false)}
          />
          <button
            onClick={() => setIsMobileDrawerOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            aria-label="Close navigation menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Platform Modules
          </p>
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setIsMobileDrawerOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-emerald-50 text-emerald-900 font-semibold'
                      : 'text-slate-700 hover:bg-slate-50'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <Icon
                        className={cn(
                          'w-5 h-5',
                          isActive ? 'text-emerald-700' : 'text-slate-400'
                        )}
                      />
                      <span>{link.label}</span>
                    </div>
                    {link.badge && (
                      <span className="text-[11px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                        {link.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Drawer Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50 space-y-2">
          {/* Mission Card */}
          <div className="bg-forest-950 text-white rounded-xl p-3 text-xs border border-forest-800">
            <div className="flex items-center gap-1.5 text-emerald-400 mb-1">
              <Info className="w-3.5 h-3.5" />
              <span className="font-bold text-[10px] uppercase">Mission</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Empowering households with billing clarity & verified green jobs.
            </p>
          </div>

          {/* Storage Status */}
          <div className="flex items-center justify-between text-xs font-medium text-slate-600 bg-white border border-slate-200/80 rounded-lg p-2">
            <span className="flex items-center gap-1.5">
              <HardDriveDownload className="w-3.5 h-3.5 text-emerald-600" />
              IndexedDB Local
            </span>
            <span className="text-emerald-700 font-semibold text-[11px]">Active</span>
          </div>
          {pendingQueueCount > 0 && (
            <div className="text-[10px] text-amber-800 bg-amber-50 font-bold px-2 py-1 rounded border border-amber-200 text-center">
              {pendingQueueCount} pending offline change{pendingQueueCount > 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
