import React from 'react';
import { Zap, Heart, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-slate-200/80 text-slate-600 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-xs">
                <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
              </div>
              <span className="font-extrabold text-forest-900 tracking-tight text-lg">
                URJA SAATHI
              </span>
            </div>
            <p className="text-sm text-slate-500 max-w-sm">
              Offline-first, voice-assisted community energy savings platform. Built to make solar adoption and electricity savings accessible to every household in India.
            </p>
            <p className="text-xs text-emerald-800 font-semibold uppercase tracking-wider">
              Har Ghar Bachat, Har Haath Kaam
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3">
              Features
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/bills" className="hover:text-emerald-700 transition-colors">
                  Electricity Bill Decoder
                </Link>
              </li>
              <li>
                <Link to="/solar" className="hover:text-emerald-700 transition-colors">
                  PM Surya Ghar Calculator
                </Link>
              </li>
              <li>
                <Link to="/workforce" className="hover:text-emerald-700 transition-colors">
                  Verified Local Installers
                </Link>
              </li>
              <li>
                <Link to="/settings" className="hover:text-emerald-700 transition-colors">
                  Offline Sync & Cache
                </Link>
              </li>
            </ul>
          </div>

          {/* Standards & Trust */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3">
              Standards & Govt Schemes
            </h4>
            <ul className="space-y-2 text-sm text-slate-500">
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>BEE Star Rating Metrics</span>
              </li>
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>PM Surya Ghar Portal Scheme</span>
              </li>
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>NISE Surya Mitra Standards</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} URJA SAATHI. All rights reserved.</p>
          <div className="flex items-center gap-1">
            <span>Crafted with</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
            <span>for Clean Energy & Community Empowerment</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
