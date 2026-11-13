import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { ApplianceBreakdown } from '../../types';

interface ApplianceConsumptionChartProps {
  breakdowns: ApplianceBreakdown[];
}

const APPLIANCE_COLORS = [
  '#059669', // emerald
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#10b981', // light emerald
  '#64748b', // slate
];

export const ApplianceConsumptionChart: React.FC<ApplianceConsumptionChartProps> = ({ breakdowns }) => {
  const data = breakdowns.map((b) => ({
    name: b.name,
    value: b.monthlyKwh,
    cost: b.monthlyCostInr,
    pct: b.percentageOfTotal,
    hours: b.dailyUsageHours,
  }));

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 text-xs">
        No appliance consumption data available.
      </div>
    );
  }

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={APPLIANCE_COLORS[index % APPLIANCE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload;
                return (
                  <div className="bg-white p-3 rounded-xl shadow-premium border border-slate-100 text-xs space-y-1">
                    <p className="font-bold text-slate-800">{item.name}</p>
                    <p className="text-emerald-700 font-semibold">{item.value} kWh / month ({item.pct}%)</p>
                    <p className="text-slate-600">Est. Cost: ₹{item.cost.toLocaleString('en-IN')}</p>
                    <p className="text-slate-400">Run time: {item.hours} hrs/day</p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

