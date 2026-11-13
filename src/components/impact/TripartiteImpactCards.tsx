import React from 'react';
import {
  ShieldCheck,
  Calculator,
  Compass,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  Coins,
  FileCheck2,
  Users,
  Info,
} from 'lucide-react';
import { TripartiteImpactSummary } from '../../types';
import { Badge } from '../common/Badge';

interface TripartiteImpactCardsProps {
  summary: TripartiteImpactSummary;
}

export const TripartiteImpactCards: React.FC<TripartiteImpactCardsProps> = ({ summary }) => {
  const { measuredImpact, estimatedImpact, potentialImpact } = summary;

  return (
    <div className="space-y-6">
      {/* Anti-Greenwashing & Separation Protocol Banner */}
      <div className="rounded-2xl bg-amber-50/80 border border-amber-200/90 p-4 sm:p-5 flex items-start gap-4 shadow-xs">
        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 text-amber-800">
          <AlertTriangle className="w-5 h-5 text-amber-700" />
        </div>
        <div className="space-y-1 text-sm text-amber-950">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-base text-amber-900">
              Audit Transparency Mandate: Strict Tripartite Impact Segregation
            </span>
            <Badge variant="amber" size="sm">
              Anti-Greenwashing Standard
            </Badge>
          </div>
          <p className="text-amber-900/90 leading-relaxed text-xs sm:text-sm">
            Public clean-energy programs frequently inflate outcomes by blending theoretical estimates with real utility bills.
            URJA SAATHI strictly mandates a three-tier separation. We{' '}
            <strong className="font-bold underline decoration-amber-600">never combine</strong>{' '}
            measured, estimated, and potential figures into a single vanity score.
          </p>
        </div>
      </div>

      {/* Tripartite Impact Metric Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tier 1: Measured Impact (Empirical Reality) */}
        <div className="rounded-2xl bg-gradient-to-br from-emerald-900 via-forest-900 to-forest-950 text-white p-6 shadow-premium border border-emerald-700/60 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 rounded-full bg-emerald-500/10 pointer-events-none blur-2xl" />

          <div>
            <div className="flex items-center justify-between gap-2 mb-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Tier 1: Measured Impact
              </span>
              <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                OCR Bill Verified
              </span>
            </div>

            <h3 className="text-xl font-extrabold text-white tracking-tight mb-1">
              Empirical Utility Savings
            </h3>
            <p className="text-xs text-emerald-200/80 mb-5 leading-relaxed">
              Real electricity reduction proven by comparing post-intervention OCR bills directly against audited baselines.
            </p>

            {/* Core Metrics */}
            <div className="space-y-4 mb-6">
              <div className="p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
                <div className="text-xs text-emerald-300 font-medium flex items-center justify-between">
                  <span>Verified Monthly Energy Drop</span>
                  <TrendingDown className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-white">
                    {measuredImpact.totalVerifiedSavingsKwhMonthly.toLocaleString()}
                  </span>
                  <span className="text-sm font-semibold text-emerald-300">kWh / month</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-[11px] text-emerald-300/90 block">Monthly Rupee Savings</span>
                  <div className="text-lg font-bold text-white mt-0.5 flex items-center">
                    <span className="text-xs text-emerald-300 mr-0.5">₹</span>
                    {measuredImpact.totalVerifiedSavingsInrMonthly.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-emerald-300/70">
                    ₹{measuredImpact.annualVerifiedSavingsInr.toLocaleString()}/yr
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-[11px] text-emerald-300/90 block">Consenting Households</span>
                  <div className="text-lg font-bold text-white mt-0.5 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>{measuredImpact.verifiedHouseholdsCount} Homes</span>
                  </div>
                  <span className="text-[10px] text-emerald-300/70">Dual bills verified</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-400/20">
                <div className="flex items-center justify-between text-xs text-emerald-200">
                  <span className="font-medium flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-amber-300" />
                    Verified Worker Livelihoods
                  </span>
                  <span className="font-bold text-amber-300 text-sm">
                    ₹{measuredImpact.verifiedWorkerEarningsInr.toLocaleString()}
                  </span>
                </div>
                <span className="text-[10px] text-emerald-300/70 mt-1 block">
                  Direct wages paid to certified wiremen, Surya Mitras & auditors
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-emerald-800/80 text-[11px] text-emerald-300/80 flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              <strong>Methodology:</strong> {measuredImpact.basisOfCalculation}
            </span>
          </div>
        </div>

        {/* Tier 2: Estimated Impact (Engineering Models) */}
        <div className="rounded-2xl bg-white border border-sky-200 p-6 shadow-subtle relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-200">
                <Calculator className="w-3.5 h-3.5 text-sky-600" />
                Tier 2: Estimated Impact
              </span>
              <span className="text-[11px] font-mono uppercase tracking-wider text-sky-700 font-bold bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                Receipts Logged
              </span>
            </div>

            <h3 className="text-xl font-extrabold text-slate-900 tracking-tight mb-1">
              Engineering Calculations
            </h3>
            <p className="text-xs text-slate-600 mb-5 leading-relaxed">
              Physics & thermodynamic calculations for documented completed interventions awaiting next DISCOM meter billing cycle.
            </p>

            {/* Core Metrics */}
            <div className="space-y-4 mb-6">
              <div className="p-4 rounded-xl bg-sky-50/70 border border-sky-100">
                <div className="text-xs text-sky-800 font-medium flex items-center justify-between">
                  <span>Simulated Monthly Drop</span>
                  <Calculator className="w-4 h-4 text-sky-600" />
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900">
                    {estimatedImpact.totalEstimatedSavingsKwhMonthly.toLocaleString()}
                  </span>
                  <span className="text-sm font-semibold text-sky-700">kWh / month</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[11px] text-slate-500 block">Expected Monthly Benefit</span>
                  <div className="text-lg font-bold text-slate-900 mt-0.5">
                    ₹{estimatedImpact.totalEstimatedSavingsInrMonthly.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-slate-400">
                    ₹{estimatedImpact.annualEstimatedSavingsInr.toLocaleString()}/yr
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[11px] text-slate-500 block">Awaiting Next Bill</span>
                  <div className="text-lg font-bold text-sky-700 mt-0.5 flex items-center gap-1.5">
                    <FileCheck2 className="w-4 h-4 text-sky-600" />
                    <span>{estimatedImpact.partiallyVerifiedHouseholdsCount} Homes</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Work finished, bill pending</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600">
                <span className="font-semibold text-slate-800 block mb-0.5">
                  Pre-Verification Status
                </span>
                <span>
                  Physical hardware installed (e.g. BLDC fans, AC tuning). Awaiting next meter read to promote to Tier 1.
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" />
            <span>
              <strong>Methodology:</strong> {estimatedImpact.basisOfCalculation}
            </span>
          </div>
        </div>

        {/* Tier 3: Potential Impact (Unrealized Pipeline) */}
        <div className="rounded-2xl bg-white border border-amber-200 p-6 shadow-subtle relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                <Compass className="w-3.5 h-3.5 text-amber-600" />
                Tier 3: Potential Impact
              </span>
              <span className="text-[11px] font-mono uppercase tracking-wider text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Pending Adoption
              </span>
            </div>

            <h3 className="text-xl font-extrabold text-slate-900 tracking-tight mb-1">
              Unrealized Pipeline
            </h3>
            <p className="text-xs text-slate-600 mb-5 leading-relaxed">
              Recommended energy interventions generated by the URJA SAATHI intelligence engine awaiting household financing or adoption.
            </p>

            {/* Core Metrics */}
            <div className="space-y-4 mb-6">
              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-100">
                <div className="text-xs text-amber-800 font-medium flex items-center justify-between">
                  <span>Identified Energy Potential</span>
                  <Compass className="w-4 h-4 text-amber-600" />
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900">
                    {potentialImpact.totalPotentialSavingsKwhMonthly.toLocaleString()}
                  </span>
                  <span className="text-sm font-semibold text-amber-700">kWh / month</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[11px] text-slate-500 block">Identified Rupee Savings</span>
                  <div className="text-lg font-bold text-slate-900 mt-0.5">
                    ₹{potentialImpact.totalPotentialSavingsInrMonthly.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-slate-400">
                    ₹{potentialImpact.annualPotentialSavingsInr.toLocaleString()}/yr
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[11px] text-slate-500 block">Pending Interventions</span>
                  <div className="text-lg font-bold text-amber-700 mt-0.5 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-amber-600" />
                    <span>{potentialImpact.pendingActionCount} Actions</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Solar, BLDC, LED etc.</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600">
                <span className="font-semibold text-slate-800 block mb-0.5">
                  Pipeline Integrity Policy
                </span>
                <span>
                  Never counted as achieved savings until certified installation and OCR subsequent bill verification occurs.
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
            <span>
              <strong>Methodology:</strong> {potentialImpact.basisOfCalculation}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
