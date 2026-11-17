import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileSpreadsheet,
  Sun,
  Users,
  Settings,
  HardDriveDownload,
  Info,
  Lightbulb,
  Scale,
  Landmark,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { BrandLogo } from '../common/BrandLogo';
import { Tooltip } from '../common/Tooltip';
import { cn } from '../../utils/cn';

export const Sidebar: React.FC = () => {
  const {
    savedBillsCount,
    pendingQueueCount,
    isSidebarCollapsed,
    toggleSidebar,
  } = useApp();

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
    <aside
      aria-label="Platform Sidebar Navigation"
      className={cn(
        'hidden lg:flex lg:flex-col shrink-0 border-r border-slate-200/90 bg-white/95 backdrop-blur-md sticky top-0 h-screen transition-width duration-200 ease-in-out z-30 select-none overflow-x-hidden',
        isSidebarCollapsed ? 'w-[72px]' : 'w-[250px]'
      )}
    >
      {/* Sidebar Header with Brand Logo */}
      <div
        className={cn(
          'h-16 flex items-center border-b border-slate-100 shrink-0 px-4',
          isSidebarCollapsed ? 'justify-center px-2' : 'justify-between'
        )}
      >
        <BrandLogo
          collapsed={isSidebarCollapsed}
          to="/"
          size={isSidebarCollapsed ? 'sm' : 'md'}
          showTagline={!isSidebarCollapsed}
        />
      </div>

      {/* Main Navigation Items */}
      <div className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {!isSidebarCollapsed && (
          <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Platform Modules
          </p>
        )}
        <nav aria-label="Main Navigation" className="space-y-1">
          {links.map((link) => {
            const Icon = link.icon;
            const navItem = (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center rounded-xl text-sm font-medium transition-all duration-150 relative focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
                    isSidebarCollapsed
                      ? 'justify-center w-11 h-11 mx-auto p-0'
                      : 'justify-between px-3 py-2.5 w-full',
                    isActive
                      ? 'bg-emerald-50 text-emerald-900 font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <Icon
                          className={cn(
                            'w-5 h-5 transition-colors',
                            isActive
                              ? 'text-emerald-700'
                              : 'text-slate-400 group-hover:text-slate-700'
                          )}
                        />
                        {/* Indicator dot when collapsed and badge exists */}
                        {isSidebarCollapsed && link.badge && (
                          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-600 rounded-full ring-2 ring-white" />
                        )}
                      </div>
                      {!isSidebarCollapsed && (
                        <span className="truncate">{link.label}</span>
                      )}
                    </div>

                    {!isSidebarCollapsed && link.badge && (
                      <span className="text-[11px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full shrink-0">
                        {link.badge}
                      </span>
                    )}

                    {/* Active accent pill on left border */}
                    {isActive && (
                      <span
                        className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-emerald-600 rounded-r"
                        aria-hidden="true"
                      />
                    )}
                  </>
                )}
              </NavLink>
            );

            if (isSidebarCollapsed) {
              return (
                <Tooltip
                  key={link.to}
                  content={
                    <span className="flex items-center gap-1.5">
                      {link.label}
                      {link.badge && (
                        <span className="bg-emerald-700 text-white text-[10px] px-1.5 py-0.2 rounded-full">
                          {link.badge}
                        </span>
                      )}
                    </span>
                  }
                  position="right"
                >
                  {navItem}
                </Tooltip>
              );
            }

            return navItem;
          })}
        </nav>
      </div>

      {/* Sidebar Footer Section */}
      <div className="p-3 border-t border-slate-100 space-y-2 shrink-0 bg-slate-50/50">
        {/* Mission Statement (Expanded only) */}
        {!isSidebarCollapsed && (
          <div className="bg-forest-950 text-white rounded-xl p-3 shadow-xs border border-forest-800">
            <div className="flex items-center gap-1.5 mb-1 text-emerald-400">
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span className="text-[10px] font-bold uppercase tracking-wider">
                Mission
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-snug line-clamp-2">
              Empowering households with billing clarity & verified green jobs.
            </p>
            <div className="mt-2 pt-1.5 border-t border-forest-800/80 flex items-center justify-between text-[10px] text-emerald-300 font-semibold">
              <span>Har Ghar Bachat</span>
              <span className="w-1 h-1 rounded-full bg-emerald-400" />
              <span>Har Haath Kaam</span>
            </div>
          </div>
        )}

        {/* Local Storage Status Indicator */}
        {!isSidebarCollapsed ? (
          <div className="bg-white border border-slate-200/80 rounded-lg p-2 text-xs">
            <div className="flex items-center justify-between font-semibold text-slate-700">
              <span className="flex items-center gap-1 text-[11px]">
                <HardDriveDownload className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                IndexedDB
              </span>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">
                Active
              </span>
            </div>
            {pendingQueueCount > 0 && (
              <div className="mt-1 text-[10px] text-amber-800 bg-amber-50 font-bold px-1.5 py-0.5 rounded border border-amber-200 truncate">
                {pendingQueueCount} queued for sync
              </div>
            )}
          </div>
        ) : (
          <Tooltip content="IndexedDB Local Storage Active" position="right">
            <div
              className="w-10 h-10 mx-auto rounded-lg bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-700"
              aria-label="IndexedDB Active"
            >
              <HardDriveDownload className="w-4 h-4" />
            </div>
          </Tooltip>
        )}

        {/* Collapse / Expand Toggle Button */}
        <button
          onClick={toggleSidebar}
          aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
            isSidebarCollapsed ? 'w-10 h-9 mx-auto' : 'w-full py-1.5 gap-2 text-xs font-semibold'
          )}
        >
          {isSidebarCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span>Collapse Sidebar</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};
