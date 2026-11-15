import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Wifi,
  WifiOff,
  Mic,
  Globe,
  Menu,
  X,
  ArrowRight,
  LayoutDashboard,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { BrandLogo } from '../common/BrandLogo';
import { VoiceAssistantModal } from '../voice/VoiceAssistantModal';
import { Language } from '../../types';

export const Navbar: React.FC = () => {
  const { isOnline, language, setLanguage, pendingQueueCount } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLanguage(e.target.value as Language);
  };

  const navLinks = [
    { label: 'Bill Decoder', path: '/bills' },
    { label: 'Solar Calculator', path: '/solar' },
    { label: 'Local Workers', path: '/workforce' },
    { label: 'Impact Tracker', path: '/impact' },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 transition-all select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & Tagline */}
          <div className="flex items-center gap-3">
            <BrandLogo to="/" size="md" showTagline={true} />
          </div>

          {/* Center Public Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="px-3 py-2 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right Action Icons & Controls */}
          <div className="flex items-center gap-2.5">
            {/* Offline Status Badge */}
            <div className="hidden sm:flex items-center">
              {isOnline ? (
                <Badge variant="emerald" size="sm" icon={<Wifi className="w-3 h-3 text-emerald-600" />}>
                  Online {pendingQueueCount > 0 ? `(${pendingQueueCount})` : ''}
                </Badge>
              ) : (
                <Badge variant="amber" size="sm" icon={<WifiOff className="w-3 h-3 text-amber-600" />}>
                  Offline Mode {pendingQueueCount > 0 ? `(${pendingQueueCount})` : ''}
                </Badge>
              )}
            </div>

            {/* Language Switcher */}
            <div className="relative flex items-center">
              <label htmlFor="landing-language-select" className="sr-only">
                Language
              </label>
              <div className="relative">
                <select
                  id="landing-language-select"
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
            >
              Voice
            </Button>

            {/* Mobile Voice Icon Button */}
            <button
              onClick={() => setVoiceModalOpen(true)}
              className="sm:hidden p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              aria-label="Open voice assistant"
            >
              <Mic className="w-4 h-4 text-emerald-600" />
            </button>

            {/* Launch App / Dashboard Primary CTA */}
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold shadow-sm hover:shadow-glow transition-all"
            >
              <span>Open Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            {/* Mobile Hamburger Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu for Landing Page */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-slate-200 bg-white px-4 pt-2 pb-4 space-y-2">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Connection
              </span>
              {isOnline ? (
                <Badge variant="emerald" size="sm" icon={<Wifi className="w-3 h-3 text-emerald-600" />}>
                  Online
                </Badge>
              ) : (
                <Badge variant="amber" size="sm" icon={<WifiOff className="w-3 h-3 text-amber-600" />}>
                  Offline
                </Badge>
              )}
            </div>

            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <span>{link.label}</span>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </Link>
            ))}

            <Link
              to="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 mt-2"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Launch Platform</span>
            </Link>
          </div>
        )}
      </header>

      {/* Voice Assistant Modal */}
      <VoiceAssistantModal isOpen={voiceModalOpen} onClose={() => setVoiceModalOpen(false)} />
    </>
  );
};
