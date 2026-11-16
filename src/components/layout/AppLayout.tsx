import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopUtilityBar } from './TopUtilityBar';
import { MobileDrawer } from './MobileDrawer';
import { Footer } from './Footer';
import { OfflineStatusBanner } from '../common/OfflineStatusBanner';

export const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-800 antialiased">
      {/* Mobile Navigation Drawer for screens < 1024px */}
      <MobileDrawer />

      {/* Desktop Left Sidebar (Collapsible 250px <-> 72px) */}
      <Sidebar />

      {/* Main Workspace Area (fills remaining viewport, min-w-0 prevents grid overflow) */}
      <div className="flex-1 flex flex-col min-w-0 w-full overflow-x-hidden">
        {/* Top Utility Bar (Breadcrumbs, connection status, language, voice, settings) */}
        <TopUtilityBar />

        {/* Offline & Queued Synchronization Alert Banner */}
        <OfflineStatusBanner />

        {/* Page Content Outlet with Fluid Sizing & Responsive Padding */}
        <main
          id="main-content"
          className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 max-w-7xl 2xl:max-w-[1536px] w-full mx-auto focus:outline-none"
        >
          <Outlet />
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
};
