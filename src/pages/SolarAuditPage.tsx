import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { SolarProductionChart } from '../components/charts/SolarProductionChart';
import { calculateSolarPotential } from '../utils/energyCalculations';
import { formatCurrency, formatKwh, formatCO2 } from '../utils/formatters';
import { dbService } from '../services/db';
import { useNotification } from '../context/NotificationContext';
import {
  Sun,
  ShieldCheck,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const SolarAuditPage: React.FC = () => {
  const { showNotification } = useNotification();

  const [rooftopArea, setRooftopArea] = useState<number>(350); // sq ft
  const [monthlyUnits, setMonthlyUnits] = useState<number>(350); // kWh
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const solarData = calculateSolarPotential(rooftopArea, monthlyUnits);

  const handleSaveAssessment = async () => {
    setIsSaving(true);
    try {
      await dbService.saveAssessment(solarData);
      showNotification(
        'success',
        'Solar Audit Saved Offline',
        `Evaluated ${solarData.recommendedSystemSizeKw} kW setup with ₹${solarData.centralSubsidyAmount} subsidy.`
      );
    } catch {
      showNotification('error', 'Failed to save', 'Could not save assessment locally.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Rooftop Solar ROI & Subsidy Audit
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Official PM Surya Ghar: Muft Bijli Yojana financial feasibility & payback calculator.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="amber" size="md" icon={<Sun className="w-3.5 h-3.5 text-amber-600" />}>
            PM Surya Ghar Scheme
          </Badge>
        </div>
      </div>

      {/* Main Form & Interactive Calculation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sliders & Configuration */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="p-6">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Sun className="w-5 h-5 text-amber-500" />
              Property & Energy Profile
            </h3>

            <div className="space-y-5">
              {/* Rooftop Area Slider */}
              <div>
                <div className="flex justify-between items-center text-xs font-semibold text-slate-700 mb-1">
                  <span>Shadow-Free Rooftop Area</span>
                  <span className="text-emerald-700 font-bold text-sm">{rooftopArea} sq ft</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="1200"
                  step="25"
                  value={rooftopArea}
                  onChange={(e) => setRooftopArea(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  ~100 sq ft shadow-free area is needed per 1 kW of solar capacity.
                </p>
              </div>

              {/* Monthly Consumption Slider */}
              <div>
                <div className="flex justify-between items-center text-xs font-semibold text-slate-700 mb-1">
                  <span>Average Monthly Electricity Consumption</span>
                  <span className="text-emerald-700 font-bold text-sm">{monthlyUnits} kWh</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="1000"
                  step="25"
                  value={monthlyUnits}
                  onChange={(e) => setMonthlyUnits(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Determines ideal system sizing for zero-net electricity bills.
                </p>
              </div>

              {/* Recommended Size Box */}
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
                  Recommended System Capacity
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-emerald-950">
                    {solarData.recommendedSystemSizeKw} kW
                  </span>
                  <span className="text-xs font-medium text-emerald-700">Grid-Tied Solar</span>
                </div>
                <p className="text-xs text-emerald-900 leading-relaxed">
                  Expected annual generation:{' '}
                  <span className="font-bold">{formatKwh(solarData.annualGenerationKwh)}</span>
                </p>
              </div>

              {/* Save Button */}
              <Button
                onClick={handleSaveAssessment}
                isLoading={isSaving}
                className="w-full"
                variant="solar"
                icon={<CheckCircle className="w-4 h-4" />}
              >
                Save Solar Audit to Offline Records
              </Button>
            </div>
          </Card>

          {/* Environmental Carbon Offset Card */}
          <Card variant="forest" className="p-6">
            <div className="flex items-center gap-2 mb-2 text-emerald-300">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-wider">Ecological Impact</span>
            </div>
            <h4 className="text-2xl font-black text-white">
              {formatCO2(solarData.co2ReductionTonsPerYear)}
            </h4>
            <p className="text-xs text-emerald-200/80 mt-1">
              Annual CO₂ emissions avoided based on Central Electricity Authority (CEA) national grid benchmarks.
            </p>
            <div className="mt-4 pt-3 border-t border-forest-800 flex items-center justify-between text-xs text-emerald-100">
              <span>Equivalent to planting:</span>
              <span className="font-bold text-amber-300">
                ~{Math.round(solarData.co2ReductionTonsPerYear * 45)} trees / yr
              </span>
            </div>
          </Card>
        </div>

        {/* Right Financial & Payback Column */}
        <div className="lg:col-span-7 space-y-6">
          {/* Financial Breakdown Card */}
          <Card>
            <CardHeader>
              <CardTitle>Government Subsidy & Capital Outlay</CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Benchmark rates under MNRE & PM Surya Ghar guidelines
              </p>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-xs text-slate-500 font-medium">Gross Cost</p>
                  <p className="text-lg font-bold text-slate-800 mt-1">
                    {formatCurrency(solarData.totalEstimatedCost)}
                  </p>
                  <p className="text-[11px] text-slate-400">₹60,000 / kW benchmark</p>
                </div>

                <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-100">
                  <p className="text-xs text-emerald-800 font-medium">Govt Subsidy</p>
                  <p className="text-lg font-bold text-emerald-700 mt-1">
                    -{formatCurrency(solarData.centralSubsidyAmount)}
                  </p>
                  <p className="text-[11px] text-emerald-600">Direct DBT to bank</p>
                </div>

                <div className="p-3.5 bg-forest-900 text-white rounded-xl">
                  <p className="text-xs text-emerald-300 font-medium">Net Outlay</p>
                  <p className="text-lg font-black text-white mt-1">
                    {formatCurrency(solarData.netCostAfterSubsidy)}
                  </p>
                  <p className="text-[11px] text-emerald-300/80">Out-of-pocket investment</p>
                </div>
              </div>

              {/* Payback Metric Pill */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-amber-50/70 border border-amber-200 rounded-2xl gap-2">
                <div>
                  <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
                    Investment Payback Period
                  </span>
                  <p className="text-2xl font-black text-amber-950">
                    {solarData.paybackPeriodYears} Years
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-xs font-medium text-slate-600">25-Year Net Profit</span>
                  <p className="text-lg font-black text-emerald-700">
                    {formatCurrency(solarData.twentyFiveYearSavingsInr)}
                  </p>
                </div>
              </div>

              {/* Monthly Production Chart */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Simulated 12-Month Solar Generation vs Load
                </p>
                <SolarProductionChart
                  systemSizeKw={solarData.recommendedSystemSizeKw}
                  monthlyAverageKwh={monthlyUnits}
                />
              </div>

              {/* Connect with Installers CTA */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
                <span className="text-xs text-slate-500">
                  Ready to compare quotes from verified local installers?
                </span>
                <Link to="/workforce">
                  <Button size="sm" variant="primary">
                    Compare Quotations →
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Subsidy Info Note */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 text-xs text-slate-600 flex items-start gap-3">
        <HelpCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-slate-900">How PM Surya Ghar Subsidy Works</p>
          <p className="leading-relaxed">
            The Central Government provides ₹30,000/kW for systems up to 2 kW, and an additional ₹18,000 for the 3rd kW (capped at ₹78,000). The consumer pays net cost to the empanelled vendor, and the subsidy is credited directly to the consumer's bank account (DBT) post net-meter installation.
          </p>
        </div>
      </div>
    </div>
  );
};

