import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { ApplianceConsumptionChart } from '../components/charts/ApplianceConsumptionChart';
import {
  runEnergySavingsEngine,
  PRESET_1BHK,
  PRESET_2BHK,
  PRESET_3BHK,
  applyApartmentPreset,
  applyPreset,
  calculateSavingsPercentage,
  formatSavingsPercentage,
} from '../services/energyEngine';
import { storageService } from '../services/storageService';
import { formatCurrency, formatKwh, formatCO2 } from '../utils/formatters';
import { ApplianceInput, ApplianceCategory } from '../types';
import {
  Lightbulb,
  ShieldCheck,
  Plus,
  Trash2,
  Sparkles,
  Info,
  Calendar,
  Wallet,
  Users,
  CheckCircle2,
  Flame,
  Tv,
  Fan,
  Wind,
  Layers,
  HelpCircle,
  Sun,
  ChevronDown,
} from 'lucide-react';

export {
  PRESET_1BHK,
  PRESET_2BHK,
  PRESET_3BHK,
  applyApartmentPreset,
  applyPreset,
  calculateSavingsPercentage,
  formatSavingsPercentage,
};

export const SavingsPlannerPage: React.FC = () => {
  const location = useLocation();

  // Input parameters - initialized to 0 if no bill provided (never silently injects fake consumption)
  const [billedUnits, setBilledUnits] = useState<number>(0);
  const [billAmount, setBillAmount] = useState<number>(0);
  const [periodDays, setPeriodDays] = useState<number>(30);
  const [members, setMembers] = useState<number>(4);
  const [userBudget, setUserBudget] = useState<number>(5000);
  const [appliances, setAppliances] = useState<ApplianceInput[]>(PRESET_2BHK);
  const [activePreset, setActivePreset] = useState<'1bhk' | '2bhk' | '3bhk'>('2bhk');
  const [isApplianceCustomized, setIsApplianceCustomized] = useState<boolean>(false);
  const [hasConfirmedBill, setHasConfirmedBill] = useState<boolean>(false);

  // New appliance modal / inline adder state
  // New appliance modal / inline adder state
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newCategory, setNewCategory] = useState<ApplianceCategory>('ceiling_fan');
  const [newName, setNewName] = useState<string>('');
  const [newWatts, setNewWatts] = useState<number>(75);
  const [newHours, setNewHours] = useState<number>(8);
  const [newQty, setNewQty] = useState<number>(1);
  const [newTemp, setNewTemp] = useState<number>(20);

  // Recommendations expand/collapse state
  const [expandedRecs, setExpandedRecs] = useState<Record<string, boolean>>({});

  const toggleRecExpand = (id: string) => {
    setExpandedRecs((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // 1. Load shared appliance inventory from IndexedDB on page initialization
  useEffect(() => {
    let isMounted = true;
    storageService.getApplianceInventory().then((saved) => {
      if (isMounted) {
        if (saved && saved.length > 0) {
          setAppliances(saved);
          setIsApplianceCustomized(true);
        } else {
          // If storage is uninitialized, seed with standard 2BHK preset for shared consistency
          storageService.saveApplianceInventory(PRESET_2BHK);
        }
      }
    });

    // Listen for inventory updates dispatched across tabs or views
    const handleInventoryChanged = (e: Event) => {
      const customEvent = e as CustomEvent<ApplianceInput[]>;
      if (customEvent.detail && Array.isArray(customEvent.detail) && isMounted) {
        setAppliances(customEvent.detail);
        setIsApplianceCustomized(true);
      }
    };

    window.addEventListener('urja-appliance-inventory-changed', handleInventoryChanged);
    return () => {
      isMounted = false;
      window.removeEventListener('urja-appliance-inventory-changed', handleInventoryChanged);
    };
  }, []);

  // 2. Auto-populate from navigation state or most recent confirmed bill in IndexedDB
  useEffect(() => {
    // Check if passed via router navigation state (e.g. from Bill Analyzer or Dashboard)
    const state = location.state as {
      billedUnits?: number;
      billAmount?: number;
      unitsConsumed?: number;
      totalAmount?: number;
    } | null;

    if (state && (state.billedUnits || state.unitsConsumed)) {
      const units = state.billedUnits || state.unitsConsumed || 0;
      const amount = state.billAmount || state.totalAmount || 0;
      setBilledUnits(units);
      setBillAmount(amount);
      setHasConfirmedBill(true);
      return;
    }

    // Otherwise load most recent confirmed bill from IndexedDB
    const loadConfirmedBill = () => {
      storageService.getSavedBills().then((bills) => {
        if (bills.length > 0) {
          const latest = bills[0];
          if (latest.unitsConsumed > 0) {
            setBilledUnits(latest.unitsConsumed);
            setBillAmount(latest.totalAmount);
            setHasConfirmedBill(true);
          }
        } else {
          setHasConfirmedBill(false);
        }
      });
    };

    loadConfirmedBill();

    window.addEventListener('urja-bills-changed', loadConfirmedBill);
    return () => {
      window.removeEventListener('urja-bills-changed', loadConfirmedBill);
    };
  }, [location.state]);

  // Run the deterministic engine on every input shift
  const engineResult = useMemo(() => {
    return runEnergySavingsEngine({
      billedUnitsKwh: billedUnits,
      billAmountInr: billAmount,
      billingPeriodDays: periodDays,
      householdMembers: members,
      appliances,
      userBudgetInr: userBudget,
    });
  }, [billedUnits, billAmount, periodDays, members, appliances, userBudget]);

  const handleSelectPreset = (preset: '1bhk' | '2bhk' | '3bhk') => {
    // Prompt confirmation if user has customized their appliance inventory
    if (isApplianceCustomized) {
      const confirmed = window.confirm(
        'Switching apartment preset will replace your customized appliance inventory. Do you want to proceed?'
      );
      if (!confirmed) {
        return;
      }
    }

    // Apply preset to appliances only; preserves confirmed or current bill values
    const result = applyApartmentPreset(preset, billedUnits, billAmount, hasConfirmedBill);
    setAppliances(result.appliances);
    setBilledUnits(result.billedUnits);
    setBillAmount(result.billAmount);
    setMembers(preset === '1bhk' ? 2 : preset === '3bhk' ? 5 : 4);
    setActivePreset(preset);
    setIsApplianceCustomized(false);
    // Persist confirmed preset inventory to shared storage
    storageService.saveApplianceInventory(result.appliances);
  };

  const handleAddAppliance = (e: React.FormEvent) => {
    e.preventDefault();
    const item: ApplianceInput = {
      id: `app_${Date.now()}`,
      name: newName.trim() || newCategory.replace('_', ' ').toUpperCase(),
      category: newCategory,
      wattage: Math.max(1, Number(newWatts) || 60),
      dailyUsageHours: Math.min(24, Math.max(0, Number(newHours) || 1)),
      quantity: Math.max(1, Number(newQty) || 1),
      temperatureSetpointC: newCategory === 'air_conditioner' ? newTemp : undefined,
    };
    const updated = [...appliances, item];
    setAppliances(updated);
    setIsApplianceCustomized(true);
    setShowAddModal(false);
    setNewName('');
    // Persist updated inventory to shared storage
    storageService.saveApplianceInventory(updated);
  };

  const handleDeleteAppliance = (id: string) => {
    const updated = appliances.filter((a) => a.id !== id);
    setAppliances(updated);
    setIsApplianceCustomized(true);
    // Persist updated inventory to shared storage
    storageService.saveApplianceInventory(updated);
  };

  const handleUpdateApplianceHours = (id: string, hours: number) => {
    const updated = appliances.map((a) =>
      a.id === id ? { ...a, dailyUsageHours: Math.min(24, Math.max(0, hours)) } : a
    );
    setAppliances(updated);
    setIsApplianceCustomized(true);
    // Persist updated inventory to shared storage
    storageService.saveApplianceInventory(updated);
  };

  const handleUpdateApplianceSetpoint = (id: string, temp: number) => {
    const updated = appliances.map((a) =>
      a.id === id ? { ...a, temperatureSetpointC: temp } : a
    );
    setAppliances(updated);
    setIsApplianceCustomized(true);
    // Persist updated inventory to shared storage
    storageService.saveApplianceInventory(updated);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Energy Savings Intelligence Engine
            </h1>
            <Badge variant="emerald" size="sm" icon={<ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />}>
              Deterministic Physics Model
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Personalized, physics-based energy reduction analysis based on appliance wattage, duty cycles, and DISCOM marginal tariffs.
          </p>
        </div>

        {/* Preset Household Profile Quick Pickers */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <span className="text-xs font-semibold text-slate-500">Profiles:</span>
          <button
            type="button"
            onClick={() => handleSelectPreset('2bhk')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border shadow-xs transition-colors ${
              activePreset === '2bhk' && !isApplianceCustomized
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-white border-slate-200 hover:border-emerald-300 text-slate-700 hover:bg-emerald-50/50'
            }`}
          >
            2BHK Urban
          </button>
          <button
            type="button"
            onClick={() => handleSelectPreset('3bhk')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border shadow-xs transition-colors ${
              activePreset === '3bhk' && !isApplianceCustomized
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-white border-slate-200 hover:border-emerald-300 text-slate-700 hover:bg-emerald-50/50'
            }`}
          >
            3BHK Semi-Lux
          </button>
          <button
            type="button"
            onClick={() => handleSelectPreset('1bhk')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border shadow-xs transition-colors ${
              activePreset === '1bhk' && !isApplianceCustomized
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-white border-slate-200 hover:border-emerald-300 text-slate-700 hover:bg-emerald-50/50'
            }`}
          >
            1BHK Low-Load
          </button>
        </div>
      </div>

      {/* Illustrative Estimates Disclaimer Banner */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs text-slate-600 flex items-start gap-3">
        <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-bold text-slate-800">Deterministic Mathematical Methodology:</span>
          <p>
            All figures are calculated using empirical Bureau of Energy Efficiency (BEE) thermodynamic benchmarks, duty cycle run-factors, and state telescopic billing slab rates. No generative AI text or fabricated numbers are used.
          </p>
        </div>
      </div>

      {/* 2. SAVINGS SUMMARY (FULL WIDTH) */}
      {/* Status Alert for Insufficient Evidence or Invalid Input */}
      {engineResult.status !== 'success' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-amber-950 space-y-2 shadow-xs">
          <div className="flex items-start gap-3">
            <HelpCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <p className="font-bold text-sm">
                {engineResult.status === 'insufficient_evidence'
                  ? 'Insufficient Evidence for Savings Recommendations'
                  : 'Input Validation Notice'}
              </p>
              <p className="text-amber-900 leading-relaxed">{engineResult.statusMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Aggregated Savings Opportunity Banner (Full Width) */}
      {engineResult.status === 'success' && (
        <div className="bg-gradient-to-br from-forest-950 via-forest-900 to-emerald-950 text-white rounded-3xl p-6 sm:p-8 shadow-premium space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Identified Savings Potential
            </span>
            <Badge variant="emerald" size="sm">
              Tariff: ₹{engineResult.marginalTariffPerKwh}/unit
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
            <div className="bg-forest-900/40 p-4 rounded-2xl border border-forest-800/60">
              <span className="text-xs text-slate-300 font-medium block">Monthly Energy Reduction</span>
              <p className="text-2xl sm:text-3xl font-black text-white mt-1">
                {formatKwh(engineResult.potentialMonthlyKwhSavings)}
              </p>
              <p className="text-[11px] text-emerald-300 mt-1 font-semibold">
                {formatSavingsPercentage(
                  engineResult.status,
                  engineResult.monthlyBilledKwh,
                  engineResult.potentialMonthlyKwhSavings
                )}
              </p>
            </div>

            <div className="bg-forest-900/40 p-4 rounded-2xl border border-forest-800/60">
              <span className="text-xs text-slate-300 font-medium block">Estimated Monthly Savings</span>
              <p className="text-2xl sm:text-3xl font-black text-amber-300 mt-1">
                {formatCurrency(engineResult.potentialMonthlyInrSavings)}
              </p>
              <p className="text-[11px] text-emerald-300 mt-1 font-semibold">
                {formatCurrency(engineResult.potentialMonthlyInrSavings * 12)} / year
              </p>
            </div>

            <div className="bg-forest-900/40 p-4 rounded-2xl border border-forest-800/60">
              <span className="text-xs text-slate-300 font-medium block">Carbon Footprint Saved</span>
              <p className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1">
                {formatCO2(engineResult.co2ReductionKgPerMonth / 1000)}
              </p>
              <p className="text-[11px] text-slate-300 mt-1">Every month</p>
            </div>

            <div className="bg-forest-900/40 p-4 rounded-2xl border border-forest-800/60">
              <span className="text-xs text-slate-300 font-medium block">Viable Retrofit Actions</span>
              <p className="text-2xl sm:text-3xl font-black text-emerald-200 mt-1">
                {engineResult.recommendations.filter((r) => r.isWithinBudget).length}
              </p>
              <p className="text-[11px] text-slate-300 mt-1">
                of {engineResult.recommendations.length} within current budget
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3. APPLIANCE INVENTORY & CONSUMPTION VISUALIZATION (RESPONSIVE TWO-COLUMN GRID) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Column: Input Parameters & Appliance Inventory */}
        <div className="space-y-6 min-w-0">
          {/* Bill Baseline & Household Parameters */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                Bill Baseline & Budget Parameters
              </h3>
              {hasConfirmedBill && (
                <Badge variant="emerald" size="sm" icon={<CheckCircle2 className="w-3 h-3 text-emerald-600" />}>
                  Confirmed Bill
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Billed Units (kWh)
                </label>
                <input
                  type="number"
                  min="0"
                  max="10000"
                  value={billedUnits}
                  onChange={(e) => setBilledUnits(Math.max(0, Number(e.target.value)))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Bill Amount (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  max="200000"
                  value={billAmount}
                  onChange={(e) => setBillAmount(Math.max(0, Number(e.target.value)))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  Household Members
                </label>
                <input
                  type="number"
                  min="1"
                  max="15"
                  value={members}
                  onChange={(e) => setMembers(Math.max(1, Number(e.target.value)))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Billing Days
                </label>
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={periodDays}
                  onChange={(e) => setPeriodDays(Math.max(1, Number(e.target.value)))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {!hasConfirmedBill && billedUnits === 0 && (
              <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200/60">
                No confirmed bill imported yet. Enter your billed units above or import a bill via the Bill Analyzer.
              </p>
            )}

            {/* Budget Filter */}
            <div className="pt-2 border-t border-slate-100">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-700 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                  Available Retrofit Budget:
                </span>
                <span className="font-bold text-emerald-800">
                  {userBudget === 0 ? '₹0 (No-Cost Habits Only)' : formatCurrency(userBudget)}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="30000"
                step="1000"
                value={userBudget}
                onChange={(e) => setUserBudget(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
              <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                <span>₹0 (Behavioral)</span>
                <span>₹5,000 (Low-Cost)</span>
                <span>₹30,000 (Full Retrofit)</span>
              </div>
            </div>
          </Card>

          {/* Appliance Inventory List */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Appliance Inventory ({appliances.length})
                </h3>
                <p className="text-[11px] text-slate-400">
                  Adjust hours to re-calculate energy breakdown
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAddModal(true)}
                icon={<Plus className="w-3.5 h-3.5 text-emerald-600" />}
              >
                Add Appliance
              </Button>
            </div>

            <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
              {appliances.map((app) => (
                <div
                  key={app.id}
                  className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-2 text-xs"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-slate-800">{app.name}</p>
                      <p className="text-[11px] text-slate-500">
                        {app.quantity} unit(s) • {app.wattage}W each
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteAppliance(app.id)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                      title="Remove appliance"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Operating Hours Slider */}
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-600">
                      <span>Daily Usage:</span>
                      <span className="font-bold text-emerald-700">{app.dailyUsageHours} hrs / day</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="24"
                      step="0.5"
                      value={app.dailyUsageHours}
                      onChange={(e) => handleUpdateApplianceHours(app.id, Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                    />
                  </div>

                  {/* Temperature Setpoint for AC */}
                  {app.category === 'air_conditioner' && (
                    <div className="pt-1 border-t border-slate-200/60">
                      <div className="flex justify-between text-[11px] text-slate-600">
                        <span>Thermostat Setpoint:</span>
                        <span className="font-bold text-amber-700">
                          {app.temperatureSetpointC || 20}°C
                        </span>
                      </div>
                      <input
                        type="range"
                        min="16"
                        max="28"
                        step="1"
                        value={app.temperatureSetpointC || 20}
                        onChange={(e) =>
                          handleUpdateApplianceSetpoint(app.id, Number(e.target.value))
                        }
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Column: Appliance Consumption Breakdown Chart */}
        <div className="space-y-6 min-w-0">
          {engineResult.applianceBreakdown.length > 0 ? (
            <Card className="p-5 sm:p-6 space-y-4">
              <CardHeader className="p-0 flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Estimated Appliance-Wise Load</CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Calculated total: {formatKwh(engineResult.totalApplianceCalculatedKwh)} / month
                  </p>
                </div>
                <Badge variant="slate" size="sm">
                  {engineResult.applianceBreakdown.length} Categories
                </Badge>
              </CardHeader>
              <CardContent className="p-0 pt-2 space-y-4">
                <ApplianceConsumptionChart breakdowns={engineResult.applianceBreakdown} />

                {/* Compact Breakdown Mini-Table */}
                <div className="border border-slate-100 rounded-2xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 font-semibold text-slate-600">
                      <tr>
                        <th className="py-2.5 px-3">Appliance Category</th>
                        <th className="py-2.5 px-3 text-right">Monthly Energy</th>
                        <th className="py-2.5 px-3 text-right">Load Share</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {engineResult.applianceBreakdown.map((b, i) => (
                        <tr key={i} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 font-medium text-slate-800">{b.name}</td>
                          <td className="py-2.5 px-3 text-right text-emerald-800 font-bold">{formatKwh(b.monthlyKwh)}</td>
                          <td className="py-2.5 px-3 text-right text-slate-500 font-semibold">{b.percentageOfTotal}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="p-6 text-center text-slate-400">
              <p className="text-xs">No appliance load data available.</p>
            </Card>
          )}
        </div>
      </div>

      {/* 4. ACTIONABLE RECOMMENDATIONS (FULL WIDTH) */}
      {engineResult.recommendations.length > 0 && (
        <div className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Actionable Energy Saving Recommendations
              </h3>
              <p className="text-xs text-slate-500">
                Ranked by affordability, expected benefit, and feasibility across your household inventory
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="emerald" size="sm">
                {engineResult.recommendations.filter((r) => r.isWithinBudget).length} Within Budget
              </Badge>
              <span className="text-xs text-slate-400">
                ({engineResult.recommendations.length} total)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {engineResult.recommendations.map((rec) => {
              return (
                <Card
                  key={rec.id}
                  hoverEffect
                  className={`p-5 transition-all min-w-0 ${
                    !rec.isWithinBudget ? 'opacity-80 bg-slate-50/60' : 'bg-white'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header & Badges */}
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-1">
                        <h4 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                          {rec.targetApplianceCategory === 'air_conditioner' && (
                            <Wind className="w-4 h-4 text-emerald-600" />
                          )}
                          {rec.targetApplianceCategory === 'ceiling_fan' && (
                            <Fan className="w-4 h-4 text-emerald-600" />
                          )}
                          {rec.targetApplianceCategory === 'lighting' && (
                            <Lightbulb className="w-4 h-4 text-emerald-600" />
                          )}
                          {rec.targetApplianceCategory === 'water_heater' && (
                            <Flame className="w-4 h-4 text-emerald-600" />
                          )}
                          {rec.targetApplianceCategory === 'television' && (
                            <Tv className="w-4 h-4 text-emerald-600" />
                          )}
                          {!rec.targetApplianceCategory && (
                            <Layers className="w-4 h-4 text-emerald-600" />
                          )}
                          <span>{rec.action}</span>
                        </h4>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {rec.category === 'no_cost' && (
                          <Badge variant="emerald" size="sm">
                            Zero Cost Habit
                          </Badge>
                        )}
                        {rec.category === 'low_cost' && (
                          <Badge variant="blue" size="sm">
                            Low-Cost Upgrade
                          </Badge>
                        )}
                        {rec.category === 'investment' && (
                          <Badge variant="amber" size="sm">
                            Capital Retrofit
                          </Badge>
                        )}

                        {rec.isWithinBudget ? (
                          <Badge variant="emerald" size="sm">
                            Within Budget
                          </Badge>
                        ) : (
                          <Badge variant="rose" size="sm">
                            Exceeds ₹{userBudget} Budget
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Rationale (Why generated) */}
                    <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-700 leading-relaxed border border-slate-100">
                      <span className="font-bold text-slate-900">Why this action: </span>
                      {rec.reason}
                    </div>

                    {/* Impact Metrics Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="p-2.5 bg-emerald-50/70 rounded-xl border border-emerald-100">
                        <span className="text-[11px] text-emerald-800 font-medium">Monthly Savings</span>
                        <p className="font-bold text-emerald-950 text-sm">
                          {formatCurrency(rec.estimatedMonetaryBenefitInr)}
                        </p>
                      </div>

                      <div className="p-2.5 bg-emerald-50/70 rounded-xl border border-emerald-100">
                        <span className="text-[11px] text-emerald-800 font-medium">Energy Reduced</span>
                        <p className="font-bold text-emerald-950 text-sm">
                          {formatKwh(rec.estimatedEnergyReductionKwh)}
                        </p>
                      </div>

                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[11px] text-slate-500 font-medium">Upfront Cost</span>
                        <p className="font-bold text-slate-800 text-sm">
                          {rec.upfrontExpenditureInr === 0
                            ? '₹ 0 (Free)'
                            : formatCurrency(rec.upfrontExpenditureInr)}
                        </p>
                      </div>

                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[11px] text-slate-500 font-medium">Payback Period</span>
                        <p className="font-bold text-slate-800 text-sm">
                          {rec.paybackPeriodMonths === null
                            ? 'Immediate'
                            : `${rec.paybackPeriodMonths} Months`}
                        </p>
                      </div>
                    </div>

                    {/* Transparent Assumptions & Suggested Step */}
                    <div className="pt-2 border-t border-slate-100 space-y-2 text-xs">
                      <div>
                        <button
                          type="button"
                          onClick={() => toggleRecExpand(rec.id)}
                          className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 transition-colors"
                        >
                          <span>{expandedRecs[rec.id] ? 'Hide Engineering Assumptions' : 'View Engineering Assumptions'}</span>
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expandedRecs[rec.id] ? 'rotate-180' : ''}`} />
                        </button>
                        {expandedRecs[rec.id] && (
                          <ul className="list-disc list-inside text-slate-500 text-[11px] space-y-1 mt-2 bg-slate-50/80 p-3 rounded-xl border border-slate-200/80">
                            {rec.assumptions.map((asm, idx) => (
                              <li key={idx}>{asm}</li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div className="p-2.5 bg-emerald-50/70 rounded-xl flex items-center justify-between text-xs text-emerald-950 border border-emerald-100">
                        <span className="font-medium">
                          <strong className="text-emerald-900">Suggested Action:</strong> {rec.suggestedNextStep}
                        </span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 ml-2" />
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. ADDITIONAL INFORMATION (FULL WIDTH) */}
      <div className="space-y-4 pt-2">
        {/* Diagnostics Accordion */}
        {engineResult.diagnostics.length > 0 && (
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs space-y-2 text-slate-600">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-slate-400" />
              Engine Diagnostic Notes:
            </span>
            <ul className="list-disc list-inside space-y-1">
              {engineResult.diagnostics.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Integration Callout: Rooftop Solar Feasibility */}
        <div className="bg-gradient-to-r from-emerald-900 to-forest-950 text-white rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              Explore Solar Generation
            </span>
            <h4 className="font-bold text-sm sm:text-base text-white">
              Interested in generating your own solar electricity?
            </h4>
            <p className="text-xs text-emerald-100/80 leading-relaxed max-w-xl">
              Assess your terrace shadow-free area, calculate central subsidies under PM Surya Ghar, and simulate 25-year returns.
            </p>
          </div>
          <Link to="/solar" className="shrink-0">
            <Button size="sm" variant="solar" icon={<Sun className="w-4 h-4" />}>
              Solar Feasibility Assistant →
            </Button>
          </Link>
        </div>
      </div>

      {/* Add Custom Appliance Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Add Appliance to Inventory</h3>
            <form onSubmit={handleAddAppliance} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Appliance Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => {
                    const cat = e.target.value as ApplianceCategory;
                    setNewCategory(cat);
                    if (cat === 'air_conditioner') setNewWatts(1500);
                    else if (cat === 'ceiling_fan') setNewWatts(75);
                    else if (cat === 'lighting') setNewWatts(28);
                    else if (cat === 'refrigerator') setNewWatts(220);
                    else if (cat === 'water_heater') setNewWatts(2000);
                    else if (cat === 'television') setNewWatts(100);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="air_conditioner">Air Conditioner</option>
                  <option value="ceiling_fan">Ceiling Fan</option>
                  <option value="lighting">Lighting / Tube / Bulb</option>
                  <option value="refrigerator">Refrigerator</option>
                  <option value="water_heater">Water Heater / Geyser</option>
                  <option value="television">Television / Setup Box</option>
                  <option value="air_cooler">Air Cooler</option>
                  <option value="water_pump">Water Pump / Submersible</option>
                  <option value="other">Other Appliance</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Label Name</label>
                <input
                  type="text"
                  placeholder="e.g. Master Bedroom Fan"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Wattage (W)</label>
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={newWatts}
                    onChange={(e) => setNewWatts(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={newQty}
                    onChange={(e) => setNewQty(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Daily Usage Hours (0-24)</label>
                <input
                  type="number"
                  min="0.5"
                  max="24"
                  step="0.5"
                  value={newHours}
                  onChange={(e) => setNewHours(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              {newCategory === 'air_conditioner' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Current Setpoint (°C)</label>
                  <input
                    type="number"
                    min="16"
                    max="28"
                    value={newTemp}
                    onChange={(e) => setNewTemp(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Add to Inventory
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
