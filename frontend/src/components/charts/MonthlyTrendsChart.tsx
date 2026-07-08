'use client';

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface MonthlyTrendsChartProps {
  data: Array<{
    month: string;
    month_label: string;
    total_applications: number;
    disbursed: number;
    rejected: number;
    fully_paid: number;
  }>;
}

export default function MonthlyTrendsChart({ data }: MonthlyTrendsChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-neutral-500 dark:text-neutral-400">
        No trend data available
      </div>
    );
  }

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="colorApplications" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorDisbursed" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorFullyPaid" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline-variant, #e2e8f0)" opacity={0.5} />
          <XAxis
            dataKey="month_label"
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--color-surface, #fff)',
              border: '1px solid var(--color-outline-variant, #e2e8f0)',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value: string) => (
              <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">{value}</span>
            )}
          />
          <Area
            type="monotone"
            dataKey="total_applications"
            name="Applications"
            stroke="#3b82f6"
            fill="url(#colorApplications)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="disbursed"
            name="Disbursed"
            stroke="#8b5cf6"
            fill="url(#colorDisbursed)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="fully_paid"
            name="Fully Paid"
            stroke="#10b981"
            fill="url(#colorFullyPaid)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
