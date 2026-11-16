import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { LandingPage } from '../pages/LandingPage';
import { PageSkeleton } from '../components/common/PageSkeleton';

// Route-level lazy loading for performance and code-splitting
const DashboardPage = lazy(() =>
  import('../pages/DashboardPage').then((m) => ({ default: m.DashboardPage }))
);
const BillAnalyzerPage = lazy(() =>
  import('../pages/BillAnalyzerPage').then((m) => ({ default: m.BillAnalyzerPage }))
);
const SavingsPlannerPage = lazy(() =>
  import('../pages/SavingsPlannerPage').then((m) => ({ default: m.SavingsPlannerPage }))
);
const SolarAuditPage = lazy(() =>
  import('../pages/SolarAuditPage').then((m) => ({ default: m.SolarAuditPage }))
);
const QuotationComparisonPage = lazy(() =>
  import('../pages/QuotationComparisonPage').then((m) => ({ default: m.QuotationComparisonPage }))
);
const GovernmentSchemesPage = lazy(() =>
  import('../pages/GovernmentSchemesPage').then((m) => ({ default: m.GovernmentSchemesPage }))
);
const CommunityWorkforcePage = lazy(() =>
  import('../pages/CommunityWorkforcePage').then((m) => ({ default: m.CommunityWorkforcePage }))
);
const ImpactTrackerPage = lazy(() =>
  import('../pages/ImpactTrackerPage').then((m) => ({ default: m.ImpactTrackerPage }))
);
const SettingsPage = lazy(() =>
  import('../pages/SettingsPage').then((m) => ({ default: m.SettingsPage }))
);
const NotFoundPage = lazy(() =>
  import('../pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage }))
);

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Landing Page - Immediate load */}
      <Route path="/" element={<LandingPage />} />

      {/* Authenticated / Core Platform Routes inside AppLayout with Suspense fallback */}
      <Route element={<AppLayout />}>
        <Route
          path="/dashboard"
          element={
            <Suspense fallback={<PageSkeleton title="Loading Energy Dashboard" />}>
              <DashboardPage />
            </Suspense>
          }
        />
        <Route
          path="/bills"
          element={
            <Suspense fallback={<PageSkeleton title="Loading Electricity Bill Analyzer" />}>
              <BillAnalyzerPage />
            </Suspense>
          }
        />
        <Route
          path="/savings"
          element={
            <Suspense fallback={<PageSkeleton title="Loading Savings Planner" />}>
              <SavingsPlannerPage />
            </Suspense>
          }
        />
        <Route
          path="/solar"
          element={
            <Suspense fallback={<PageSkeleton title="Loading Solar Feasibility Audit" />}>
              <SolarAuditPage />
            </Suspense>
          }
        />
        <Route
          path="/solar-audit"
          element={
            <Suspense fallback={<PageSkeleton title="Loading Solar Feasibility Audit" />}>
              <SolarAuditPage />
            </Suspense>
          }
        />
        <Route
          path="/quotations"
          element={
            <Suspense fallback={<PageSkeleton title="Loading Quotation Comparison" />}>
              <QuotationComparisonPage />
            </Suspense>
          }
        />
        <Route
          path="/quotes"
          element={
            <Suspense fallback={<PageSkeleton title="Loading Quotation Comparison" />}>
              <QuotationComparisonPage />
            </Suspense>
          }
        />
        <Route
          path="/schemes"
          element={
            <Suspense fallback={<PageSkeleton title="Loading Government Schemes & DBT" />}>
              <GovernmentSchemesPage />
            </Suspense>
          }
        />
        <Route
          path="/guidance"
          element={
            <Suspense fallback={<PageSkeleton title="Loading Government Schemes & DBT" />}>
              <GovernmentSchemesPage />
            </Suspense>
          }
        />
        <Route
          path="/workforce"
          element={
            <Suspense fallback={<PageSkeleton title="Loading Community Workforce" />}>
              <CommunityWorkforcePage />
            </Suspense>
          }
        />
        <Route
          path="/impact"
          element={
            <Suspense fallback={<PageSkeleton title="Loading Impact & Feedback Tracker" />}>
              <ImpactTrackerPage />
            </Suspense>
          }
        />
        <Route
          path="/tracker"
          element={
            <Suspense fallback={<PageSkeleton title="Loading Impact & Feedback Tracker" />}>
              <ImpactTrackerPage />
            </Suspense>
          }
        />
        <Route
          path="/feedback"
          element={
            <Suspense fallback={<PageSkeleton title="Loading Impact & Feedback Tracker" />}>
              <ImpactTrackerPage />
            </Suspense>
          }
        />
        <Route
          path="/settings"
          element={
            <Suspense fallback={<PageSkeleton title="Loading Platform Settings" />}>
              <SettingsPage />
            </Suspense>
          }
        />
        <Route
          path="*"
          element={
            <Suspense fallback={<PageSkeleton title="Loading Page" />}>
              <NotFoundPage />
            </Suspense>
          }
        />
      </Route>
    </Routes>
  );
};
