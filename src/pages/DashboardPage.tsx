import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Zap,
  Sun,
  ShieldCheck,
  PlusCircle,
  ArrowUpRight,
  Lightbulb,
  FileText,
  Calendar,
  AlertCircle,
  Sparkles,
  Scale,
  Landmark,
  TrendingUp,
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
  const [activeRecIndex, setActiveRecIndex] = useState(0);
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

  const activeRec =
    engineResult && engineResult.recommendations.length > 0
      ? engineResult.recommendations[activeRecIndex % engineResult.recommendations.length]
      : null;

  return (
    <div className="space-y-6">
      {/* Top Banner & Profile Overview */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-subtle">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Namaste, {userProfile.name}
            </h1>
            <Badge variant="emerald" size="sm">
              Consumer Active
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            {userProfile.discomName || 'MPPKVVCL'} • Pincode {userProfile.pincode} • Sanctioned Load: {userProfile.sanctionedLoadKw || 3} kW
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link to="/bills">
            <Button size="sm" variant="outline" icon={<PlusCircle className="w-4 h-4 text-emerald-600" />}>
              Scan Bill
            </Button>
          </Link>
          <Link to="/savings">
            <Button size="sm" variant="primary" icon={<Sparkles className="w-4 h-4 text-amber-300" />}>
              Savings Planner
            </Button>
          </Link>
          <Link to="/solar">
            <Button size="sm" variant="solar" icon={<Sun className="w-4 h-4" />}>
              Solar Evaluation
            </Button>
          </Link>
          <Link to="/quotations">
            <Button size="sm" variant="outline" icon={<Scale className="w-4 h-4 text-emerald-600" />}>
              Compare Quotes
            </Button>
          </Link>
          <Link to="/schemes">
            <Button size="sm" variant="outline" icon={<Landmark className="w-4 h-4 text-emerald-600" />}>
              Govt Schemes
            </Button>
          </Link>
          <Link to="/impact">
            <Button size="sm" variant="outline" icon={<TrendingUp className="w-4 h-4 text-emerald-600" />}>
              Impact Tracker
            </Button>
          </Link>
        </div>
      </div>

      {/* Offline Alert Banner (Shown when disconnected) */}
      {isOffline && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-center gap-3 text-amber-950 text-xs">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <div className="flex-1">
            <span className="font-semibold">You are currently offline.</span> The deterministic savings engine, OCR parser, and bill archive operate 100% locally from your device.
          </div>
        </div>
      )}

      {/* Key Metric Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Last Month Consumption"
          value={latestBill ? formatKwh(latestBill.unitsConsumed) : '—'}
          icon={<Zap className="w-5 h-5" />}
          variant="emerald"
          trend={
            latestBill && previousBill
              ? {
                  value: `${Math.abs(Number(consumptionChangePercent))}%`,
                  isPositive: isConsumptionDown,
                  label: 'vs prev month',
                }
              : undefined
          }
          subtitle={latestBill ? `Period: ${latestBill.billMonth}` : 'No bills recorded yet'}
        />

        <StatCard
          title="Latest Bill Amount"
          value={latestBill ? formatCurrency(latestBill.totalAmount) : '—'}
          icon={<FileText className="w-5 h-5" />}
          subtitle={latestBill ? `Due date: ${latestBill.dueDate}` : 'Scan bill to view amount'}
        />

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
              ? `Save up to ${formatKwh(engineResult.potentialMonthlyKwhSavings)} / mo`
              : appliances.length === 0
              ? 'Configure appliances in planner'
              : !latestBill
              ? 'Scan bill to calculate savings'
              : 'Add confirmed bill units'
          }
        />

        <StatCard
          title="CO₂ Emissions Offset"
          value={
            engineResult && engineResult.status === 'success'
              ? `${(engineResult.co2ReductionKgPerMonth / 1000).toFixed(2)} Tonnes`
              : '—'
          }
          icon={<ShieldCheck className="w-5 h-5" />}
          variant="emerald"
          subtitle={latestBill ? 'Annualized community impact' : 'Awaiting bill input'}
        />
      </div>

      {/* Main Charts & Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Energy Consumption Trend Chart */}
        <Card className="lg:col-span-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Electricity Consumption Trends</CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Past billing units (kWh) with peak seasonal analysis
              </p>
            </div>
            {bills.some((b) => b.source === 'sample') ? (
              <Badge variant="amber" size="sm">
                Sample Demo Data
              </Badge>
            ) : bills.length > 0 ? (
              <Badge variant="emerald" size="sm">
                {bills.length} Verified {bills.length > 1 ? 'Bills' : 'Bill'}
              </Badge>
            ) : null}
          </CardHeader>
          <CardContent>
            {bills.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <FileText className="w-12 h-12 text-slate-300 mx-auto" />
                <p className="text-sm font-semibold text-slate-700">No electricity bills saved yet</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Scan your electricity bill using client-side OCR to view multi-month consumption trends and uncover telescopic tariff slabs.
                </p>
                <Link to="/bills">
                  <Button size="sm" variant="primary" icon={<PlusCircle className="w-4 h-4" />}>
                    Scan Electricity Bill
                  </Button>
                </Link>
              </div>
            ) : (
              <EnergyTrendsChart bills={bills} />
            )}
          </CardContent>
        </Card>

        {/* Dynamic Intelligence Engine Card */}
        <Card variant="default" className="lg:col-span-4 flex flex-col justify-between p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Intelligence Engine Tip
              </span>
              {engineResult && engineResult.recommendations.length > 0 && (
                <span className="text-xs text-slate-400">
                  {(activeRecIndex % engineResult.recommendations.length) + 1} of {engineResult.recommendations.length}
                </span>
              )}
            </div>

            {isLoadingInventory ? (
              <div className="p-6 bg-slate-50/70 border border-slate-200/80 rounded-2xl flex flex-col items-center justify-center text-center space-y-2">
                <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-slate-500 font-medium">Loading saved appliances...</p>
              </div>
            ) : appliances.length === 0 ? (
              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs space-y-2.5">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  No Appliance Inventory Configured
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Set up your household appliances in the Savings Planner to calculate accurate energy reductions, slab arbitrage, and retrofit recommendations.
                </p>
                <Link to="/savings">
                  <Button size="sm" variant="primary" className="mt-1 w-full text-xs">
                    Configure Appliances in Planner →
                  </Button>
                </Link>
              </div>
            ) : activeRec ? (
              <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-100 space-y-2.5">
                <div className="flex items-start justify-between gap-1">
                  <div className="flex items-center gap-1.5 text-emerald-950 font-bold text-sm">
                    <Lightbulb className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{activeRec.action}</span>
                  </div>
                  <Badge variant="emerald" size="sm">
                    {activeRec.category === 'no_cost' ? 'Zero Cost' : 'Low Cost'}
                  </Badge>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {activeRec.reason}
                </p>

                <div className="pt-2 border-t border-emerald-100/80 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-500 text-[11px]">Monthly Benefit:</span>
                    <p className="font-bold text-emerald-800 text-sm">
                      {formatCurrency(activeRec.estimatedMonetaryBenefitInr)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 text-[11px]">Energy Reduced:</span>
                    <p className="font-bold text-slate-800 text-sm">
                      {formatKwh(activeRec.estimatedEnergyReductionKwh)}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 rounded-2xl text-xs text-slate-500">
                {engineResult?.statusMessage || 'No recommendations generated for current inputs.'}
              </div>
            )}

            {engineResult && engineResult.recommendations.length > 1 && (
              <div className="flex justify-between items-center pt-1 text-xs">
                <button
                  onClick={() =>
                    setActiveRecIndex((prev) =>
                      prev > 0 ? prev - 1 : engineResult.recommendations.length - 1
                    )
                  }
                  className="font-semibold text-slate-500 hover:text-slate-800"
                >
                  ← Previous Opportunity
                </button>
                <button
                  onClick={() =>
                    setActiveRecIndex((prev) =>
                      (prev + 1) % engineResult.recommendations.length
                    )
                  }
                  className="font-semibold text-emerald-700 hover:text-emerald-800"
                >
                  Next Opportunity →
                </button>
              </div>
            )}
          </div>

          <div className="pt-5 border-t border-slate-100 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-600">Personalized Audit:</span>
              <Link to="/savings" className="text-emerald-700 font-bold hover:underline inline-flex items-center gap-0.5">
                Savings Planner <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Link to="/savings">
                <Button variant="outline" size="sm" className="w-full text-xs">
                  Appliance Audit
                </Button>
              </Link>
              <Link to="/workforce">
                <Button variant="outline" size="sm" className="w-full text-xs">
                  Hire Electrician
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Bills History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Electricity Bills</CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Synced with offline IndexedDB database
            </p>
          </div>
          <Link to="/bills">
            <span className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1">
              View All Bills <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </Link>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-xs text-slate-500 uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="py-3.5 px-6 font-semibold">Bill Month</th>
                <th className="py-3.5 px-6 font-semibold">Consumption</th>
                <th className="py-3.5 px-6 font-semibold">Total Amount</th>
                <th className="py-3.5 px-6 font-semibold">Average Tariff</th>
                <th className="py-3.5 px-6 font-semibold">Status / Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bills.slice(-4).reverse().map((bill) => (
                <tr key={bill.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3.5 px-6 font-medium text-slate-900 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    {bill.billMonth}
                  </td>
                  <td className="py-3.5 px-6 font-semibold text-emerald-800">
                    {formatKwh(bill.unitsConsumed)}
                  </td>
                  <td className="py-3.5 px-6 font-bold text-slate-900">
                    {formatCurrency(bill.totalAmount)}
                  </td>
                  <td className="py-3.5 px-6 text-slate-600">
                    ₹{bill.tariffRatePerUnit.toFixed(1)} / unit
                  </td>
                  <td className="py-3.5 px-6">
                    <Badge variant="emerald" size="sm">
                      Paid
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
