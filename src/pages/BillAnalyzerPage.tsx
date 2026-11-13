import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { SlabBreakdownChart } from '../components/charts/SlabBreakdownChart';
import { calculateSlabBreakdown } from '../utils/energyCalculations';
import { formatCurrency, formatKwh } from '../utils/formatters';
import { dbService } from '../services/db';
import { useNotification } from '../context/NotificationContext';
import { useApp } from '../context/AppContext';
import { ElectricityBill } from '../types';
import {
  FileText,
  AlertTriangle,
  Lightbulb,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';

export const BillAnalyzerPage: React.FC = () => {
  const { showNotification } = useNotification();
  const { refreshCounters } = useApp();

  const [units, setUnits] = useState<number>(340);
  const [billMonth, setBillMonth] = useState<string>('November 2024');
  const [consumerNo, setConsumerNo] = useState<string>('MP-04-9843210');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const breakdownResult = calculateSlabBreakdown(units);
  const highestSlab = breakdownResult.breakdown[breakdownResult.breakdown.length - 1];

  const handleSaveToIndexedDB = async () => {
    setIsSaving(true);
    try {
      const newBill: ElectricityBill = {
        id: `bill_${Date.now()}`,
        billMonth,
        consumerNumber: consumerNo,
        unitsConsumed: units,
        totalAmount: breakdownResult.totalBill,
        tariffRatePerUnit: Number((breakdownResult.totalBill / units).toFixed(2)),
        fixedCharges: breakdownResult.fixedCharges,
        surcharges: breakdownResult.electricityDuty,
        dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
        billDate: new Date().toISOString().split('T')[0],
        isPeakSeason: false,
        source: 'manual',
        slabBreakdown: breakdownResult.breakdown,
        createdAt: new Date().toISOString(),
      };

      await dbService.saveBill(newBill);
      await refreshCounters();
      showNotification('success', 'Bill Saved Successfully', `Saved ${billMonth} bill to offline IndexedDB.`);
    } catch {
      showNotification('error', 'Save Failed', 'Could not save bill locally.');
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
            Electricity Bill Analyzer
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Decode telescopic tariff slabs, avoid punitive higher tiers, and understand every rupee charged.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="emerald" size="md">
            Telescopic Tariff Logic
          </Badge>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Input & Details Column */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="p-6">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600" />
              Bill Parameters
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Total Monthly Units Consumed (kWh)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="3000"
                    value={units}
                    onChange={(e) => setUnits(Math.max(1, Number(e.target.value)))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    Units
                  </span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="800"
                  step="10"
                  value={units}
                  onChange={(e) => setUnits(Number(e.target.value))}
                  className="w-full mt-2 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Bill Month / Period
                </label>
                <input
                  type="text"
                  value={billMonth}
                  onChange={(e) => setBillMonth(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Consumer / Meter Account ID
                </label>
                <input
                  type="text"
                  value={consumerNo}
                  onChange={(e) => setConsumerNo(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              <div className="pt-2">
                <Button
                  onClick={handleSaveToIndexedDB}
                  isLoading={isSaving}
                  className="w-full"
                  icon={<CheckCircle className="w-4 h-4" />}
                >
                  Save Bill to Offline Database
                </Button>
              </div>
            </div>
          </Card>

          {/* Punitive Slab Warning Banner */}
          {highestSlab && highestSlab.rate >= 7.9 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-950 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold">Higher Tariff Tier Triggered!</p>
                <p className="text-amber-900 leading-relaxed">
                  You are consuming {highestSlab.units} units in the expensive{' '}
                  <span className="font-bold">{highestSlab.slabName}</span> at ₹{highestSlab.rate}/unit.
                  Reducing just 40 units can pull your entire marginal usage down into a cheaper bracket.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Breakdown & Visuals Column */}
        <div className="lg:col-span-7 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Telescopic Slab Calculation</CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  DISCOM slabs applied progressively (Lifeline to Peak)
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 font-medium">Calculated Bill</p>
                <p className="text-xl font-black text-emerald-800">
                  {formatCurrency(breakdownResult.totalBill)}
                </p>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Pie Breakdown of Units */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Unit Distribution Across Slabs
                </p>
                <SlabBreakdownChart slabs={breakdownResult.breakdown} />
              </div>

              {/* Table of Slabs */}
              <div className="border border-slate-100 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 font-semibold text-slate-600">
                    <tr>
                      <th className="py-2.5 px-3">Tariff Slab</th>
                      <th className="py-2.5 px-3 text-right">Units</th>
                      <th className="py-2.5 px-3 text-right">Rate</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {breakdownResult.breakdown.map((s, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-medium text-slate-800">{s.slabName}</td>
                        <td className="py-2.5 px-3 text-right text-emerald-700 font-semibold">
                          {formatKwh(s.units)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-600">₹{s.rate}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                          {formatCurrency(s.amount)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50 font-medium text-slate-600">
                      <td colSpan={3} className="py-2 px-3 text-right">
                        Fixed Meter Rent / Demand Charges:
                      </td>
                      <td className="py-2 px-3 text-right font-semibold">
                        {formatCurrency(breakdownResult.fixedCharges)}
                      </td>
                    </tr>
                    <tr className="bg-slate-50 font-medium text-slate-600">
                      <td colSpan={3} className="py-2 px-3 text-right">
                        Electricity Duty & Surcharges (5%):
                      </td>
                      <td className="py-2 px-3 text-right font-semibold">
                        {formatCurrency(breakdownResult.electricityDuty)}
                      </td>
                    </tr>
                    <tr className="bg-emerald-50 text-emerald-950 font-bold text-sm">
                      <td colSpan={3} className="py-3 px-3 text-right">
                        Estimated Final Payable:
                      </td>
                      <td className="py-3 px-3 text-right text-emerald-900 font-black">
                        {formatCurrency(breakdownResult.totalBill)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Advice Box */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-600 space-y-1">
                  <p className="font-bold text-slate-800">Did you know?</p>
                  <p>
                    Indian state DISCOMs penalize higher consumption brackets heavily. Moving from 300 to 301 units triggers the higher ₹7.9/unit tier for all overflow energy.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Optical Recognition (OCR) Foundation Note */}
      <Card className="p-6 bg-gradient-to-r from-emerald-50/50 to-slate-50 border-emerald-100">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-emerald-600" />
              Offline Bill Photo Scanning (Tesseract.js Engine)
            </h4>
            <p className="text-xs text-slate-600 max-w-2xl">
              URJA SAATHI supports client-side bill parsing without cloud dependencies. In upcoming steps, users can snap a photo of any state electricity bill to extract units and tariff automatically.
            </p>
          </div>
          <Badge variant="emerald" size="sm">
            Tesseract OCR Ready
          </Badge>
        </div>
      </Card>
    </div>
  );
};
