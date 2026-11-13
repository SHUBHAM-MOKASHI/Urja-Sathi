import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { ApplianceConsumptionChart } from '../components/charts/ApplianceConsumptionChart';
import { runEnergySavingsEngine } from '../services/energyEngine';
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
} from 'lucide-react';

const PRESET_2BHK: ApplianceInput[] = [
  {
    id: 'p_ac',
    name: '1.5 Ton Split AC (Bedroom)',
    category: 'air_conditioner',
    quantity: 1,
    wattage: 1450,
    dailyUsageHours: 6,
    temperatureSetpointC: 20,
    starRating: 3,
    ageYears: 2,
  },
  {
    id: 'p_fans',
    name: 'Induction Ceiling Fans',
    category: 'ceiling_fan',
    quantity: 3,
    wattage: 75,
    dailyUsageHours: 12,
    ageYears: 4,
  },
  {
    id: 'p_lights',
    name: 'Living & Bedroom Lights',
    category: 'lighting',
    quantity: 6,
    wattage: 28,
    dailyUsageHours: 5,
  },
  {
    id: 'p_fridge',
    name: 'Frost-Free Refrigerator (260L)',
    category: 'refrigerator',
    quantity: 1,
    wattage: 220,
    dailyUsageHours: 24,
    ageYears: 3,
  },
  {
    id: 'p_tv',
    name: 'Smart TV & Set-Top Box',
    category: 'television',
    quantity: 1,
    wattage: 110,
    dailyUsageHours: 4,
    standbyHours: 20,
  },
];

const PRESET_3BHK: ApplianceInput[] = [
  {
    id: 'p3_ac1',
    name: 'Master Bedroom AC (1.5T)',
    category: 'air_conditioner',
    quantity: 1,
    wattage: 1500,
    dailyUsageHours: 7,
    temperatureSetpointC: 21,
    starRating: 3,
  },
  {
    id: 'p3_ac2',
    name: 'Guest Room AC (1.0T)',
    category: 'air_conditioner',
    quantity: 1,
    wattage: 1100,
    dailyUsageHours: 4,
    temperatureSetpointC: 19,
    starRating: 2,
  },
  {
    id: 'p3_fans',
    name: 'Living & Bed Ceiling Fans',
    category: 'ceiling_fan',
    quantity: 4,
    wattage: 75,
    dailyUsageHours: 14,
    ageYears: 5,
  },
  {
    id: 'p3_geyser',
    name: 'Storage Water Geyser (25L)',
    category: 'water_heater',
    quantity: 1,
    wattage: 2000,
    dailyUsageHours: 1.5,
  },
  {
    id: 'p3_fridge',
    name: 'Double Door Refrigerator (340L)',
    category: 'refrigerator',
    quantity: 1,
    wattage: 240,
    dailyUsageHours: 24,
    ageYears: 2,
  },
  {
    id: 'p3_lights',
    name: 'Recessed & Tube Lights',
    category: 'lighting',
    quantity: 8,
    wattage: 22,
    dailyUsageHours: 6,
  },
];

const PRESET_1BHK: ApplianceInput[] = [
  {
    id: 'p1_fans',
    name: 'Ceiling Fans',
    category: 'ceiling_fan',
    quantity: 2,
    wattage: 75,
    dailyUsageHours: 10,
    ageYears: 6,
  },
  {
    id: 'p1_lights',
    name: 'CFL / LED Bulbs',
    category: 'lighting',
    quantity: 4,
    wattage: 25,
    dailyUsageHours: 4,
  },
  {
    id: 'p1_tv',
    name: 'LED TV',
    category: 'television',
    quantity: 1,
    wattage: 70,
    dailyUsageHours: 4,
    standbyHours: 20,
  },
];

