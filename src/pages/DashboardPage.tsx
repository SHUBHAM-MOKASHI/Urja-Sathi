import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Zap,
  Sun,
  PlusCircle,
  ArrowUpRight,
  Lightbulb,
  FileText,
  Calendar,
  AlertCircle,
  Sparkles,
  Scale,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import { StatCard } from '../components/common/StatCard';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { EnergyTrendsChart } from '../components/charts/EnergyTrendsChart';
import { formatCurrency, formatKwh } from '../utils/formatters';
import { useApp } from '../context/AppContext';
import { dbService } from '../services/db';
import { storageService } from '../services/storageService';
import { runEnergySavingsEngine } from '../services/energyEngine';
import { ElectricityBill, ApplianceInput } from '../types';

export const DashboardPage: React.FC = () => {
  const { userProfile, isOffline } = useApp();
  const [bills, setBills] = useState<ElectricityBill[]>([]);
  const [appliances, setAppliances] = useState<ApplianceInput[]>([]);
  const [isLoadingInventory, setIsLoadingInventory] = useState<boolean>(true);

  // Load stored bills
  useEffect(() => {
    let isMounted = true;
    const loadStoredBills = async () => {
      try {
        const stored = await dbService.getAllBills();
        if (isMounted) {
          if (stored.length > 0) {
            // Sort chronological oldest to newest for trends
            const sorted = [...stored].sort(
              (a, b) =>
                new Date(a.billDate || a.createdAt || 0).getTime() -
                new Date(b.billDate || b.createdAt || 0).getTime()
            );
            setBills(sorted);
          } else {
            setBills([]);
          }
        }
      } catch (err) {
        console.warn('Could not read from IndexedDB:', err);
        if (isMounted) setBills([]);
      }
    };

    loadStoredBills();

    // Listen for bill updates (added, edited, deleted)
    const handleBillsChanged = () => {
      loadStoredBills();
    };

    window.addEventListener('urja-bills-changed', handleBillsChanged);
    return () => {
      isMounted = false;
      window.removeEventListener('urja-bills-changed', handleBillsChanged);
    };
  }, []);

  // Load shared appliance inventory from IndexedDB / cachedSettings
  useEffect(() => {
    let isMounted = true;
    const loadInventory = async () => {
      try {
        const stored = await storageService.getApplianceInventory();
        if (isMounted) {
          setAppliances(stored || []);
          setIsLoadingInventory(false);
        }
      } catch (err) {
        console.warn('Could not load appliance inventory on dashboard:', err);
        if (isMounted) {
          setAppliances([]);
          setIsLoadingInventory(false);
        }
      }
    };

    loadInventory();

    // Listen for real-time inventory updates from Savings Planner
    const handleInventoryChanged = (e: Event) => {
      const customEvent = e as CustomEvent<ApplianceInput[]>;
      if (customEvent.detail && Array.isArray(customEvent.detail) && isMounted) {
        setAppliances(customEvent.detail);
      } else {
        loadInventory();
      }
    };

    window.addEventListener('urja-appliance-inventory-changed', handleInventoryChanged);
    return () => {
      isMounted = false;
      window.removeEventListener('urja-appliance-inventory-changed', handleInventoryChanged);
    };
  }, []);

  const latestBill = bills.length > 0 ? bills[bills.length - 1] : null;
  const previousBill = bills.length > 1 ? bills[bills.length - 2] : null;

  const consumptionChangePercent =
    latestBill && previousBill && previousBill.unitsConsumed > 0
      ? (((latestBill.unitsConsumed - previousBill.unitsConsumed) / previousBill.unitsConsumed) * 100).toFixed(1)
      : '0';

  const isConsumptionDown = Number(consumptionChangePercent) <= 0;

  // Run the deterministic Energy Savings Intelligence Engine using the shared appliance inventory
  const engineResult = useMemo(() => {
    if (appliances.length === 0 || !latestBill || latestBill.unitsConsumed <= 0) {
      return null;
    }

    return runEnergySavingsEngine({
      billedUnitsKwh: latestBill.unitsConsumed,
      billAmountInr: latestBill.totalAmount,
      householdMembers: 4,
      userBudgetInr: 5000,
      appliances,
    });
  }, [latestBill, appliances]);

  const topRecommendations = engineResult?.recommendations.slice(0, 3) || [];

  return (
    <div className="space-y-6 text-left">
      {/* 1. Welcome Header (Clean single CTA without button clutter) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-subtle">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {userProfile.name ? `Namaste, ${userProfile.name}` : 'Welcome to URJA SAATHI'}
            </h1>
            <Badge variant="live" size="sm">
              Live Household
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            {userProfile.discomName || 'MPPKVVCL'} • Pincode {userProfile.pincode || '452001'} • Sanctioned Load: {userProfile.sanctionedLoadKw || 3} kW
          </p>
        </div>

        {/* Single Prominent Primary Action */}
        <div className="flex items-center gap-2">
          <Link to="/bills">
            <Button
              size="md"
              variant="primary"
              className="shadow-xs font-semibold"
              icon={<PlusCircle className="w-4 h-4" />}
            >
              {latestBill ? 'Scan New Electricity Bill' : 'Scan First Electricity Bill'}
            </Button>
          </Link>
        </div>
      </div>

      {/* Offline Alert Banner (Shown when disconnected) */}
      {isOffline && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-center gap-3 text-amber-950 text-xs shadow-xs">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <div className="flex-1">
            <span className="font-bold">Offline Mode Active.</span> All savings calculations, OCR scanning, and local bill archives remain fully functional on this device.
          </div>
        </div>
      )}

      {/* 2. Primary KPI Cards (Strictly prioritized hierarchy) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Latest Consumption */}
        <StatCard
          title="Latest Consumption"
          value={latestBill ? formatKwh(latestBill.unitsConsumed) : '—'}
          icon={<Zap className="w-5 h-5" />}
          variant="emerald"
          trend={
            latestBill && previousBill
              ? {
                  value: `${Math.abs(Number(consumptionChangePercent))}%`,
                  isPositive: isConsumptionDown,
                  label: 'vs previous bill',
                }
              : undefined
          }
          subtitle={latestBill ? `Billing Month: ${latestBill.billMonth}` : 'No electricity bills recorded'}
        />

        {/* KPI 2: Latest Bill Amount */}
        <StatCard
          title="Latest Bill Amount"
          value={latestBill ? formatCurrency(latestBill.totalAmount) : '—'}
          icon={<FileText className="w-5 h-5" />}
          subtitle={latestBill ? `Due: ${latestBill.dueDate || 'Paid'}` : 'Scan bill to view amount'}
        />

        {/* KPI 3: Estimated Savings Opportunity */}
        <StatCard
          title="Identified Savings"
          value={
            engineResult && engineResult.status === 'success'
              ? formatCurrency(engineResult.potentialMonthlyInrSavings)
              : '—'
          }
          icon={<Sparkles className="w-5 h-5 text-amber-600" />}
          variant="amber"
          subtitle={
            engineResult && engineResult.status === 'success'
              ? `Estimated save up to ${formatKwh(engineResult.potentialMonthlyKwhSavings)} / mo`
              : appliances.length === 0
              ? 'Configure appliances in planner'
              : !latestBill
              ? 'Scan bill to calculate savings'
              : 'Add confirmed bill units'
          }
        />

        {/* KPI 4: Solar Readiness & Subsidy Opportunity */}
        <StatCard
          title="Solar Subsidy Sizing"
          value="Up to ₹78,000"
          icon={<Sun className="w-5 h-5 text-amber-500" />}
          variant="emerald"
          subtitle={
            userProfile.hasRooftopAccess
              ? 'Rooftop access confirmed • Sizing ready'
              : 'Evaluate rooftop suitability'
          }
        />
      </div>

      {/* 3. Dedicated Compact Quick Actions Toolbar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-subtle flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 pl-2">
          Quick Actions:
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/bills">
            <Button size="sm" variant="outline" className="text-xs" icon={<FileText className="w-3.5 h-3.5 text-emerald-600" />}>
              Scan Bill
            </Button>
          </Link>
          <Link to="/savings">
            <Button size="sm" variant="outline" className="text-xs" icon={<Lightbulb className="w-3.5 h-3.5 text-emerald-600" />}>
              Savings Planner
            </Button>
          </Link>
          <Link to="/solar">
            <Button size="sm" variant="outline" className="text-xs" icon={<Sun className="w-3.5 h-3.5 text-amber-500" />}>
              Solar Evaluation
            </Button>
          </Link>
          <Link to="/quotations">
            <Button size="sm" variant="outline" className="text-xs" icon={<Scale className="w-3.5 h-3.5 text-emerald-600" />}>
              Compare Quotes
            </Button>
          </Link>
        </div>
      </div>

      {/* 4. Main Analytics & Insights Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Consumption Trend Chart (8 cols) */}
        <Card className="lg:col-span-8">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle>Electricity Consumption Trends</CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Multi-month billing history (kWh) and seasonal slab threshold analysis
              </p>
            </div>
            {bills.some((b) => b.source === 'sample') ? (
              <Badge variant="demo" size="sm">
                Demonstration Data
              </Badge>
            ) : bills.length > 0 ? (
              <Badge variant="verified" size="sm">
                {bills.length} Verified {bills.length > 1 ? 'Bills' : 'Bill'}
              </Badge>
            ) : null}
          </CardHeader>
          <CardContent>
            {bills.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <FileText className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-700">No electricity bills saved yet</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                  Scan your electricity bill using client-side OCR to view multi-month consumption trends and decode telescopic tariff slabs.
                </p>
                <Link to="/bills">
                  <Button size="sm" variant="primary" icon={<PlusCircle className="w-4 h-4" />}>
                    Scan Electricity Bill
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                <EnergyTrendsChart bills={bills} />
                {bills.length === 1 && (
                  <p className="text-[11px] text-slate-400 text-center italic pt-1">
                    * 1 bill recorded. Additional monthly bills will automatically reveal seasonal baseline trends.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Savings Insights & Top Recommendations (4 cols) */}
        <Card className="lg:col-span-4 flex flex-col justify-between p-5 space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Top Savings Insights
              </span>
              <Link to="/savings" className="text-xs font-bold text-emerald-700 hover:text-emerald-800">
                View All →
              </Link>
            </div>

            {isLoadingInventory ? (
              <div className="py-8 text-center space-y-2">
                <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-slate-400">Loading recommendations...</p>
              </div>
            ) : appliances.length === 0 ? (
              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl text-xs space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  Appliance Inventory Empty
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Configure your household appliances in the Savings Planner to calculate actionable energy reductions.
                </p>
                <Link to="/savings">
                  <Button size="sm" variant="primary" className="w-full text-xs mt-1">
                    Open Savings Planner
                  </Button>
                </Link>
              </div>
            ) : topRecommendations.length > 0 ? (
              <div className="space-y-2.5">
                {topRecommendations.map((rec, index) => (
                  <div
                    key={index}
                    className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="font-bold text-xs text-emerald-950 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        {rec.action}
                      </span>
                      <Badge variant={rec.category === 'no_cost' ? 'verified' : 'pending'} size="sm">
                        {rec.category === 'no_cost' ? 'Zero Cost' : 'Low Cost'}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-600 line-clamp-2">
                      {rec.reason}
                    </p>
                    <div className="flex items-center justify-between text-[11px] pt-1 text-slate-500 border-t border-emerald-100/60">
                      <span>Benefit: <strong className="text-emerald-800 font-bold">{formatCurrency(rec.estimatedMonetaryBenefitInr)}/mo</strong></span>
                      <span>Cut: <strong className="text-slate-800 font-bold">{formatKwh(rec.estimatedEnergyReductionKwh)}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-slate-50 rounded-xl text-xs text-slate-500 text-center">
                {engineResult?.statusMessage || 'Scan a bill to view personalized savings recommendations.'}
              </div>
            )}
          </div>

          {/* Quick Footer inside Card */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Need installation help?</span>
            <Link to="/workforce" className="font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-0.5">
              Local Technicians <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </Card>
      </div>

      {/* 5. Recent Bills Archive Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle>Recent Electricity Bills</CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Synced with offline IndexedDB local database
            </p>
          </div>
          <Link to="/bills">
            <span className="text-xs font-bold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1">
              View All Bills <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </Link>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50/80 text-xs text-slate-500 uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="py-3 px-5 font-semibold">Bill Month</th>
                <th className="py-3 px-5 font-semibold">Consumption</th>
                <th className="py-3 px-5 font-semibold">Total Amount</th>
                <th className="py-3 px-5 font-semibold">Average Tariff</th>
                <th className="py-3 px-5 font-semibold">Status / Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bills.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-slate-400">
                    No bills recorded yet. Use the OCR scanner to add your first bill.
                  </td>
                </tr>
              ) : (
                bills.slice(-4).reverse().map((bill) => (
                  <tr key={bill.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-5 font-semibold text-slate-900 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      {bill.billMonth}
                    </td>
                    <td className="py-3 px-5 font-bold text-emerald-800">
                      {formatKwh(bill.unitsConsumed)}
                    </td>
                    <td className="py-3 px-5 font-bold text-slate-900">
                      {formatCurrency(bill.totalAmount)}
                    </td>
                    <td className="py-3 px-5 text-slate-600">
                      ₹{bill.tariffRatePerUnit ? bill.tariffRatePerUnit.toFixed(1) : '7.5'} / unit
                    </td>
                    <td className="py-3 px-5">
                      <Badge variant={bill.source === 'sample' ? 'demo' : 'verified'} size="sm">
                        {bill.source === 'sample' ? 'Sample Demo' : 'Verified Bill'}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
