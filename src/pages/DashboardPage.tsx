import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { StatCard } from '../components/common/StatCard';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { EnergyTrendsChart } from '../components/charts/EnergyTrendsChart';
import { MOCK_BILLS, MOCK_ENERGY_TIPS } from '../data/mockEnergyData';
import { formatCurrency, formatKwh } from '../utils/formatters';
import { useApp } from '../context/AppContext';
import { dbService } from '../services/db';
import { ElectricityBill } from '../types';

export const DashboardPage: React.FC = () => {
  const { userProfile, isOffline } = useApp();
  const [bills, setBills] = useState<ElectricityBill[]>(MOCK_BILLS);
  const [activeTipIndex, setActiveTipIndex] = useState(0);

  useEffect(() => {
    const loadStoredBills = async () => {
      try {
        const stored = await dbService.getAllBills();
        if (stored.length > 0) {
          setBills(stored);
        } else {
          // Seed initial mock bills to IndexedDB for first-time offline experience
          for (const b of MOCK_BILLS) {
            await dbService.saveBill(b);
          }
        }
      } catch (err) {
        console.warn('Could not read from IndexedDB, using fallback mock data:', err);
      }
    };
    loadStoredBills();
  }, []);

  const latestBill = bills[bills.length - 1] || MOCK_BILLS[MOCK_BILLS.length - 1];
  const previousBill = bills[bills.length - 2] || latestBill;

  const consumptionChangePercent =
    previousBill.unitsConsumed > 0
      ? (((latestBill.unitsConsumed - previousBill.unitsConsumed) / previousBill.unitsConsumed) * 100).toFixed(1)
      : '0';

  const isConsumptionDown = Number(consumptionChangePercent) <= 0;

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

        <div className="flex items-center gap-2.5">
          <Link to="/bills">
            <Button size="sm" variant="outline" icon={<PlusCircle className="w-4 h-4 text-emerald-600" />}>
              Add New Bill
            </Button>
          </Link>
          <Link to="/solar">
            <Button size="sm" variant="solar" icon={<Sun className="w-4 h-4" />}>
              Solar Evaluation
            </Button>
          </Link>
        </div>
      </div>

      {/* Offline Alert Banner (Shown when disconnected) */}
      {isOffline && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-center gap-3 text-amber-900 text-xs">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <div className="flex-1">
            <span className="font-semibold">You are currently offline.</span> All charts, calculations, and local bill entries are running directly from your device's IndexedDB.
          </div>
        </div>
      )}

      {/* Key Metric Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Last Month Consumption"
          value={formatKwh(latestBill.unitsConsumed)}
          icon={<Zap className="w-5 h-5" />}
          variant="emerald"
          trend={{
            value: `${Math.abs(Number(consumptionChangePercent))}%`,
            isPositive: isConsumptionDown,
            label: 'vs prev month',
          }}
        />

        <StatCard
          title="Latest Bill Amount"
          value={formatCurrency(latestBill.totalAmount)}
          icon={<FileText className="w-5 h-5" />}
          subtitle={`Due date: ${latestBill.dueDate}`}
        />

        <StatCard
          title="Potential Solar Offset"
          value="85%"
          icon={<Sun className="w-5 h-5" />}
          variant="amber"
          subtitle="PM Surya Ghar Rooftop eligible"
        />

        <StatCard
          title="CO₂ Emissions Saved"
          value="1.2 Tonnes"
          icon={<ShieldCheck className="w-5 h-5" />}
          variant="emerald"
          subtitle="Community benchmark level"
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
                Past 6 months billing units (kWh) with peak seasonal analysis
              </p>
            </div>
            <Badge variant="slate" size="sm">
              Monthly kWh
            </Badge>
          </CardHeader>
          <CardContent>
            <EnergyTrendsChart bills={bills} />
          </CardContent>
        </Card>

        {/* Quick Action & Advice Card */}
        <Card variant="default" className="lg:col-span-4 flex flex-col justify-between p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Actionable Savings Tip
              </span>
              <span className="text-xs text-slate-400">
                {activeTipIndex + 1} of {MOCK_ENERGY_TIPS.length}
              </span>
            </div>

            <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-100 space-y-2">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                <Lightbulb className="w-4 h-4 text-emerald-600" />
                <span>{MOCK_ENERGY_TIPS[activeTipIndex].title}</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {MOCK_ENERGY_TIPS[activeTipIndex].description}
              </p>
              <div className="pt-2 flex items-center justify-between text-xs">
                <span className="text-slate-500">Estimated Monthly Saving:</span>
                <span className="font-bold text-emerald-700">
                  {formatCurrency(MOCK_ENERGY_TIPS[activeTipIndex].potentialMonthlySavingsInr)}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                onClick={() =>
                  setActiveTipIndex((prev) => (prev > 0 ? prev - 1 : MOCK_ENERGY_TIPS.length - 1))
                }
                className="text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                Previous Tip
              </button>
              <button
                onClick={() =>
                  setActiveTipIndex((prev) => (prev < MOCK_ENERGY_TIPS.length - 1 ? prev + 1 : 0))
                }
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
              >
                Next Tip →
              </button>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 space-y-2.5">
            <p className="text-xs font-semibold text-slate-500">Quick Tools</p>
            <div className="grid grid-cols-2 gap-2">
              <Link to="/bills">
                <Button variant="outline" size="sm" className="w-full text-xs">
                  Slab Analyzer
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