export const SavingsPlannerPage: React.FC = () => {
  // Input parameters
  const [billedUnits, setBilledUnits] = useState<number>(340);
  const [billAmount, setBillAmount] = useState<number>(2580);
  const [periodDays, setPeriodDays] = useState<number>(30);
  const [members, setMembers] = useState<number>(4);
  const [userBudget, setUserBudget] = useState<number>(5000);
  const [appliances, setAppliances] = useState<ApplianceInput[]>(PRESET_2BHK);

  // New appliance modal / inline adder state
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newCategory, setNewCategory] = useState<ApplianceCategory>('ceiling_fan');
  const [newName, setNewName] = useState<string>('');
  const [newWatts, setNewWatts] = useState<number>(75);
  const [newHours, setNewHours] = useState<number>(8);
  const [newQty, setNewQty] = useState<number>(1);
  const [newTemp, setNewTemp] = useState<number>(20);

  // Auto-populate from most recent confirmed bill in IndexedDB
  useEffect(() => {
    storageService.getSavedBills().then((bills) => {
      if (bills.length > 0) {
        const latest = bills[0];
        if (latest.unitsConsumed > 0) {
          setBilledUnits(latest.unitsConsumed);
          setBillAmount(latest.totalAmount);
        }
      }
    });
  }, []);

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

  const handleAddAppliance = (e: React.FormEvent) => {
    e.preventDefault();
    const item: ApplianceInput = {
      id: `app_${Date.now()}`,
      name: newName || newCategory.replace('_', ' ').toUpperCase(),
      category: newCategory,
      wattage: Number(newWatts) || 60,
      dailyUsageHours: Math.min(24, Math.max(0, Number(newHours) || 1)),
      quantity: Math.max(1, Number(newQty) || 1),
      temperatureSetpointC: newCategory === 'air_conditioner' ? newTemp : undefined,
    };
    setAppliances([...appliances, item]);
    setShowAddModal(false);
    setNewName('');
  };

  const handleDeleteAppliance = (id: string) => {
    setAppliances(appliances.filter((a) => a.id !== id));
  };

  const handleUpdateApplianceHours = (id: string, hours: number) => {
    setAppliances(
      appliances.map((a) =>
        a.id === id ? { ...a, dailyUsageHours: Math.min(24, Math.max(0, hours)) } : a
      )
    );
  };

  const handleUpdateApplianceSetpoint = (id: string, temp: number) => {
    setAppliances(
      appliances.map((a) =>
        a.id === id ? { ...a, temperatureSetpointC: temp } : a
      )
    );
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
            onClick={() => {
              setAppliances(PRESET_2BHK);
              setBilledUnits(340);
              setBillAmount(2580);
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 hover:border-emerald-300 text-slate-700 hover:bg-emerald-50/50 shadow-xs"
          >
            2BHK Urban (340 kWh)
          </button>
          <button
            onClick={() => {
              setAppliances(PRESET_3BHK);
              setBilledUnits(520);
              setBillAmount(4450);
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 hover:border-emerald-300 text-slate-700 hover:bg-emerald-50/50 shadow-xs"
          >
            3BHK Semi-Lux (520 kWh)
          </button>
          <button
            onClick={() => {
              setAppliances(PRESET_1BHK);
              setBilledUnits(120);
              setBillAmount(780);
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 hover:border-emerald-300 text-slate-700 hover:bg-emerald-50/50 shadow-xs"
          >
            1BHK Low-Load (120 kWh)
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

      {/* Main Grid: Inputs Column & Engine Outputs Column */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Input Parameters & Appliance Inventory */}
        <div className="lg:col-span-5 space-y-6">
          {/* Bill & Household Baseline */}
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              Bill Baseline & Budget Parameters
            </h3>

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
                Add
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

        {/* Right Column: Engine Outputs & Actionable Recommendations */}
        <div className="lg:col-span-7 space-y-6">
          {/* Status Alert for Insufficient Evidence or Invalid Input */}
          {engineResult.status !== 'success' && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-amber-950 space-y-2">
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

          {/* Aggregated Savings Opportunity Banner */}
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                <div>
                  <span className="text-xs text-slate-300 font-medium">Monthly Energy Reduction</span>
                  <p className="text-3xl font-black text-white mt-0.5">
                    {formatKwh(engineResult.potentialMonthlyKwhSavings)}
                  </p>
                  <p className="text-[11px] text-emerald-300 mt-0.5">
                    ~{Math.round((engineResult.potentialMonthlyKwhSavings / (engineResult.monthlyBilledKwh || 1)) * 100)}% of current bill
                  </p>
                </div>

                <div>
                  <span className="text-xs text-slate-300 font-medium">Estimated Monthly Savings</span>
                  <p className="text-3xl font-black text-amber-300 mt-0.5">
                    {formatCurrency(engineResult.potentialMonthlyInrSavings)}
                  </p>
                  <p className="text-[11px] text-emerald-300 mt-0.5">
                    {formatCurrency(engineResult.potentialMonthlyInrSavings * 12)} / year
                  </p>
                </div>

                <div>
                  <span className="text-xs text-slate-300 font-medium">Carbon Footprint Saved</span>
                  <p className="text-3xl font-black text-emerald-400 mt-0.5">
                    {formatCO2(engineResult.co2ReductionKgPerMonth / 1000)}
                  </p>
                  <p className="text-[11px] text-slate-300 mt-0.5">Every month</p>
                </div>
              </div>
            </div>
          )}

          {/* Appliance Consumption Breakdown Chart */}
          {engineResult.applianceBreakdown.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
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
              <CardContent>
                <ApplianceConsumptionChart breakdowns={engineResult.applianceBreakdown} />
              </CardContent>
            </Card>
          )}

          {/* Ranked Recommendations List */}
          {engineResult.recommendations.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">
                    Actionable Energy Saving Recommendations
                  </h3>
                  <p className="text-xs text-slate-500">
                    Ranked by affordability, expected benefit, and feasibility
                  </p>
                </div>
                <span className="text-xs text-slate-400">
                  {engineResult.recommendations.length} items
                </span>
              </div>

              <div className="space-y-4">
                {engineResult.recommendations.map((rec) => {
                  return (
                    <Card
                      key={rec.id}
                      hoverEffect
                      className={`p-5 transition-all ${
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
                            <span className="font-semibold text-slate-500 text-[11px]">Calculated Assumptions:</span>
                            <ul className="list-disc list-inside text-slate-500 text-[11px] space-y-0.5 mt-0.5">
                              {rec.assumptions.map((asm, idx) => (
                                <li key={idx}>{asm}</li>
                              ))}
                            </ul>
                          </div>

                          <div className="p-2.5 bg-emerald-50/50 rounded-lg flex items-center justify-between text-xs text-emerald-950">
                            <span className="font-medium">
                              <strong>Suggested Next Step:</strong> {rec.suggestedNextStep}
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
