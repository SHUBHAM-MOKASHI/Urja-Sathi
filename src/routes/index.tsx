import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { LandingPage } from '../pages/LandingPage';
import { DashboardPage } from '../pages/DashboardPage';
import { BillAnalyzerPage } from '../pages/BillAnalyzerPage';
import { SolarAuditPage } from '../pages/SolarAuditPage';
import { CommunityWorkforcePage } from '../pages/CommunityWorkforcePage';
import { SettingsPage } from '../pages/SettingsPage';
import { NotFoundPage } from '../pages/NotFoundPage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Landing Page */}
      <Route path="/" element={<LandingPage />} />

      {/* Authenticated / Core Platform Routes inside AppLayout */}
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/bills" element={<BillAnalyzerPage />} />
        <Route path="/solar" element={<SolarAuditPage />} />
        <Route path="/workforce" element={<CommunityWorkforcePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};
