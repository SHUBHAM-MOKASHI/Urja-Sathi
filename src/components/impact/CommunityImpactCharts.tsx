import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { TripartiteImpactSummary } from '../../types';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';
import { TrendingUp, BarChart2, Coins, Calendar, Sparkles } from 'lucide-react';

interface MonthlyTrajectoryPoint {
  month: string;
  measuredKwhSaved: number;
  estimatedKwhSaved: number;
  workerEarningsDisbursedInr: number;
  completedJobs: number;
}

interface CommunityImpactChartsProps {
  tripartiteSummary: TripartiteImpactSummary;
  monthlyTrajectory: MonthlyTrajectoryPoint[];
}

export const CommunityImpactCharts: React.FC<CommunityImpactChartsProps> = ({
  tripartiteSummary,
  monthlyTrajectory,
}) => {
  const [comparisonMetric, setComparisonMetric] = useState<'kwh' | 'inr'>('kwh');

  // Tripartite comparison data
  const tripartiteComparisonData = [
    {
      tier: 'Tier 1: Measured',
      fullName: 'Measured Impact (Audited Bills)',
      kwh: tripartiteSummary.measuredImpact.totalVerifiedSavingsKwhMonthly,
      inr: tripartiteSummary.measuredImpact.totalVerifiedSavingsInrMonthly,
      confidence: '100% Empirical',
      color: '#059669', // Emerald
    },
    {
      tier: 'Tier 2: Estimated',
      fullName: 'Estimated Impact (Engineering Models)',
      kwh: tripartiteSummary.estimatedImpact.totalEstimatedSavingsKwhMonthly,
      inr: tripartiteSummary.estimatedImpact.totalEstimatedSavingsInrMonthly,
      confidence: 'Engineering Model (BEE)',
      color: '#0284c7', // Sky / Blue
    },
    {
      tier: 'Tier 3: Potential',
      fullName: 'Potential Impact (Unrealized Pipeline)',
      kwh: tripartiteSummary.potentialImpact.totalPotentialSavingsKwhMonthly,
      inr: tripartiteSummary.potentialImpact.totalPotentialSavingsInrMonthly,
      confidence: 'Pipeline Estimate',
      color: '#d97706', // Amber
    },
  ];

  return (
    <div className="space-y-6">
      {/* 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Tripartite Impact Comparison */}
        <Card className="flex flex-col justify-between">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base text-slate-900">
                <BarChart2 className="w-5 h-5 text-emerald-700" />
                <span>Tripartite Impact Comparison</span>
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Side-by-side comparison illustrating distinct audit evidentiary certainty
              </p>
            </div>

            {/* Toggle metric */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setComparisonMetric('kwh')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  comparisonMetric === 'kwh'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Monthly kWh
              </button>
              <button
                type="button"
                onClick={() => setComparisonMetric('inr')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  comparisonMetric === 'inr'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Monthly ₹ (INR)
              </button>
            </div>
          </CardHeader>

          <CardContent className="pt-2 pb-4">
            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={tripartiteComparisonData}
                  margin={{ top: 20, right: 20, left: 0, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="tier"
                    tick={{ fontSize: 11, fill: '#475569', fontWeight: 500 }}
                    tickLine={false}
                    axisLine={{ stroke: '#cbd5e1' }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={false}
                    unit={comparisonMetric === 'kwh' ? ' kWh' : ' ₹'}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="bg-white p-3.5 rounded-xl shadow-premium border border-slate-200 text-xs space-y-1.5 min-w-[200px]">
                            <p className="font-bold text-slate-900">{item.fullName}</p>
                            <div className="flex justify-between items-center text-slate-700">
                              <span>Energy Savings:</span>
                              <strong className="text-emerald-700 font-bold">
                                {item.kwh.toLocaleString()} kWh/mo
                              </strong>
                            </div>
                            <div className="flex justify-between items-center text-slate-700">
                              <span>Monetary Savings:</span>
                              <strong className="text-slate-900 font-bold">
                                ₹{item.inr.toLocaleString()}/mo
                              </strong>
                            </div>
                            <div className="pt-1.5 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-500">
                              <span>Audit Standard:</span>
                              <span className="font-semibold text-slate-700">{item.confidence}</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey={comparisonMetric}
                    radius={[8, 8, 0, 0]}
                    maxBarSize={60}
                  >
                    {tripartiteComparisonData.map((entry, index) => (
                      <Cell key={`bar-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-600 mt-2 pt-2 border-t border-slate-100">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-emerald-600 shrink-0" />
                Tier 1: Measured (Empirical)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-sky-600 shrink-0" />
                Tier 2: Estimated (Engineering)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-amber-600 shrink-0" />
                Tier 3: Potential (Pipeline)
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Chart 2: 6-Month Community Savings Trajectory */}
        <Card className="flex flex-col justify-between">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base text-slate-900">
                <TrendingUp className="w-5 h-5 text-emerald-700" />
                <span>6-Month Energy Reduction Trajectory</span>
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Growth in empirically measured vs modeled kWh savings across the community
              </p>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <Calendar className="w-3.5 h-3.5 text-emerald-700" />
              Sep '25 — Feb '26
            </span>
          </CardHeader>

          <CardContent className="pt-2 pb-4">
            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={monthlyTrajectory}
                  margin={{ top: 20, right: 20, left: 0, bottom: 20 }}
                >
                  <defs>
                    <linearGradient id="colorMeasured" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorEstimated" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0284c7" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={{ stroke: '#cbd5e1' }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={false}
                    unit=" kWh"
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white p-3.5 rounded-xl shadow-premium border border-slate-200 text-xs space-y-1.5 min-w-[210px]">
                            <p className="font-bold text-slate-900 border-b border-slate-100 pb-1">
                              {label} Community Audit
                            </p>
                            <div className="flex justify-between items-center text-emerald-800">
                              <span>Measured Savings:</span>
                              <strong className="font-bold">
                                {payload[0]?.value?.toLocaleString()} kWh
                              </strong>
                            </div>
                            <div className="flex justify-between items-center text-sky-800">
                              <span>Estimated Savings:</span>
                              <strong className="font-bold">
                                {payload[1]?.value?.toLocaleString()} kWh
                              </strong>
                            </div>
                            <div className="pt-1.5 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-500">
                              <span>Completed Interventions:</span>
                              <span className="font-bold text-slate-800">
                                {payload[0]?.payload?.completedJobs} jobs
                              </span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="measuredKwhSaved"
                    name="Measured kWh (Empirical)"
                    stroke="#059669"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorMeasured)"
                  />
                  <Area
                    type="monotone"
                    dataKey="estimatedKwhSaved"
                    name="Estimated kWh (Simulated)"
                    stroke="#0284c7"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    fillOpacity={1}
                    fill="url(#colorEstimated)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-600 mt-2 pt-2 border-t border-slate-100">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-emerald-600 shrink-0" />
                Measured Savings (Empirical Utility Bills)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-sky-600 border-dashed border-b-2 shrink-0" />
                Estimated Savings (Completed Interventions)
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart 3: Worker Livelihoods Disbursed Trajectory (Har Haath Kaam) */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base text-slate-900">
              <Coins className="w-5 h-5 text-amber-600" />
              <span>Har Haath Kaam: Worker Livelihoods & Wage Disbursal</span>
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Verified wages paid directly to local electricians, Surya Mitras, and community energy guides
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            Direct Economic Multiplier
          </span>
        </CardHeader>

        <CardContent className="pt-2 pb-4">
          <div className="w-full h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlyTrajectory}
                margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                  unit=" ₹"
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                  unit=" jobs"
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3.5 rounded-xl shadow-premium border border-slate-200 text-xs space-y-1.5 min-w-[200px]">
                          <p className="font-bold text-slate-900 border-b border-slate-100 pb-1">
                            {label} Worker Outcomes
                          </p>
                          <div className="flex justify-between items-center text-amber-900">
                            <span>Disbursed Wages:</span>
                            <strong className="font-bold">
                              ₹{data.workerEarningsDisbursedInr.toLocaleString()}
                            </strong>
                          </div>
                          <div className="flex justify-between items-center text-emerald-800">
                            <span>Completed Jobs:</span>
                            <strong className="font-bold">{data.completedJobs} assignments</strong>
                          </div>
                          <p className="text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                            Avg Wage/Job: ₹{Math.round(data.workerEarningsDisbursedInr / data.completedJobs)}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  yAxisId="left"
                  dataKey="workerEarningsDisbursedInr"
                  name="Verified Wages Paid (₹)"
                  fill="#d97706"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={45}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="completedJobs"
                  name="Completed Jobs"
                  stroke="#059669"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#059669' }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-600 mt-2 pt-2 border-t border-slate-100">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-amber-600 shrink-0" />
              Verified Wages Disbursed to Local Workers (₹)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-emerald-600 shrink-0" />
              Completed Service Assignments
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
