import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { SolarScenario } from '../../types';

interface SolarScenarioComparisonChartProps {
  scenarios: {
    conservative: SolarScenario;
    central: SolarScenario;
    optimistic: SolarScenario;
  };
}

export const SolarScenarioComparisonChart: React.FC<SolarScenarioComparisonChartProps> = ({
  scenarios,
}) => {
  const chartData = [
    {
      metric: 'Annual Yield (kWh)',
      Conservative: scenarios.conservative.annualGenerationKwh,
      Central: scenarios.central.annualGenerationKwh,
      Optimistic: scenarios.optimistic.annualGenerationKwh,
    },
    {
      metric: 'Net Savings (₹/yr)',
      Conservative: scenarios.conservative.annualNetBenefitInr,
      Central: scenarios.central.annualNetBenefitInr,
      Optimistic: scenarios.optimistic.annualNetBenefitInr,
    },
  ];

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="metric"
            tick={{ fontSize: 12, fill: '#475569', fontWeight: 600 }}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-white p-3 rounded-xl shadow-premium border border-slate-100 text-xs space-y-1">
                    <p className="font-bold text-slate-800">{label}</p>
                    {payload.map((entry, index) => (
                      <p key={index} style={{ color: entry.color }} className="font-semibold">
                        {entry.name}: {Number(entry.value).toLocaleString('en-IN')}
                      </p>
                    ))}
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }}
          />
          <Bar dataKey="Conservative" fill="#94a3b8" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Central" fill="#059669" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Optimistic" fill="#f59e0b" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
