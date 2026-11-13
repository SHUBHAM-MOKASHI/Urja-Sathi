import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface SlabItem {
  slabName: string;
  units: number;
  rate: number;
  amount: number;
}

interface SlabBreakdownChartProps {
  slabs: SlabItem[];
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

export const SlabBreakdownChart: React.FC<SlabBreakdownChartProps> = ({ slabs }) => {
  const data = slabs.map((s) => ({
    name: s.slabName.split('(')[0].trim(),
    value: s.units,
    amount: s.amount,
    rate: s.rate,
  }));

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={80}
            paddingAngle={4}
            dataKey="value"
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload;
                return (
                  <div className="bg-white p-3 rounded-xl shadow-premium border border-slate-100 text-xs">
                    <p className="font-bold text-slate-800">{item.name}</p>
                    <p className="text-slate-600 mt-0.5">Units: {item.value} kWh</p>
                    <p className="text-emerald-700 font-semibold">Cost: ₹{item.amount}</p>
                    <p className="text-slate-400">Rate: ₹{item.rate}/unit</p>
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
