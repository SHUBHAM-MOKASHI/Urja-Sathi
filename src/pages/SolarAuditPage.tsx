import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { SolarScenarioComparisonChart } from '../components/charts/SolarScenarioComparisonChart';
import { SolarProductionChart } from '../components/charts/SolarProductionChart';
import { runSolarFeasibilityEngine } from '../services/solarEngine';
import { storageService } from '../services/storageService';
import { dbService } from '../services/db';
import { formatCurrency, formatKwh } from '../utils/formatters';
import { useNotification } from '../context/NotificationContext';
import { RoofOwnershipType } from '../types';
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
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const SolarAuditPage: React.FC = () => {
  const { showNotification } = useNotification();

  // Inputs
  const [monthlyUnits, setMonthlyUnits] = useState<number>(340);
  const [monthlyBill, setMonthlyBill] = useState<number>(2580);
  const [usableArea, setUsableArea] = useState<number>(350);
  const [roofOwnership, setRoofOwnership] = useState<RoofOwnershipType>('owned_individual');
  const [proposedCapacity, setProposedCapacity] = useState<number | ''>('');
  const [installerQuote, setInstallerQuote] = useState<number | ''>('');
  const [annualMaintenance, setAnnualMaintenance] = useState<number | ''>('');
  const [verifiedSubsidy, setVerifiedSubsidy] = useState<number | ''>('');
  const [isSubsidyVerified, setIsSubsidyVerified] = useState<boolean>(false);
  const [hasExistingInstallation, setHasExistingInstallation] = useState<boolean>(false);
  const [existingCapacityKw, setExistingCapacityKw] = useState<number>(3);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Auto-populate from most recent bill in IndexedDB
  useEffect(() => {
    storageService.getSavedBills().then((bills) => {
      if (bills.length > 0) {
        const latest = bills[0];
        if (latest.unitsConsumed > 0) {
          setMonthlyUnits(latest.unitsConsumed);
          setMonthlyBill(latest.totalAmount);
        }
      }
    });
  }, []);

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
      await dbService.saveAssessment({
        id: `solar_${Date.now()}`,
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
      });
      showNotification(
        'success',
        'Solar Feasibility Saved',
        `Decision "${solarResult.decisionTitle}" recorded in offline database.`
      );
    } catch {
      showNotification('error', 'Save Failed', 'Could not save assessment locally.');
    } finally {
      setIsSaving(false);
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
          <Button
            size="sm"
            variant="outline"
            onClick={handleSaveAssessment}
            isLoading={isSaving}
            icon={<CheckCircle className="w-4 h-4 text-emerald-600" />}
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

      {/* Grid: Inputs Panel on Left, Decision & Scenarios on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Inputs Column */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="p-5 space-y-5">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Compass className="w-4 h-4 text-emerald-600" />
              Property & Installation Inputs
            </h3>

            {/* Roof Ownership (Crucial Decision Filter) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Roof Ownership Status *
              </label>
              <select
                value={roofOwnership}
                onChange={(e) => setRoofOwnership(e.target.value as RoofOwnershipType)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="owned_individual">Individually Owned House / Terrace</option>
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
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
              <div className="flex justify-between text-[11px] text-slate-400 mt-0.5">
                <span>0 sq ft</span>
                <span>~100 sq ft per 1 kW</span>
                <span>1200+ sq ft</span>
              </div>
            </div>

            {/* Consumption & Bill */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Monthly Consumption (kWh)
                </label>
                <input
                  type="number"
                  min="0"
                  max="10000"
                  value={monthlyUnits}
                  onChange={(e) => setMonthlyUnits(Math.max(0, Number(e.target.value)))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Optional Specific Vendor Quotation */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Vendor Quotation & Financials (Optional)
              </span>

              <div className="grid grid-cols-2 gap-3 text-xs">
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
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-600 mb-1">Installer Quote (₹)</label>
                  <input
                    type="number"
                    placeholder="Auto (Benchmark)"
                    value={installerQuote}
                    onChange={(e) =>
                      setInstallerQuote(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-medium text-slate-600 mb-1">Maint. Expense (₹/yr)</label>
                  <input
                    type="number"
                    placeholder="Auto (~1% capex)"
                    value={annualMaintenance}
                    onChange={(e) =>
                      setAnnualMaintenance(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl"
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
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="subVer"
                  checked={isSubsidyVerified}
                  onChange={(e) => setIsSubsidyVerified(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <label htmlFor="subVer" className="text-xs text-slate-600 cursor-pointer">
                  Subsidy confirmed via National Portal / DISCOM sanction
                </label>
              </div>
            </div>

            {/* Existing Installation Toggle (Decision 3 Trigger) */}
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
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
              </div>

              {hasExistingInstallation && (
                <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80 text-xs space-y-1">
                  <label className="block font-semibold text-amber-950">Installed Solar Capacity (kW)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="50"
                    value={existingCapacityKw}
                    onChange={(e) => setExistingCapacityKw(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3 py-1.5 bg-white border border-amber-200 rounded-xl font-bold"
                  />
                  <p className="text-[11px] text-amber-900 mt-1">
                    Switches engine to plant diagnostic and yield review mode.
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Missing Information Audit Card */}
          <Card className="p-5 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Information Completeness Audit
            </h4>
            <div className="space-y-2">
              {solarResult.missingInformation.map((m, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-xl text-xs space-y-0.5 border ${
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
        </div>

        {/* Right Output & Decision Column */}
        <div className="lg:col-span-7 space-y-6">
          {/* PRIMARY DECISION CARD */}
          <Card
            variant={
              solarResult.decision === 'explore_solar'
                ? 'forest'
                : solarResult.decision === 'review_existing_installation'
                ? 'default'
                : 'default'
            }
            className="p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {solarResult.decision === 'explore_solar' && (
                  <Sun className="w-5 h-5 text-amber-400" />
                )}
                {solarResult.decision === 'save_without_solar' && (
                  <TrendingDown className="w-5 h-5 text-emerald-600" />
                )}
                {solarResult.decision === 'review_existing_installation' && (
                  <Wrench className="w-5 h-5 text-blue-600" />
                )}
                <span className="text-xs font-bold uppercase tracking-wider">
                  Engine Decision Recommendation
                </span>
              </div>
              <Badge
                variant={
                  solarResult.decision === 'explore_solar'
                    ? 'emerald'
                    : solarResult.decision === 'review_existing_installation'
                    ? 'blue'
                    : 'amber'
                }
                size="sm"
              >
                {solarResult.decision.replace(/_/g, ' ').toUpperCase()}
              </Badge>
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                {solarResult.decisionTitle}
              </h2>
              <p
                className={`text-xs sm:text-sm mt-2 leading-relaxed ${
                  solarResult.decision === 'explore_solar' ? 'text-emerald-100' : 'text-slate-600'
                }`}
              >
                {solarResult.decisionRationale}
              </p>
            </div>

            {/* Quick Metrics if Feasible */}
            {solarResult.decision === 'explore_solar' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-forest-800 text-xs text-white">
                <div>
                  <span className="text-emerald-300 text-[11px]">System Size</span>
                  <p className="font-bold text-base">{solarResult.recommendedCapacityKw} kW</p>
                </div>
                <div>
                  <span className="text-emerald-300 text-[11px]">Net Outlay</span>
                  <p className="font-bold text-base">{formatCurrency(solarResult.netInvestmentCostInr)}</p>
                </div>
                <div>
                  <span className="text-emerald-300 text-[11px]">Benchmark Payback</span>
                  <p className="font-bold text-base text-amber-300">
                    {solarResult.scenarios.central.simplePaybackYears} Years
                  </p>
                </div>
                <div>
                  <span className="text-emerald-300 text-[11px]">Annual Benefit</span>
                  <p className="font-bold text-base text-emerald-300">
                    {formatCurrency(solarResult.scenarios.central.annualNetBenefitInr)}/yr
                  </p>
                </div>
              </div>
            )}
          </Card>

          {/* THREE SCENARIOS COMPARISON CARDS */}
          {solarResult.decision === 'explore_solar' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Sensitivity Scenarios: Generation & Return Comparison
                  </h3>
                  <p className="text-xs text-slate-500">
                    Comparing Conservative, Central Benchmark, and High-Insolation conditions
                  </p>
                </div>
                <Badge variant="slate" size="sm">
                  3 Scenarios
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Conservative */}
                <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-2 text-xs shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700">Conservative</span>
                    <Badge variant="slate" size="sm">Low Solar</Badge>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-400">Annual Generation:</span>
                    <p className="font-bold text-slate-900 text-sm">
                      {formatKwh(solarResult.scenarios.conservative.annualGenerationKwh)}
                    </p>
                    <span className="text-[11px] text-slate-400">Annual Net Benefit:</span>
                    <p className="font-bold text-slate-800 text-sm">
                      {formatCurrency(solarResult.scenarios.conservative.annualNetBenefitInr)}
                    </p>
                    <span className="text-[11px] text-slate-400">Simple Payback:</span>
                    <p className="font-bold text-amber-700">
                      {solarResult.scenarios.conservative.simplePaybackYears
                        ? `${solarResult.scenarios.conservative.simplePaybackYears} Yrs`
                        : 'Unviable'}
                    </p>
                  </div>
                  <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                    1,300 kWh/kW/yr • 70% self-consumed • 1.0% degradation
                  </p>
                </div>

                {/* Central (Benchmark) */}
                <div className="p-4 bg-emerald-50/70 rounded-2xl border-2 border-emerald-500 space-y-2 text-xs shadow-subtle relative">
                  <div className="absolute -top-2.5 right-3 bg-emerald-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                    Benchmark
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-950">Central</span>
                    <Badge variant="emerald" size="sm">National Avg</Badge>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] text-emerald-800">Annual Generation:</span>
                    <p className="font-bold text-emerald-950 text-sm">
                      {formatKwh(solarResult.scenarios.central.annualGenerationKwh)}
                    </p>
                    <span className="text-[11px] text-emerald-800">Annual Net Benefit:</span>
                    <p className="font-bold text-emerald-900 text-sm">
                      {formatCurrency(solarResult.scenarios.central.annualNetBenefitInr)}
                    </p>
                    <span className="text-[11px] text-emerald-800">Simple Payback:</span>
                    <p className="font-bold text-emerald-900">
                      {solarResult.scenarios.central.simplePaybackYears
                        ? `${solarResult.scenarios.central.simplePaybackYears} Yrs`
                        : 'Unviable'}
                    </p>
                  </div>
                  <p className="text-[10px] text-emerald-700 pt-1 border-t border-emerald-200">
                    1,460 kWh/kW/yr • 80% self-consumed • 0.7% degradation
                  </p>
                </div>

                {/* Optimistic */}
                <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-2 text-xs shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700">Optimistic</span>
                    <Badge variant="amber" size="sm">High Sun</Badge>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-400">Annual Generation:</span>
                    <p className="font-bold text-slate-900 text-sm">
                      {formatKwh(solarResult.scenarios.optimistic.annualGenerationKwh)}
                    </p>
                    <span className="text-[11px] text-slate-400">Annual Net Benefit:</span>
                    <p className="font-bold text-slate-800 text-sm">
                      {formatCurrency(solarResult.scenarios.optimistic.annualNetBenefitInr)}
                    </p>
                    <span className="text-[11px] text-slate-400">Simple Payback:</span>
                    <p className="font-bold text-emerald-700">
                      {solarResult.scenarios.optimistic.simplePaybackYears
                        ? `${solarResult.scenarios.optimistic.simplePaybackYears} Yrs`
                        : 'Unviable'}
                    </p>
                  </div>
                  <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                    1,550 kWh/kW/yr • 90% self-consumed • 0.5% degradation
                  </p>
                </div>
              </div>

              {/* Scenarios Visual Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Scenario Comparison: Yield & Annual Returns</CardTitle>
                </CardHeader>
                <CardContent>
                  <SolarScenarioComparisonChart scenarios={solarResult.scenarios} />
                </CardContent>
              </Card>

              {/* 12-Month Production vs Load Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Simulated Monthly Generation vs Load</CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Monthly insolation curves vs domestic electricity consumption
                  </p>
                </CardHeader>
                <CardContent>
                  <SolarProductionChart
                    systemSizeKw={solarResult.recommendedCapacityKw}
                    monthlyAverageKwh={monthlyUnits}
                  />
                </CardContent>
              </Card>
            </div>
          )}

          {/* Suggested Next Steps */}
          <Card className="p-5 space-y-3">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Recommended Next Physical Steps
            </h4>
            <div className="space-y-2">
              {solarResult.suggestedNextSteps.map((step, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 text-xs text-slate-700 border border-slate-100"
                >
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold shrink-0 text-[11px]">
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </div>
              ))}
            </div>

            {solarResult.decision === 'explore_solar' && (
              <div className="pt-2 flex justify-end">
                <Link to="/workforce">
                  <Button size="sm" variant="primary">
                    Compare Verified Local Installers →
                  </Button>
                </Link>
              </div>
            )}
            {solarResult.decision === 'save_without_solar' && (
              <div className="pt-2 flex justify-end">
                <Link to="/savings">
                  <Button size="sm" variant="primary">
                    Explore Appliance Efficiency Upgrades →
                  </Button>
                </Link>
              </div>
            )}
          </Card>

          {/* Confirmed Facts vs Engineering Assumptions Table */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-2">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Home className="w-3.5 h-3.5 text-slate-500" />
                Confirmed User Facts:
              </span>
              <ul className="list-disc list-inside text-slate-600 space-y-1">
                {solarResult.confirmedFacts.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-2">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-slate-500" />
                Engineering Assumptions:
              </span>
              <ul className="list-disc list-inside text-slate-600 space-y-1">
                {solarResult.engineeringAssumptions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Legal Disclaimers Box */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-[11px] text-slate-500 space-y-1">
            <p className="font-bold text-slate-700 flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
              Statutory Disclaimers:
            </p>
            <ul className="list-disc list-inside space-y-0.5">
              {solarResult.disclaimers.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
