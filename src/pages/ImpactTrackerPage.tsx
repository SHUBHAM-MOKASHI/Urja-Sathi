import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  ShieldCheck,
  Printer,
  Users,
  Coins,
  FileCheck2,
  BarChart3,
  Calendar,
  Lock,
  Database,
  FlaskConical,
} from 'lucide-react';
import { getDemoAdminImpactData } from '../data/impactDemoData';
import { TripartiteImpactCards } from '../components/impact/TripartiteImpactCards';
import { CommunityImpactCharts } from '../components/impact/CommunityImpactCharts';
import { HouseholdFollowUpTable } from '../components/impact/HouseholdFollowUpTable';
import { WorkerEarningsRetentionTable } from '../components/impact/WorkerEarningsRetentionTable';
import { DownloadableImpactReportModal } from '../components/impact/DownloadableImpactReportModal';
import { StatCard } from '../components/common/StatCard';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { storageService } from '../services/storageService';
import { dbService } from '../services/db';
import { getLiveAdminImpactData } from '../services/impactTracker';
import {
  AdminImpactDashboardData,
  DetailedWorkerProfile,
  ServiceRequest,
  ApplianceInput,
} from '../types';

export const ImpactTrackerPage: React.FC = () => {
  // Mode Switch State: 'demo' for Demonstration Audit Data, 'live' for Live Local Records
  const [dataMode, setDataMode] = useState<'demo' | 'live'>('demo');
  const [demoData] = useState<AdminImpactDashboardData>(() => getDemoAdminImpactData());
  const [liveData, setLiveData] = useState<AdminImpactDashboardData | null>(null);
  const [isLoadingLive, setIsLoadingLive] = useState<boolean>(true);

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'households' | 'workers'>('households');

  // Load Live Data from Local Storage (IndexedDB / localStorage)
  useEffect(() => {
    let isMounted = true;

    const loadLiveData = async () => {
      setIsLoadingLive(true);
      try {
        // 1. Retrieve confirmed household bills
        const bills = await storageService.getSavedBills();

        // 2. Retrieve service requests
        let requests: ServiceRequest[] = [];
        try {
          requests = await dbService.getAllServiceRequests();
        } catch {
          const localReqs = localStorage.getItem('urja_saathi_requests');
          requests = localReqs ? JSON.parse(localReqs) : [];
        }

        // 3. Retrieve workers (DetailedWorkerProfile) from IndexedDB
        let workers: DetailedWorkerProfile[] = [];
        try {
          workers = await dbService.getDetailedWorkers();
        } catch {
          workers = [];
        }

        // 4. Retrieve user profile
        let profile = undefined;
        try {
          profile = await dbService.getUserProfile();
        } catch {
          // Ignore
        }

        // 5. Retrieve appliance inventory
        let appliances: ApplianceInput[] = [];
        try {
          appliances = await storageService.getApplianceInventory();
        } catch {
          appliances = [];
        }

        // Compile Live Admin Impact Dashboard Data
        const compiled = getLiveAdminImpactData(
          bills,
          requests,
          workers,
          profile,
          appliances
        );

        if (isMounted) {
          setLiveData(compiled);
          setIsLoadingLive(false);
        }
      } catch (err) {
        console.warn('Failed to compile live impact data:', err);
        if (isMounted) {
          setIsLoadingLive(false);
        }
      }
    };

    loadLiveData();

    // Re-fetch when appliance inventory, bills, service requests, or offline sync change
    const handleSync = () => loadLiveData();
    window.addEventListener('urja-appliance-inventory-changed', handleSync);
    window.addEventListener('urja-bills-changed', handleSync);
    window.addEventListener('urja-service-requests-changed', handleSync);
    window.addEventListener('urja-offline-queue-changed', handleSync);
    return () => {
      isMounted = false;
      window.removeEventListener('urja-appliance-inventory-changed', handleSync);
      window.removeEventListener('urja-bills-changed', handleSync);
      window.removeEventListener('urja-service-requests-changed', handleSync);
      window.removeEventListener('urja-offline-queue-changed', handleSync);
    };
  }, []);

  // Determine current active dataset
  const currentData: AdminImpactDashboardData =
    dataMode === 'demo'
      ? demoData
      : liveData || {
          totalConsentingHouseholds: 0,
          totalCompletedServices: 0,
          totalActiveWorkers: 0,
          totalDocumentedPaidAssignmentsInr: 0,
          householdFollowUpRecords: [],
          workerImpactRecords: [],
          tripartiteSummary: {
            measuredImpact: {
              totalVerifiedSavingsKwhMonthly: 0,
              totalVerifiedSavingsInrMonthly: 0,
              annualVerifiedSavingsInr: 0,
              verifiedHouseholdsCount: 0,
              verifiedWorkerEarningsInr: 0,
              basisOfCalculation: 'No live records found in local storage.',
            },
            estimatedImpact: {
              totalEstimatedSavingsKwhMonthly: 0,
              totalEstimatedSavingsInrMonthly: 0,
              annualEstimatedSavingsInr: 0,
              partiallyVerifiedHouseholdsCount: 0,
              basisOfCalculation: 'No live records found in local storage.',
            },
            potentialImpact: {
              totalPotentialSavingsKwhMonthly: 0,
              totalPotentialSavingsInrMonthly: 0,
              annualPotentialSavingsInr: 0,
              pendingActionCount: 0,
              basisOfCalculation: 'No live records found in local storage.',
            },
          },
          monthlyTrajectory: [],
          isDemonstrationData: false,
          lastAuditTimestamp: new Date().toISOString(),
        };

  const {
    totalConsentingHouseholds,
    totalCompletedServices,
    totalActiveWorkers,
    totalDocumentedPaidAssignmentsInr,
    tripartiteSummary,
    monthlyTrajectory,
    householdFollowUpRecords,
    workerImpactRecords,
  } = currentData;

  const isLiveEmpty =
    dataMode === 'live' &&
    !isLoadingLive &&
    householdFollowUpRecords.length === 0 &&
    totalCompletedServices === 0;

  return (
    <div className="space-y-8 pb-12">
      {/* Top Banner: Mode Indicator & Export */}
      <div
        className={`rounded-2xl p-4 sm:p-5 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-subtle border transition-colors ${
          dataMode === 'demo'
            ? 'bg-gradient-to-r from-amber-900 via-stone-900 to-forest-900 border-amber-700/50'
            : 'bg-gradient-to-r from-emerald-900 to-forest-900 border-emerald-700/50'
        }`}
      >
        <div className="flex items-center gap-3.5">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
              dataMode === 'demo'
                ? 'bg-amber-500/20 border-amber-400/30'
                : 'bg-emerald-500/20 border-emerald-400/30'
            }`}
          >
            {dataMode === 'demo' ? (
              <FlaskConical className="w-5 h-5 text-amber-300" />
            ) : (
              <Database className="w-5 h-5 text-emerald-300" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-white text-sm sm:text-base tracking-tight">
                URJA SAATHI Impact & Verification Engine
              </span>
              {dataMode === 'demo' ? (
                <Badge variant="amber" size="sm">
                  SAMPLE / DEMONSTRATION
                </Badge>
              ) : (
                <Badge variant="emerald" size="sm">
                  LIVE LOCAL DATA
                </Badge>
              )}
            </div>
            <p className="text-xs text-emerald-100/90 mt-0.5">
              {dataMode === 'demo'
                ? 'Demonstration Data — Simulated for Hackathon Audit Verification & Field Evaluation'
                : 'Live Local Records — Empirically Audited from your Local IndexedDB Archive'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsReportModalOpen(true)}
            icon={<Printer className="w-4 h-4" />}
            className="bg-white/10 hover:bg-white/20 text-white border-white/20"
          >
            Export Audit Report
          </Button>
        </div>
      </div>

      {/* Hero Header & Mode Switcher */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-emerald-100 text-emerald-900 border border-emerald-200">
              Har Ghar Bachat, Har Haath Kaam
            </span>
            <span className="text-xs text-slate-500 flex items-center gap-1 font-mono">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Audit Cycle: Q3/Q4 FY 2025-26
            </span>
          </div>

          {/* MODE TOGGLE SWITCH */}
          <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200/90 shadow-inner">
            <button
              type="button"
              onClick={() => setDataMode('demo')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                dataMode === 'demo'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span>Demonstration Audit Data</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono uppercase ${
                  dataMode === 'demo' ? 'bg-amber-800 text-amber-100' : 'bg-slate-200 text-slate-600'
                }`}
              >
                Sample
              </span>
            </button>
            <button
              type="button"
              onClick={() => setDataMode('live')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                dataMode === 'live'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Live Local Records</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono uppercase ${
                  dataMode === 'live' ? 'bg-emerald-900 text-emerald-200' : 'bg-slate-200 text-slate-600'
                }`}
              >
                Audited
              </span>
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Savings-to-Skills Feedback & Impact Tracker
            </h1>
            <p className="text-sm text-slate-600 max-w-3xl leading-relaxed mt-1">
              Tracking whether clean-energy intelligence leads to genuine real-world outcomes.
              We empirically measure kilowatt-hour reductions from OCR utility bills and verify
              direct wage disbursements to local certified technicians—without inflated greenwashing.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <Button
              variant="primary"
              size="md"
              onClick={() => setIsReportModalOpen(true)}
              icon={<FileCheck2 className="w-4 h-4 text-emerald-100" />}
            >
              Print / Save Dossier (PDF)
            </Button>
          </div>
        </div>
      </div>

      {/* LIVE EMPTY STATE (Shown only in live mode when no records exist) */}
      {isLiveEmpty ? (
        <div className="p-8 sm:p-10 bg-white rounded-3xl border border-slate-200/90 shadow-subtle text-center space-y-6 max-w-3xl mx-auto">
          <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-center mx-auto text-emerald-700 shadow-xs">
            <Database className="w-8 h-8" />
          </div>

          <div className="space-y-2 max-w-xl mx-auto">
            <div className="flex items-center justify-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                No Live Records in Local Storage
              </h2>
              <Badge variant="emerald" size="sm">
                LIVE LOCAL DATA
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Live mode strictly measures outcomes from your locally saved electricity bills and
              completed community service requests. To prevent greenwashing, URJA SAATHI{' '}
              <strong className="text-slate-900 font-semibold">never fabricates</strong> fake
              consumption drops or worker earnings when no live records exist.
            </p>
          </div>

          {/* Guide Steps */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left pt-2">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-2">
              <div className="w-7 h-7 bg-emerald-100 text-emerald-800 rounded-lg flex items-center justify-center text-xs font-bold">
                1
              </div>
              <h4 className="text-xs font-bold text-slate-800">Scan Electricity Bills</h4>
              <p className="text-[11px] text-slate-500 leading-normal">
                Upload at least two monthly bills to track verified kilowatt-hour reductions.
              </p>
              <Link to="/bills" className="block pt-1">
                <Button size="sm" variant="outline" className="w-full text-xs">
                  Scan Bill →
                </Button>
              </Link>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-2">
              <div className="w-7 h-7 bg-amber-100 text-amber-800 rounded-lg flex items-center justify-center text-xs font-bold">
                2
              </div>
              <h4 className="text-xs font-bold text-slate-800">Savings Planner</h4>
              <p className="text-[11px] text-slate-500 leading-normal">
                Configure your appliances to generate engineering savings and potential pipeline.
              </p>
              <Link to="/savings" className="block pt-1">
                <Button size="sm" variant="outline" className="w-full text-xs">
                  Configure →
                </Button>
              </Link>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-2">
              <div className="w-7 h-7 bg-sky-100 text-sky-800 rounded-lg flex items-center justify-center text-xs font-bold">
                3
              </div>
              <h4 className="text-xs font-bold text-slate-800">Community Services</h4>
              <p className="text-[11px] text-slate-500 leading-normal">
                Book and complete energy services to record verified worker wage disbursements.
              </p>
              <Link to="/workforce" className="block pt-1">
                <Button size="sm" variant="outline" className="w-full text-xs">
                  Services →
                </Button>
              </Link>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-3">
            <span className="text-xs text-slate-500">Want to explore verified audit metrics?</span>
            <button
              type="button"
              onClick={() => setDataMode('demo')}
              className="text-xs font-bold text-amber-700 hover:text-amber-800 underline"
            >
              Switch to Demonstration Audit Data →
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Top 4 KPI Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <StatCard
              title="Consenting Households"
              value={`${totalConsentingHouseholds} Homes`}
              subtitle={dataMode === 'demo' ? 'DPDP Consent Logged' : 'Local Consented Homes'}
              icon={<ShieldCheck className="w-5 h-5 text-emerald-600" />}
              trend={{
                value: dataMode === 'demo' ? 'Consented' : 'Audited',
                isPositive: true,
                label: dataMode === 'demo' ? 'Audit Ready' : 'Local DB',
              }}
            />
            <StatCard
              title="Completed Field Services"
              value={`${totalCompletedServices} Jobs`}
              subtitle={dataMode === 'demo' ? 'Assisted Interventions' : 'Completed Assignments'}
              icon={<FileCheck2 className="w-5 h-5 text-sky-600" />}
              trend={{
                value: dataMode === 'demo' ? '+28 jobs' : `${totalCompletedServices} Jobs`,
                isPositive: true,
                label: dataMode === 'demo' ? 'This Month' : 'Total Audited',
              }}
            />
            <StatCard
              title="Certified Active Workers"
              value={`${totalActiveWorkers} Specialists`}
              subtitle={dataMode === 'demo' ? 'Wiremen & Surya Mitras' : 'Registered Technicians'}
              icon={<Users className="w-5 h-5 text-indigo-600" />}
              trend={{
                value: dataMode === 'demo' ? '100%' : `${totalActiveWorkers} Active`,
                isPositive: true,
                label: 'Verified',
              }}
            />
            <StatCard
              title="Documented Paid Wages"
              value={`₹${totalDocumentedPaidAssignmentsInr.toLocaleString()}`}
              subtitle={dataMode === 'demo' ? 'Direct Local Livelihoods' : 'Empirical Wage Receipts'}
              icon={<Coins className="w-5 h-5 text-amber-600" />}
              trend={{
                value: dataMode === 'demo' ? 'Receipted' : 'Receipted',
                isPositive: true,
                label: 'Vouchers',
              }}
            />
          </div>

          {/* MANDATORY TRIPARTITE IMPACT SECTION */}
          <section className="space-y-4">
            <div className="border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-700" />
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  Tripartite Impact Framework
                </h2>
                {dataMode === 'demo' ? (
                  <Badge variant="amber" size="sm">
                    SAMPLE
                  </Badge>
                ) : (
                  <Badge variant="emerald" size="sm">
                    LIVE
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Strict segregation of empirical reality, engineering estimations, and pending potential
              </p>
            </div>

            <TripartiteImpactCards
              summary={tripartiteSummary}
              isDemonstrationData={dataMode === 'demo'}
            />
          </section>

          {/* COMMUNITY OUTCOME CHARTS */}
          <section className="space-y-4 pt-4">
            <div className="border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-700" />
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  Community Outcome Trajectory & Livelihoods
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Visualizing energy conservation milestones and direct local economic multiplier effects
              </p>
            </div>

            {monthlyTrajectory.length === 0 ? (
              <div className="p-8 bg-slate-50 rounded-2xl border border-slate-200/80 text-center text-xs text-slate-500 space-y-1">
                <p className="font-semibold text-slate-700">Trajectory Timeline Awaiting Multi-Month Billing History</p>
                <p>Monthly outcome curves are generated when multiple consecutive billing cycles are recorded.</p>
              </div>
            ) : (
              <CommunityImpactCharts
                tripartiteSummary={tripartiteSummary}
                monthlyTrajectory={monthlyTrajectory}
              />
            )}
          </section>

          {/* TABBED AUDIT LEDGER SECTION */}
          <section className="space-y-4 pt-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <Lock className="w-5 h-5 text-emerald-700" />
                  Empirical Audit Ledgers
                  {dataMode === 'demo' ? (
                    <Badge variant="amber" size="sm">
                      SAMPLE AUDIT
                    </Badge>
                  ) : (
                    <Badge variant="emerald" size="sm">
                      LIVE AUDIT
                    </Badge>
                  )}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Audited evidence trails citing specific utility bill IDs, receipts, and credential verification
                </p>
              </div>

              {/* Tab Selector */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab('households')}
                  className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                    activeTab === 'households'
                      ? 'bg-white text-emerald-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>Household Follow-Up Audit</span>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.2 rounded-full">
                    {householdFollowUpRecords.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('workers')}
                  className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                    activeTab === 'workers'
                      ? 'bg-white text-emerald-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>Worker Livelihoods & Retention</span>
                  <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.2 rounded-full">
                    {workerImpactRecords.length}
                  </span>
                </button>
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'households' ? (
              <HouseholdFollowUpTable records={householdFollowUpRecords} />
            ) : (
              <WorkerEarningsRetentionTable workers={workerImpactRecords} />
            )}
          </section>
        </>
      )}

      {/* Downloadable / Printable Report Modal */}
      <DownloadableImpactReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        dashboardData={currentData}
      />
    </div>
  );
};
