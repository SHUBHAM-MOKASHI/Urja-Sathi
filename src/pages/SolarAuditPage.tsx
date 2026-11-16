import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { SolarScenarioComparisonChart } from '../components/charts/SolarScenarioComparisonChart';
import { SolarProductionChart } from '../components/charts/SolarProductionChart';
import { runSolarFeasibilityEngine } from '../services/solarEngine';
import { storageService } from '../services/storageService';
import { dbService } from '../services/db';
import { syncService } from '../services/syncService';
import { formatCurrency, formatKwh, formatDate, formatSavedSolarPayback } from '../utils/formatters';
import { useNotification } from '../context/NotificationContext';
import { useApp } from '../context/AppContext';
import { RoofOwnershipType, SolarAssessment } from '../types';
import {
  Sun,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Wrench,
  TrendingDown,
  Building,
  Home,
  CheckCircle,
  Compass,
  History,
  Trash2,
  FileText,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export const SolarAuditPage: React.FC = () => {
  const { showNotification } = useNotification();
  const { userProfile } = useApp();
  const location = useLocation();

  // Inputs
  const [monthlyUnits, setMonthlyUnits] = useState<number>(340);
  const [monthlyBill, setMonthlyBill] = useState<number>(2580);
  const [usableArea, setUsableArea] = useState<number>(350);
  const [roofOwnership, setRoofOwnership] = useState<RoofOwnershipType>('owned_individual');
  const [hasConfirmedBill, setHasConfirmedBill] = useState<boolean>(false);
  const [billPeriod, setBillPeriod] = useState<string>('');
  const [savedAssessments, setSavedAssessments] = useState<SolarAssessment[]>([]);
  const [isSavedModalOpen, setIsSavedModalOpen] = useState<boolean>(false);
  const [proposedCapacity, setProposedCapacity] = useState<number | ''>('');
  const [installerQuote, setInstallerQuote] = useState<number | ''>('');
  const [annualMaintenance, setAnnualMaintenance] = useState<number | ''>('');
  const [verifiedSubsidy, setVerifiedSubsidy] = useState<number | ''>('');
  const [isSubsidyVerified, setIsSubsidyVerified] = useState<boolean>(false);
  const [hasExistingInstallation, setHasExistingInstallation] = useState<boolean>(false);
  const [existingCapacityKw, setExistingCapacityKw] = useState<number>(3);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Auto-populate from location state if passed from Quotation Comparison
  useEffect(() => {
    if (location.state) {
      const state = location.state as {
        prefilledCapacityKw?: number;
        prefilledQuotationInr?: number;
        installerName?: string;
      };
      if (state.prefilledCapacityKw) {
        setProposedCapacity(state.prefilledCapacityKw);
      }
      if (state.prefilledQuotationInr) {
        setInstallerQuote(state.prefilledQuotationInr);
      }
      if (state.installerName) {
        showNotification(
          'info',
          'Quotation Loaded',
          `Loaded ${state.prefilledCapacityKw} kW quotation (${formatCurrency(state.prefilledQuotationInr || 0)}) from ${state.installerName}.`
        );
      }
    }
  }, [location.state, showNotification]);

  // Load stored assessments from IndexedDB
  const loadSavedAssessments = useCallback(async () => {
    try {
      const records = await dbService.getAllAssessments();
      const sorted = [...records].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setSavedAssessments(sorted);
    } catch (err) {
      console.warn('Could not load saved assessments:', err);
    }
  }, []);

  useEffect(() => {
    loadSavedAssessments();
  }, [loadSavedAssessments]);

  // If user profile explicitly disallows rooftop access, default to no_roof
  useEffect(() => {
    if (userProfile && userProfile.hasRooftopAccess === false) {
      setRoofOwnership('no_roof');
      setUsableArea(0);
    }
  }, [userProfile]);

  // Auto-populate from most recent confirmed bill in IndexedDB
  useEffect(() => {
    const fetchLatestBill = () => {
      storageService.getSavedBills().then((bills) => {
        if (bills.length > 0) {
          // Prefer non-sample bills if available
          const nonSample = bills.filter((b) => b.source !== 'sample');
          const latest = nonSample.length > 0 ? nonSample[0] : bills[0];
          if (latest.unitsConsumed > 0) {
            setMonthlyUnits(latest.unitsConsumed);
            setMonthlyBill(latest.totalAmount);
            setHasConfirmedBill(latest.source !== 'sample');
            setBillPeriod(latest.billMonth);
          }
        } else {
          setHasConfirmedBill(false);
          if (userProfile?.avgMonthlyBill && userProfile.avgMonthlyBill > 0) {
            setMonthlyBill(userProfile.avgMonthlyBill);
          }
        }
      });
    };

    fetchLatestBill();

    window.addEventListener('urja-bills-changed', fetchLatestBill);
    return () => {
      window.removeEventListener('urja-bills-changed', fetchLatestBill);
    };
  }, [userProfile]);

  // Run the Solar Feasibility Decision Engine
  const solarResult = useMemo(() => {
    return runSolarFeasibilityEngine({
      monthlyConsumptionKwh: monthlyUnits,
      monthlyElectricityBillInr: monthlyBill,
      usableRoofAreaSqFt: usableArea,
      roofOwnership,
      proposedSolarCapacityKw: typeof proposedCapacity === 'number' ? proposedCapacity : undefined,
      installationQuotationInr: typeof installerQuote === 'number' ? installerQuote : undefined,
      annualMaintenanceExpenditureInr: typeof annualMaintenance === 'number' ? annualMaintenance : undefined,
      applicableFinancialAssistanceInr: typeof verifiedSubsidy === 'number' ? verifiedSubsidy : undefined,
      isSubsidyVerified,
      hasExistingInstallation,
      existingInstallationKw: hasExistingInstallation ? existingCapacityKw : undefined,
    });
  }, [
    monthlyUnits,
    monthlyBill,
    usableArea,
    roofOwnership,
    proposedCapacity,
    installerQuote,
    annualMaintenance,
    verifiedSubsidy,
    isSubsidyVerified,
    hasExistingInstallation,
    existingCapacityKw,
  ]);

  const handleSaveAssessment = async () => {
    setIsSaving(true);
    try {
      const assessmentId = `solar_${Date.now()}`;
      const assessment = {
        id: assessmentId,
        rooftopAreaSqFt: usableArea,
        recommendedSystemSizeKw: solarResult.recommendedCapacityKw,
        totalEstimatedCost: solarResult.grossInvestmentCostInr,
        centralSubsidyAmount: solarResult.financialAssistanceInr,
        netCostAfterSubsidy: solarResult.netInvestmentCostInr,
        annualGenerationKwh: solarResult.scenarios.central.annualGenerationKwh,
        annualSavingsInr: solarResult.scenarios.central.annualNetBenefitInr,
        co2ReductionTonsPerYear: solarResult.co2ReductionTonsPerYear,
        paybackPeriodYears: solarResult.scenarios.central.simplePaybackYears || 0,
        twentyFiveYearSavingsInr: solarResult.scenarios.central.twentyFiveYearCumulativeSavingsInr,
        createdAt: new Date().toISOString(),
      };

      await dbService.saveAssessment(assessment);

      // Enqueue offline action for background sync idempotently
      const idempotencyKey = `idem_solar_assessment_${assessmentId}_create`;
      await syncService.enqueueOfflineAction(
        'solar_assessment',
        'create',
        assessment,
        idempotencyKey
      );

      await loadSavedAssessments();

      showNotification(
        'success',
        'Solar Feasibility Saved',
        `Decision "${solarResult.decisionTitle}" saved to local offline database and queued for synchronization.`
      );
    } catch {
      showNotification('error', 'Save Failed', 'Could not save assessment locally.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSavedAssessment = async (id: string) => {
    try {
      await dbService.deleteAssessment(id);
      await loadSavedAssessments();
      showNotification('info', 'Assessment Deleted', 'Feasibility record removed from local storage.');
    } catch {
      showNotification('error', 'Delete Failed', 'Could not delete assessment record.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Solar Feasibility Assistant
            </h1>
            <Badge variant="amber" size="sm" icon={<Sun className="w-3.5 h-3.5 text-amber-600" />}>
              Decision Support System
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Impartial solar decision evaluation supporting three pathways: Save Without Solar, Explore Solar, or Review Existing Installation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {savedAssessments.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsSavedModalOpen(true)}
              icon={<History className="w-4 h-4 text-emerald-600" />}
            >
              Saved Reports ({savedAssessments.length})
            </Button>
          )}
          <Button
            size="sm"
            variant="primary"
            onClick={handleSaveAssessment}
            isLoading={isSaving}
            icon={<CheckCircle className="w-4 h-4" />}
          >
            Save Feasibility Report
          </Button>
        </div>
      </div>

      {/* Safety & Legal Disclaimers Banner */}
      <div className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-4 text-xs text-amber-950 space-y-1">
        <div className="flex items-center gap-2 font-bold text-amber-900">
          <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
          <span>Safety & Impartiality Mandate:</span>
        </div>
        <p className="leading-relaxed text-amber-900/90">
          Financial yields are simulated engineering estimates and are <strong>never guaranteed</strong>. Government subsidy under PM Surya Ghar requires technical sanction and DISCOM approval. Roof structural safety and shadow interference cannot be certified online or from photographs — an on-site physical engineering inspection is strictly mandatory.
        </p>
      </div>

      {/* 2. HOUSEHOLD & ROOFTOP INPUTS (RESPONSIVE GRID) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Card: Property & Terrace Baseline */}
        <Card className="p-5 sm:p-6 space-y-5 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Compass className="w-4 h-4 text-emerald-600" />
              Property & Shadow-Free Terrace Baseline
            </h3>
            <Badge variant="slate" size="sm">Site Parameters</Badge>
          </div>

          {/* Roof Ownership (Crucial Decision Filter) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Roof Ownership Status *
            </label>
            <select
              value={roofOwnership}
              onChange={(e) => {
                const val = e.target.value as RoofOwnershipType;
                setRoofOwnership(val);
                if (val === 'no_roof') {
                  setUsableArea(0);
                } else if (usableArea === 0) {
                  setUsableArea(350);
                }
              }}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="owned_individual">Individually Owned House / Private Terrace</option>
              <option value="shared_apartment">Shared Apartment / Multi-story Society</option>
              <option value="tenant">Tenant / Rented Property (No Ownership)</option>
              <option value="no_roof">No Usable Roof Access</option>
            </select>
          </div>

          {/* Usable Roof Area */}
          <div>
            <div className="flex justify-between items-center text-xs font-semibold text-slate-700 mb-1">
              <span>Usable Shadow-Free Roof Area</span>
              <span className="text-emerald-800 font-bold">{usableArea} sq ft</span>
            </div>
            <input
              type="range"
              min="0"
              max="1200"
              step="25"
              value={usableArea}
              onChange={(e) => setUsableArea(Number(e.target.value))}
              disabled={roofOwnership === 'no_roof'}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600 disabled:opacity-50"
            />
            <div className="flex justify-between text-[11px] text-slate-400 mt-1">
              <span>0 sq ft</span>
              <span>~100 sq ft per 1 kW</span>
              <span>1200+ sq ft</span>
            </div>
          </div>

          {/* Consumption & Bill */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">Household Energy Baseline</span>
              {hasConfirmedBill ? (
                <Badge variant="emerald" size="sm" icon={<CheckCircle2 className="w-3 h-3 text-emerald-600" />}>
                  Confirmed Bill ({billPeriod})
                </Badge>
              ) : (
                <span className="text-[10px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 font-medium">
                  Manual Estimate • <Link to="/bills" className="underline font-bold hover:text-amber-950">Scan Bill</Link>
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Monthly Units (kWh)
                </label>
                <input
                  type="number"
                  min="0"
                  max="10000"
                  value={monthlyUnits}
                  onChange={(e) => setMonthlyUnits(Math.max(0, Number(e.target.value)))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Monthly Bill (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  max="200000"
                  value={monthlyBill}
                  onChange={(e) => setMonthlyBill(Math.max(0, Number(e.target.value)))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Existing Installation Toggle */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                Already have solar installed?
              </span>
              <input
                type="checkbox"
                id="hasSolar"
                checked={hasExistingInstallation}
                onChange={(e) => setHasExistingInstallation(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 cursor-pointer"
              />
            </div>

            {hasExistingInstallation && (
              <div className="p-3.5 bg-amber-50/70 rounded-2xl border border-amber-200/90 text-xs space-y-1.5">
                <label className="block font-semibold text-amber-950">Installed Solar Capacity (kW)</label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="50"
                  value={existingCapacityKw}
                  onChange={(e) => setExistingCapacityKw(Math.max(1, Number(e.target.value)))}
                  className="w-full px-3.5 py-2 bg-white border border-amber-200 rounded-xl font-bold text-slate-800"
                />
                <p className="text-[11px] text-amber-900">
                  Switches engine to plant diagnostic and yield review mode.
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Right Card: Turnkey Installer Quote & Subsidies */}
        <Card className="p-5 sm:p-6 space-y-5 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              Installer Quotes & Financial Customization
            </span>
            <Link
              to="/quotations"
              className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1"
            >
              Compare Vendor Bids →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-medium text-slate-600 mb-1">Proposed Capacity (kW)</label>
              <input
                type="number"
                step="0.5"
                min="1"
                max="50"
                placeholder="Auto (Recommended)"
                value={proposedCapacity}
                onChange={(e) =>
                  setProposedCapacity(e.target.value === '' ? '' : Number(e.target.value))
                }
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-600 mb-1">Installer Quote (₹)</label>
              <input
                type="number"
                placeholder="Auto (Benchmark Capex)"
                value={installerQuote}
                onChange={(e) =>
                  setInstallerQuote(e.target.value === '' ? '' : Number(e.target.value))
                }
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-600 mb-1">Annual Maintenance (₹/yr)</label>
              <input
                type="number"
                placeholder="Auto (~1% Capex)"
                value={annualMaintenance}
                onChange={(e) =>
                  setAnnualMaintenance(e.target.value === '' ? '' : Number(e.target.value))
                }
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-600 mb-1">Verified Subsidy (₹)</label>
              <input
                type="number"
                placeholder="Auto (PM Surya Ghar)"
                value={verifiedSubsidy}
                onChange={(e) =>
                  setVerifiedSubsidy(e.target.value === '' ? '' : Number(e.target.value))
                }
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="subVer"
                checked={isSubsidyVerified}
                onChange={(e) => setIsSubsidyVerified(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 cursor-pointer"
              />
              <label htmlFor="subVer" className="text-xs text-slate-600 cursor-pointer">
                Subsidy confirmed via National Portal / DISCOM sanction
              </label>
            </div>
            <Link
              to="/schemes"
              className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
            >
              Govt Schemes & DBT Guidance →
            </Link>
          </div>
        </Card>
      </div>

      {/* 3. THREE-WAY SOLAR DECISION (FULL WIDTH) */}
      <Card
        variant={
          solarResult.decision === 'explore_solar'
            ? 'forest'
            : 'default'
        }
        className="p-6 sm:p-8 space-y-5 shadow-premium"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {solarResult.decision === 'explore_solar' && (
              <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center border border-amber-400/30">
                <Sun className="w-6 h-6 text-amber-300" />
              </div>
            )}
            {solarResult.decision === 'save_without_solar' && (
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center border border-emerald-200">
                <TrendingDown className="w-6 h-6 text-emerald-700" />
              </div>
            )}
            {solarResult.decision === 'review_existing_installation' && (
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center border border-blue-200">
                <Wrench className="w-6 h-6 text-blue-700" />
              </div>
            )}
            <div>
              <span className={`text-[11px] font-bold uppercase tracking-wider block ${solarResult.decision === 'explore_solar' ? 'text-emerald-300' : 'text-slate-500'}`}>
                Feasibility Engine Recommendation
              </span>
              <span className={`text-xs font-semibold ${solarResult.decision === 'explore_solar' ? 'text-emerald-100' : 'text-slate-700'}`}>
                {solarResult.decision === 'explore_solar'
                  ? 'PM Surya Ghar: Muft Bijli Yojana Compatible'
                  : solarResult.decision === 'save_without_solar'
                  ? 'Energy Conservation Pathway (Zero Capex)'
                  : 'Installed Plant O&M & Net Metering Audit'}
              </span>
            </div>
          </div>

          <Badge
            variant={
              solarResult.decision === 'explore_solar'
                ? 'emerald'
                : solarResult.decision === 'review_existing_installation'
                ? 'blue'
                : 'amber'
            }
            size="md"
          >
            {solarResult.decision.replace(/_/g, ' ').toUpperCase()}
          </Badge>
        </div>

        <div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            {solarResult.decisionTitle}
          </h2>
          <p
            className={`text-xs sm:text-sm mt-2 leading-relaxed max-w-4xl ${
              solarResult.decision === 'explore_solar' ? 'text-emerald-100/90' : 'text-slate-600'
            }`}
          >
            {solarResult.decisionRationale}
          </p>
        </div>

        {/* Action CTAs for non-explore_solar */}
        {solarResult.decision === 'save_without_solar' && (
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200">
            <p className="text-xs text-slate-600">
              Solar is not economically or structurally viable for your profile right now. Focus on zero-cost behavioral habits and high-efficiency appliance retrofits.
            </p>
            <Link to="/savings">
              <Button size="sm" variant="primary" icon={<ArrowRight className="w-4 h-4" />}>
                Open Appliance Savings Planner
              </Button>
            </Link>
          </div>
        )}

        {solarResult.decision === 'review_existing_installation' && (
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200">
            <p className="text-xs text-slate-600">
              Your {existingCapacityKw} kW rooftop plant should produce approximately {Math.round(existingCapacityKw * 120)} kWh monthly. Ensure quarterly module washing and check inverter fault codes.
            </p>
            <Link to="/workforce">
              <Button size="sm" variant="primary" icon={<Wrench className="w-4 h-4" />}>
                Find Certified Solar Wireman for Inspection
              </Button>
            </Link>
          </div>
        )}
      </Card>

      {/* 4. FINANCIAL KPI SUMMARY (FULL WIDTH) */}
      {solarResult.decision === 'explore_solar' && (
        <div className="space-y-4 pt-1">
          {/* 6 Metric KPI Tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
              <span className="text-slate-400 text-[11px] font-medium block">Recommended Size</span>
              <p className="font-extrabold text-lg sm:text-xl text-slate-900 mt-1">
                {solarResult.recommendedCapacityKw} kW
              </p>
              <span className="text-[10px] text-slate-500">~{solarResult.recommendedCapacityKw * 100} sq ft roof</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
              <span className="text-slate-400 text-[11px] font-medium block">Benchmark Capex</span>
              <p className="font-extrabold text-lg sm:text-xl text-slate-900 mt-1">
                {formatCurrency(solarResult.grossInvestmentCostInr)}
              </p>
              <span className="text-[10px] text-slate-500">Turnkey estimate</span>
            </div>

            <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 shadow-xs">
              <span className="text-emerald-800 text-[11px] font-medium block">Central Subsidy</span>
              <p className="font-extrabold text-lg sm:text-xl text-emerald-700 mt-1">
                {formatCurrency(solarResult.financialAssistanceInr)}
              </p>
              <span className="text-[10px] text-emerald-600">PM Surya Ghar DBT</span>
            </div>

            <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 shadow-xs">
              <span className="text-emerald-800 text-[11px] font-medium block">Net Household Cost</span>
              <p className="font-extrabold text-lg sm:text-xl text-emerald-800 mt-1">
                {formatCurrency(solarResult.netInvestmentCostInr)}
              </p>
              <span className="text-[10px] text-emerald-600">After central grant</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
              <span className="text-slate-400 text-[11px] font-medium block">Simple Payback</span>
              <p className="font-extrabold text-lg sm:text-xl text-amber-700 mt-1">
                {solarResult.scenarios.central.simplePaybackYears} Years
              </p>
              <span className="text-[10px] text-slate-500">Central scenario</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
              <span className="text-slate-400 text-[11px] font-medium block">25-Yr Net Savings</span>
              <p className="font-extrabold text-lg sm:text-xl text-emerald-800 mt-1">
                {formatCurrency(solarResult.scenarios.central.twentyFiveYearCumulativeSavingsInr)}
              </p>
              <span className="text-[10px] text-slate-500">Cumulative return</span>
            </div>
          </div>

          {/* 3 Sensitivity Scenario Cards */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Sensitivity Scenarios: Generation & Return Comparison
                </h3>
                <p className="text-xs text-slate-500">
                  Engineering sensitivity modeling under Conservative, Central Benchmark, and High-Insolation conditions
                </p>
              </div>
              <Badge variant="slate" size="sm">3 Verified Scenarios</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Conservative */}
              <div className="p-5 bg-white rounded-2xl border border-slate-200/90 space-y-3 text-xs shadow-xs min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-sm">Conservative</span>
                  <Badge variant="slate" size="sm">Low Insolation</Badge>
                </div>
                <div className="space-y-2">
                  <div>
                    <span className="text-[11px] text-slate-400 block">Annual Generation:</span>
                    <p className="font-bold text-slate-900 text-base">
                      {formatKwh(solarResult.scenarios.conservative.annualGenerationKwh)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Annual Net Benefit:</span>
                    <p className="font-bold text-slate-800 text-base">
                      {formatCurrency(solarResult.scenarios.conservative.annualNetBenefitInr)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Simple Payback:</span>
                    <p className="font-bold text-amber-700 text-base">
                      {solarResult.scenarios.conservative.simplePaybackYears
                        ? `${solarResult.scenarios.conservative.simplePaybackYears} Years`
                        : 'Unviable'}
                    </p>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                  1,300 kWh/kW/yr • {(solarResult.scenarios.conservative.selfConsumptionRatio * 100).toFixed(1)}% self-consumed • 1.0% annual degradation
                </p>
              </div>

              {/* Central (Benchmark) */}
              <div className="p-5 bg-emerald-50/70 rounded-2xl border-2 border-emerald-500 space-y-3 text-xs shadow-subtle relative min-w-0">
                <div className="absolute -top-2.5 right-4 bg-emerald-600 text-white text-[10px] px-2.5 py-0.5 rounded-full font-bold shadow-xs">
                  National Benchmark
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-950 text-sm">Central Scenario</span>
                  <Badge variant="emerald" size="sm">National Avg</Badge>
                </div>
                <div className="space-y-2">
                  <div>
                    <span className="text-[11px] text-emerald-800 block">Annual Generation:</span>
                    <p className="font-bold text-emerald-950 text-base">
                      {formatKwh(solarResult.scenarios.central.annualGenerationKwh)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] text-emerald-800 block">Annual Net Benefit:</span>
                    <p className="font-bold text-emerald-900 text-base">
                      {formatCurrency(solarResult.scenarios.central.annualNetBenefitInr)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] text-emerald-800 block">Simple Payback:</span>
                    <p className="font-bold text-emerald-900 text-base">
                      {solarResult.scenarios.central.simplePaybackYears
                        ? `${solarResult.scenarios.central.simplePaybackYears} Years`
                        : 'Unviable'}
                    </p>
                  </div>
                </div>
                <p className="text-[11px] text-emerald-700 pt-2 border-t border-emerald-200">
                  1,460 kWh/kW/yr • {(solarResult.scenarios.central.selfConsumptionRatio * 100).toFixed(1)}% self-consumed • 0.7% annual degradation
                </p>
              </div>

              {/* Optimistic */}
              <div className="p-5 bg-white rounded-2xl border border-slate-200/90 space-y-3 text-xs shadow-xs min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-sm">Optimistic</span>
                  <Badge variant="amber" size="sm">High Sun Area</Badge>
                </div>
                <div className="space-y-2">
                  <div>
                    <span className="text-[11px] text-slate-400 block">Annual Generation:</span>
                    <p className="font-bold text-slate-900 text-base">
                      {formatKwh(solarResult.scenarios.optimistic.annualGenerationKwh)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Annual Net Benefit:</span>
                    <p className="font-bold text-slate-800 text-base">
                      {formatCurrency(solarResult.scenarios.optimistic.annualNetBenefitInr)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Simple Payback:</span>
                    <p className="font-bold text-emerald-700 text-base">
                      {solarResult.scenarios.optimistic.simplePaybackYears
                        ? `${solarResult.scenarios.optimistic.simplePaybackYears} Years`
                        : 'Unviable'}
                    </p>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                  1,550 kWh/kW/yr • {(solarResult.scenarios.optimistic.selfConsumptionRatio * 100).toFixed(1)}% self-consumed • 0.5% annual degradation
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. CHARTS (RESPONSIVE FULL-WIDTH SECTION) */}
      {solarResult.decision === 'explore_solar' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
          {/* Chart 1: 12-Month Generation vs Household Load */}
          <Card className="p-5 sm:p-6 space-y-3 min-w-0">
            <CardHeader className="p-0">
              <CardTitle>12-Month Simulated Solar Generation vs Load</CardTitle>
              <p className="text-xs text-slate-500">
                Simulated monthly insolation curve vs typical household seasonal electricity load
              </p>
            </CardHeader>
            <CardContent className="p-0 pt-2">
              <SolarProductionChart
                systemSizeKw={solarResult.recommendedCapacityKw}
                monthlyAverageKwh={monthlyUnits}
              />
            </CardContent>
          </Card>

          {/* Chart 2: Scenario Comparison Yield & Returns */}
          <Card className="p-5 sm:p-6 space-y-3 min-w-0">
            <CardHeader className="p-0">
              <CardTitle>Scenario Comparison: Yield & Annual Returns</CardTitle>
              <p className="text-xs text-slate-500">
                Comparative sensitivity returns across 10, 15, and 25-year lifetimes
              </p>
            </CardHeader>
            <CardContent className="p-0 pt-2">
              <SolarScenarioComparisonChart scenarios={solarResult.scenarios} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* 6. RISK WARNINGS & RECOMMENDED NEXT STEPS (FULL WIDTH) */}
      <div className="space-y-6 pt-2">
        {/* Missing Information Completeness Audit */}
        <Card className="p-5 sm:p-6 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Information Completeness Audit
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {solarResult.missingInformation.map((m, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-2xl text-xs space-y-1 border ${
                  m.importance === 'critical'
                    ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold">{m.message}</span>
                  <Badge variant={m.importance === 'critical' ? 'rose' : 'slate'} size="sm">
                    {m.importance}
                  </Badge>
                </div>
                <p className="text-[11px] opacity-90">Remedy: {m.remedy}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Recommended Physical Steps */}
        <Card className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Recommended Next Physical Steps
            </h4>
            <Badge variant="emerald" size="sm">Action Checklist</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {solarResult.suggestedNextSteps.map((step, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 text-xs text-slate-700 border border-slate-200/80"
              >
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold shrink-0 text-xs">
                  {idx + 1}
                </span>
                <span className="leading-relaxed pt-0.5">{step}</span>
              </div>
            ))}
          </div>

          {solarResult.decision === 'explore_solar' && (
            <div className="pt-2 flex flex-wrap justify-end gap-3 border-t border-slate-100">
              <Link to="/quotations">
                <Button size="sm" variant="primary" icon={<ArrowRight className="w-4 h-4" />}>
                  Compare Turnkey Vendor Quotations
                </Button>
              </Link>
              <Link to="/workforce">
                <Button size="sm" variant="outline" icon={<Wrench className="w-4 h-4" />}>
                  Find Certified Solar Wireman
                </Button>
              </Link>
            </div>
          )}
          {solarResult.decision === 'save_without_solar' && (
            <div className="pt-2 flex justify-end border-t border-slate-100">
              <Link to="/savings">
                <Button size="sm" variant="primary" icon={<ArrowRight className="w-4 h-4" />}>
                  Explore Appliance Efficiency Upgrades
                </Button>
              </Link>
            </div>
          )}
        </Card>

        {/* Confirmed Facts vs Engineering Assumptions Table */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          <div className="p-5 bg-white rounded-2xl border border-slate-200/90 space-y-3 shadow-xs">
            <span className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Home className="w-4 h-4 text-emerald-600" />
              Confirmed Household Facts
            </span>
            <ul className="list-disc list-inside text-slate-600 space-y-1.5 leading-relaxed">
              {solarResult.confirmedFacts.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-slate-200/90 space-y-3 shadow-xs">
            <span className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Building className="w-4 h-4 text-emerald-600" />
              Engineering & Policy Assumptions
            </span>
            <ul className="list-disc list-inside text-slate-600 space-y-1.5 leading-relaxed">
              {solarResult.engineeringAssumptions.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Statutory Disclaimers Box */}
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-xs text-slate-500 space-y-2">
          <p className="font-bold text-slate-700 flex items-center gap-1.5 text-xs">
            <HelpCircle className="w-4 h-4 text-slate-400" />
            Statutory & Legal Disclaimers:
          </p>
          <ul className="list-disc list-inside space-y-1 text-[11px] leading-relaxed">
            {solarResult.disclaimers.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Saved Assessments Modal */}
      <Modal
        isOpen={isSavedModalOpen}
        onClose={() => setIsSavedModalOpen(false)}
        title="Saved Solar Feasibility Assessments"
        description="Feasibility calculations and decision models saved locally in IndexedDB"
        maxWidth="3xl"
      >
        <div className="space-y-4 text-xs">
          {savedAssessments.length === 0 ? (
            <div className="py-8 text-center text-slate-500 space-y-2">
              <FileText className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-semibold">No saved solar assessments found.</p>
              <p className="text-slate-400">Click "Save Feasibility Report" on any solar evaluation to store it offline.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {savedAssessments.map((a) => (
                <div
                  key={a.id}
                  className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5 transition-all hover:bg-slate-50/80"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">
                        {a.recommendedSystemSizeKw} kW Recommended System
                      </span>
                      <Badge variant="emerald" size="sm">
                        {formatCurrency(a.netCostAfterSubsidy)} Net
                      </Badge>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {formatDate(a.createdAt)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-600 pt-1">
                    <div>
                      <span className="text-slate-400 block">Gross Cost:</span>
                      <span className="font-semibold text-slate-800">{formatCurrency(a.totalEstimatedCost)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Central Subsidy:</span>
                      <span className="font-semibold text-emerald-700">{formatCurrency(a.centralSubsidyAmount)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Annual Savings:</span>
                      <span className="font-semibold text-emerald-800">{formatCurrency(a.annualSavingsInr)}/yr</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Payback:</span>
                      <span className="font-semibold text-amber-700">{formatSavedSolarPayback(a.paybackPeriodYears, a.annualSavingsInr)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/70 text-[11px]">
                    <span className="text-slate-400 font-mono text-[10px]">
                      ID: {a.id}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteSavedAssessment(a.id)}
                      className="text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Record</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <Button variant="ghost" size="sm" onClick={() => setIsSavedModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
