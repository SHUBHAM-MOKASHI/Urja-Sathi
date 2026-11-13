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
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const Sidebar: React.FC = () => {
  const { isOnline, savedBillsCount } = useApp();

  const links = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/bills', label: 'Bill Analyzer', icon: FileSpreadsheet, badge: savedBillsCount > 0 ? `${savedBillsCount}` : undefined },
    { to: '/savings', label: 'Savings Planner', icon: Lightbulb },
    { to: '/solar', label: 'Solar ROI Audit', icon: Sun },
    { to: '/quotations', label: 'Compare Quotations', icon: Scale },
    { to: '/workforce', label: 'Community Workforce', icon: Users },
    { to: '/settings', label: 'Settings & Cache', icon: Settings },
  ];

  return (
    <aside className="hidden lg:flex lg:flex-col w-64 border-r border-slate-200/80 bg-white/70 backdrop-blur-sm min-h-[calc(100vh-4rem)] p-4 justify-between">
      <div className="space-y-6">
        <div>
          <p className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Platform Navigation
          </p>
          <nav className="space-y-1">
            {links.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-900 font-semibold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-emerald-700" />
                    <span>{link.label}</span>
                  </div>
                  {link.badge && (
                    <span className="text-[11px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                      {link.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Community Impact Card */}
        <div className="bg-forest-950 text-white rounded-2xl p-4 shadow-subtle border border-forest-800">
          <div className="flex items-center gap-2 mb-2 text-emerald-400">
            <Info className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Mission</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Empowering tier-2 & rural households with clear billing insights and verified green livelihood jobs.
          </p>
          <div className="mt-3 pt-2.5 border-t border-forest-800/80 flex items-center justify-between text-[11px] text-emerald-300">
            <span>Har Ghar Bachat</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>Har Haath Kaam</span>
          </div>
        </div>
      </div>

      {/* Offline Storage Status Footer */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs">
        <div className="flex items-center justify-between font-semibold text-slate-700 mb-1">
          <span className="flex items-center gap-1.5">
            <HardDriveDownload className="w-3.5 h-3.5 text-emerald-600" />
            Local IndexedDB
          </span>
          <span className="text-[11px] text-emerald-600 font-medium">Active</span>
        </div>
        <p className="text-slate-500 text-[11px]">
          {isOnline
            ? 'Synced with background cache'
            : 'All changes saved locally offline'}
        </p>
      </div>
    </aside>
  );
};

