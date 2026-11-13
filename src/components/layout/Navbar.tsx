import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Zap,
  Wifi,
  WifiOff,
  Mic,
  Globe,
  Menu,
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
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { VoiceAssistantModal } from '../voice/VoiceAssistantModal';
import { Language } from '../../types';

export const Navbar: React.FC = () => {
  const { isOnline, language, setLanguage, pendingQueueCount } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { label: 'Overview', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Bill Analyzer', path: '/bills', icon: FileSpreadsheet },
    { label: 'Savings Planner', path: '/savings', icon: Lightbulb },
    { label: 'Solar ROI', path: '/solar', icon: Sun },
    { label: 'Compare Quotes', path: '/quotations', icon: Scale },
    { label: 'Govt Schemes', path: '/schemes', icon: Landmark },
    { label: 'Local Workers', path: '/workforce', icon: Users },
    { label: 'Impact Tracker', path: '/impact', icon: TrendingUp },
  ];

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLanguage(e.target.value as Language);
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md border-b border-slate-200/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & Tagline */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-forest-900 via-forest-800 to-emerald-600 flex items-center justify-center text-white shadow-sm group-hover:shadow-glow transition-all">
                <Zap className="w-5 h-5 text-amber-300 fill-amber-300" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-extrabold tracking-tight text-forest-900 group-hover:text-emerald-700 transition-colors">
                  URJA SAATHI
                </span>
                <span className="text-[10px] font-semibold text-emerald-700 tracking-wider hidden sm:block uppercase">
                  Har Ghar Bachat, Har Haath Kaam
                </span>
              </div>
            </Link>
          </div>

          {/* Center Navigation Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-800 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Action Icons & Controls */}
          <div className="flex items-center gap-2.5">
            {/* Offline Status Badge */}
            <div className="hidden sm:flex items-center">
              {isOnline ? (
                <Badge variant="emerald" size="sm" icon={<Wifi className="w-3 h-3 text-emerald-600" />}>
                  Online {pendingQueueCount > 0 ? `(${pendingQueueCount} queued)` : ''}
                </Badge>
              ) : (
                <Badge variant="amber" size="sm" icon={<WifiOff className="w-3 h-3 text-amber-600" />}>
                  Offline Mode {pendingQueueCount > 0 ? `(${pendingQueueCount})` : ''}
                </Badge>
              )}
            </div>

            {/* Language Switcher */}
            <div className="relative flex items-center">
              <label htmlFor="language-select" className="sr-only">
                Language
              </label>
              <div className="relative">
                <select
                  id="language-select"
                  aria-label="Select Language"
                  value={language}
                  onChange={handleLanguageChange}
                  className="appearance-none bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold py-1.5 pl-7 pr-3 rounded-lg border border-slate-200 cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="en">English</option>
                  <option value="hi">हिंदी (Hindi)</option>
                  <option value="mr">मराठी (Marathi)</option>
                </select>
                <Globe className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Voice Assistant Trigger */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setVoiceModalOpen(true)}
              className="border-emerald-300 text-emerald-800 hover:bg-emerald-50 hidden sm:inline-flex"
              icon={<Mic className="w-4 h-4 text-emerald-600 animate-pulse" />}
            >
              Voice
            </Button>

            {/* Mobile Voice Icon Button */}
            <button
              onClick={() => setVoiceModalOpen(true)}
              className="sm:hidden p-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              aria-label="Open voice assistant"
            >
              <Mic className="w-5 h-5 text-emerald-600" />
            </button>

            {/* Settings link */}
            <Link
              to="/settings"
              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors hidden md:block"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </Link>

            {/* Mobile Hamburger Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-none"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-slate-200 bg-white px-4 pt-2 pb-4 space-y-2">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Connection Status
              </span>
              {isOnline ? (
                <Badge variant="emerald" size="sm" icon={<Wifi className="w-3 h-3 text-emerald-600" />}>
                  Synced
                </Badge>
              ) : (
                <Badge variant="amber" size="sm" icon={<WifiOff className="w-3 h-3 text-amber-600" />}>
                  Offline Mode Active
                </Badge>
              )}
            </div>

            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-800 font-semibold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                  {link.label}
                </Link>
              );
            })}

            <Link
              to="/settings"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 border-t border-slate-100 mt-2"
            >
              <Settings className="w-5 h-5 text-slate-400" />
              Settings & Offline Cache
            </Link>
          </div>
        )}
      </header>

      {/* Voice Assistant Modal */}
      <VoiceAssistantModal isOpen={voiceModalOpen} onClose={() => setVoiceModalOpen(false)} />
    </>
  );
};

