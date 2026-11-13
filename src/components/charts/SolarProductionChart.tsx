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

interface SolarProductionChartProps {
  systemSizeKw: number;
  monthlyAverageKwh: number;
}

export const SolarProductionChart: React.FC<SolarProductionChartProps> = ({
  systemSizeKw,
  monthlyAverageKwh,
}) => {
  // Sunlight hours vary by month in India (higher in Mar-May, lower in monsoon Jul-Aug)
  const monthlyFactors = [
    { month: 'Jan', factor: 115 },
    { month: 'Feb', factor: 125 },
    { month: 'Mar', factor: 145 },
    { month: 'Apr', factor: 155 },
    { month: 'May', factor: 160 },
    { month: 'Jun', factor: 120 },
    { month: 'Jul', factor: 90 },
    { month: 'Aug', factor: 95 },
    { month: 'Sep', factor: 110 },
    { month: 'Oct', factor: 130 },
    { month: 'Nov', factor: 120 },
    { month: 'Dec', factor: 110 },
  ];

  const data = monthlyFactors.map((m) => {
    const solarGeneration = Math.round(systemSizeKw * m.factor);
    return {
      month: m.month,
      solarGen: solarGeneration,
      consumption: Math.round(monthlyAverageKwh * (m.month === 'May' || m.month === 'Jun' ? 1.3 : 0.9)),
    };
  });

  return (
    <div className="w-full h-64 sm:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
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
                const solar = payload.find((p) => p.dataKey === 'solarGen')?.value || 0;
                const grid = payload.find((p) => p.dataKey === 'consumption')?.value || 0;
                const net = Number(solar) - Number(grid);
                return (
                  <div className="bg-white p-3 rounded-xl shadow-premium border border-slate-100 text-xs">
                    <p className="font-bold text-slate-800 mb-1">{label} Estimation</p>
                    <p className="text-amber-600 font-semibold">☀️ Solar Gen: {solar} kWh</p>
                    <p className="text-slate-600">⚡ Home Load: {grid} kWh</p>
                    <p className={`mt-1 font-semibold ${net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {net >= 0 ? `Export Surplus: +${net} kWh` : `Grid Import: ${Math.abs(net)} kWh`}
                    </p>
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
          <Bar dataKey="solarGen" name="Solar Gen (kWh)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          <Bar dataKey="consumption" name="Household Load (kWh)" fill="#94a3b8" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
