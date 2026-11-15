import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  Menu,
  Wifi,
  WifiOff,
  Mic,
  Globe,
  Settings,
  User,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { BrandLogo } from '../common/BrandLogo';
import { Tooltip } from '../common/Tooltip';
import { VoiceAssistantModal } from '../voice/VoiceAssistantModal';
import { Language } from '../../types';
import { cn } from '../../utils/cn';

interface RouteMeta {
  title: string;
  category: string;
}

const ROUTE_TITLES: Record<string, RouteMeta> = {
  '/dashboard': { title: 'Dashboard & Overview', category: 'Intelligence' },
  '/bills': { title: 'Electricity Bill Analyzer', category: 'Audit & OCR' },
  '/savings': { title: 'Savings Planner', category: 'Optimization' },
  '/solar': { title: 'Solar ROI Audit', category: 'Renewables' },
  '/solar-audit': { title: 'Solar ROI Audit', category: 'Renewables' },
  '/quotations': { title: 'Compare Quotations', category: 'Marketplace' },
  '/quotes': { title: 'Compare Quotations', category: 'Marketplace' },
  '/schemes': { title: 'Government Schemes & DBT', category: 'Subsidies' },
  '/guidance': { title: 'Government Schemes & DBT', category: 'Subsidies' },
  '/workforce': { title: 'Community Workforce', category: 'Green Livelihoods' },
  '/impact': { title: 'Impact & Feedback Tracker', category: 'Transparency' },
  '/tracker': { title: 'Impact & Feedback Tracker', category: 'Transparency' },
  '/feedback': { title: 'Impact & Feedback Tracker', category: 'Transparency' },
  '/settings': { title: 'Settings & Cache', category: 'Preferences' },
};

export const TopUtilityBar: React.FC = () => {
  const {
    isOnline,
    language,
    setLanguage,
    pendingQueueCount,
    userProfile,
    isSidebarCollapsed,
    toggleSidebar,
    setIsMobileDrawerOpen,
  } = useApp();

  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const location = useLocation();

  const currentRouteMeta = ROUTE_TITLES[location.pathname] || {
    title: 'Platform Workspace',
    category: 'URJA SAATHI',
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLanguage(e.target.value as Language);
  };

  return (
    <>
      <header
        aria-label="Top Utility Bar"
        className="sticky top-0 z-20 w-full h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3 select-none"
      >
        {/* Left: Mobile Drawer Trigger, Desktop Sidebar Toggle & Breadcrumb */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile Menu Hamburger (Visible on screens < 1024px) */}
          <button
            onClick={() => setIsMobileDrawerOpen(true)}
            className="lg:hidden p-2 -ml-2 rounded-xl text-slate-700 hover:text-emerald-800 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            aria-label="Open mobile navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Mobile Brand Logo Mark (< 1024px) */}
          <div className="lg:hidden shrink-0">
            <BrandLogo to="/dashboard" size="sm" showTagline={false} />
          </div>

          {/* Desktop Sidebar Toggle Button */}
          <button
            onClick={toggleSidebar}
            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isSidebarCollapsed ? (
              <PanelLeftOpen className="w-4 h-4 text-emerald-700" />
            ) : (
              <PanelLeftClose className="w-4 h-4 text-slate-500" />
            )}
          </button>

          {/* Contextual Breadcrumb & Page Title */}
          <div className="hidden sm:flex flex-col min-w-0 pl-1 border-l border-slate-200">
            <nav aria-label="Breadcrumb" className="flex items-center text-[11px] text-slate-400 font-medium">
              <span>{currentRouteMeta.category}</span>
              <span className="mx-1.5 text-slate-300">/</span>
              <span className="text-slate-600 truncate">{currentRouteMeta.title}</span>
            </nav>
            <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-tight truncate">
              {currentRouteMeta.title}
            </h1>
          </div>
        </div>

        {/* Right Utility Controls */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Connection Status Badge */}
          <div className="flex items-center">
            {isOnline ? (
              <Badge
                variant="emerald"
                size="sm"
                icon={<Wifi className="w-3 h-3 text-emerald-600" />}
                className="hidden xs:inline-flex"
              >
                Online {pendingQueueCount > 0 ? `(${pendingQueueCount})` : ''}
              </Badge>
            ) : (
              <Badge
                variant="amber"
                size="sm"
                icon={<WifiOff className="w-3 h-3 text-amber-600" />}
              >
                Offline {pendingQueueCount > 0 ? `(${pendingQueueCount})` : ''}
              </Badge>
            )}
          </div>

          {/* Language Switcher Dropdown */}
          <div className="relative flex items-center">
            <label htmlFor="topbar-language-select" className="sr-only">
              Select Language
            </label>
            <div className="relative">
              <select
                id="topbar-language-select"
                aria-label="Select Language"
                value={language}
                onChange={handleLanguageChange}
                className="appearance-none bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold py-1.5 pl-7 pr-3 rounded-xl border border-slate-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 transition-colors"
              >
                <option value="en">English</option>
                <option value="hi">हिंदी</option>
                <option value="mr">मराठी</option>
              </select>
              <Globe className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Voice Assistant Trigger */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setVoiceModalOpen(true)}
            className="border-emerald-300 text-emerald-800 hover:bg-emerald-50 hidden sm:inline-flex py-1.5 h-8 text-xs font-semibold rounded-xl"
            icon={<Mic className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />}
            aria-label="Open Voice Assistant"
          >
            Voice
          </Button>

          {/* Mobile Voice Icon Button (< sm) */}
          <button
            onClick={() => setVoiceModalOpen(true)}
            className="sm:hidden p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            aria-label="Open Voice Assistant"
          >
            <Mic className="w-4 h-4 text-emerald-600" />
          </button>

          {/* Settings Shortcut Button */}
          <Tooltip content="Settings & Local Cache" position="bottom">
            <Link
              to="/settings"
              className={cn(
                'p-1.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors hidden md:inline-flex focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
                location.pathname === '/settings' && 'text-emerald-700 bg-emerald-50'
              )}
              aria-label="Settings"
            >
              <Settings className="w-4.5 h-4.5" />
            </Link>
          </Tooltip>

          {/* User Profile Avatar / Chip */}
          <Link
            to="/settings"
            className="flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 transition-colors text-xs font-semibold text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            title={`Logged in as ${userProfile.name}`}
          >
            <div className="w-6 h-6 rounded-lg bg-forest-900 text-emerald-300 flex items-center justify-center font-bold text-[11px] shrink-0">
              {userProfile.name ? userProfile.name.charAt(0).toUpperCase() : <User className="w-3.5 h-3.5" />}
            </div>
            <span className="hidden md:inline truncate max-w-[100px]">
              {userProfile.name ? userProfile.name.split(' ')[0] : 'User'}
            </span>
          </Link>
        </div>
      </header>

      {/* Voice Assistant Modal */}
      <VoiceAssistantModal isOpen={voiceModalOpen} onClose={() => setVoiceModalOpen(false)} />
    </>
  );
};

