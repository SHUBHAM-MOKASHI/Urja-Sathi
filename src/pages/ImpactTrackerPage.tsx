import React, { useState } from 'react';
import {
  TrendingUp,
  ShieldCheck,
  Printer,
  Users,
  Coins,
  FileCheck2,
  Zap,
  BarChart3,
  Calendar,
  Lock,
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

export const ImpactTrackerPage: React.FC = () => {
  const [adminData] = useState(() => getDemoAdminImpactData());
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'households' | 'workers'>('households');

  const {
    totalConsentingHouseholds,
    totalCompletedServices,
    totalActiveWorkers,
    totalDocumentedPaidAssignmentsInr,
    tripartiteSummary,
    monthlyTrajectory,
    householdFollowUpRecords,
    workerImpactRecords,
  } = adminData;

  return (
    <div className="space-y-8 pb-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
      {/* Top Banner: Hackathon Demonstration Data Tag */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-900 to-forest-900 p-4 sm:p-5 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-subtle border border-emerald-700/50">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-amber-300 fill-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-white text-sm sm:text-base tracking-tight">
                URJA SAATHI Impact & Verification Engine
              </span>
              <Badge variant="forest" size="sm">
                Live Audit Console
              </Badge>
            </div>
            <p className="text-xs text-emerald-200/90 mt-0.5">
              Demonstration Data — Simulated for Hackathon Audit Verification & Field Evaluation
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

      {/* Hero Header */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-emerald-100 text-emerald-900 border border-emerald-200">
            Har Ghar Bachat, Har Haath Kaam
          </span>
          <span className="text-xs text-slate-500 flex items-center gap-1 font-mono">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            Audit Cycle: Q3/Q4 FY 2025-26
          </span>
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
              icon={<FileCheck2 className="w-4 h-4" />}
            >
              Print / Save Dossier (PDF)
            </Button>
          </div>
        </div>
      </div>

      {/* Top 4 KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Consenting Households"
          value={`${totalConsentingHouseholds} Homes`}
          subtitle="100% DPDP Act Compliant"
          icon={<ShieldCheck className="w-5 h-5 text-emerald-600" />}
          trend={{ value: 'Consented', isPositive: true, label: 'Audit Ready' }}
        />
        <StatCard
          title="Completed Field Services"
          value={`${totalCompletedServices} Jobs`}
          subtitle="Assisted Interventions"
          icon={<FileCheck2 className="w-5 h-5 text-sky-600" />}
          trend={{ value: '+28 jobs', isPositive: true, label: 'This Month' }}
        />
        <StatCard
          title="Certified Active Workers"
          value={`${totalActiveWorkers} Specialists`}
          subtitle="Wiremen & Surya Mitras"
          icon={<Users className="w-5 h-5 text-indigo-600" />}
          trend={{ value: '100%', isPositive: true, label: 'Verified' }}
        />
        <StatCard
          title="Documented Paid Wages"
          value={`₹${totalDocumentedPaidAssignmentsInr.toLocaleString()}`}
          subtitle="Direct Local Livelihoods"
          icon={<Coins className="w-5 h-5 text-amber-600" />}
          trend={{ value: 'Receipted', isPositive: true, label: 'Vouchers' }}
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
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Strict segregation of empirical reality, engineering estimations, and pending potential
          </p>
        </div>

        <TripartiteImpactCards summary={tripartiteSummary} />
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

        <CommunityImpactCharts
          tripartiteSummary={tripartiteSummary}
          monthlyTrajectory={monthlyTrajectory}
        />
      </section>

      {/* TABBED AUDIT LEDGER SECTION */}
      <section className="space-y-4 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Lock className="w-5 h-5 text-emerald-700" />
              Empirical Audit Ledgers
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

      {/* Downloadable / Printable Report Modal */}
      <DownloadableImpactReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        dashboardData={adminData}
      />
    </div>
  );
};
