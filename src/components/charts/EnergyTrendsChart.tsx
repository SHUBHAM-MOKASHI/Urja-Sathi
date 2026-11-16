import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ElectricityBill } from '../../types';

interface EnergyTrendsChartProps {
  bills: ElectricityBill[];
}

export const EnergyTrendsChart: React.FC<EnergyTrendsChartProps> = ({ bills }) => {
  const chartData = useMemo(() => {
    return bills.map((b) => ({
      name: b.billMonth.split(' ')[0], // 'May', 'Jun', etc.
      units: b.unitsConsumed,
      cost: b.totalAmount,
      rate: b.tariffRatePerUnit,
    }));
  }, [bills]);

  return (
    <div className="w-full h-64 sm:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorUnits" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12, fill: '#64748b' }}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
            unit=" kWh"
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-white p-3 rounded-xl shadow-premium border border-slate-100 text-xs">
                    <p className="font-bold text-slate-800 mb-1">{label} Bill Summary</p>
                    <p className="text-emerald-700 font-semibold">
                      Consumption: {data.units} kWh
                    </p>
                    <p className="text-slate-600">
                      Total Bill: ₹{data.cost.toLocaleString('en-IN')}
                    </p>
                    <p className="text-slate-400 mt-1">
                      Avg Rate: ₹{data.rate}/unit
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Area
            type="monotone"
            dataKey="units"
            stroke="#059669"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#colorUnits)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

