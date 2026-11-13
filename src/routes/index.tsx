import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { LandingPage } from '../pages/LandingPage';
import { DashboardPage } from '../pages/DashboardPage';
import { BillAnalyzerPage } from '../pages/BillAnalyzerPage';
import { SolarAuditPage } from '../pages/SolarAuditPage';
import { CommunityWorkforcePage } from '../pages/CommunityWorkforcePage';
import { SavingsPlannerPage } from '../pages/SavingsPlannerPage';
import { QuotationComparisonPage } from '../pages/QuotationComparisonPage';
import { GovernmentSchemesPage } from '../pages/GovernmentSchemesPage';
import { ImpactTrackerPage } from '../pages/ImpactTrackerPage';
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
        <Route path="/savings" element={<SavingsPlannerPage />} />
        <Route path="/solar" element={<SolarAuditPage />} />
        <Route path="/solar-audit" element={<SolarAuditPage />} />
        <Route path="/quotations" element={<QuotationComparisonPage />} />
        <Route path="/quotes" element={<QuotationComparisonPage />} />
        <Route path="/schemes" element={<GovernmentSchemesPage />} />
        <Route path="/guidance" element={<GovernmentSchemesPage />} />
        <Route path="/workforce" element={<CommunityWorkforcePage />} />
        <Route path="/impact" element={<ImpactTrackerPage />} />
        <Route path="/tracker" element={<ImpactTrackerPage />} />
        <Route path="/feedback" element={<ImpactTrackerPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};

