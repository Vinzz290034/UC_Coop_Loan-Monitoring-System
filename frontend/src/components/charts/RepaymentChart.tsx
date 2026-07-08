'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface RepaymentChartProps {
  data: Array<{
    month: string;
    month_label: string;
    payment_count: number;
    total_amount: number;
  }>;
}

const formatCurrency = (val: number) => {
  if (val >= 1000000) return `₱${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) return `₱${(val / 1000).toFixed(1)}K`;
  return `₱${val.toFixed(0)}`;
};

export default function RepaymentChart({ data }: RepaymentChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-neutral-500 dark:text-neutral-400">
        No repayment data available
      </div>
    );
  }

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
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
            tickFormatter={formatCurrency}
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
            formatter={(value: number) => [
              new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value),
              'Total Repayments',
            ]}
          />
          <Bar
            dataKey="total_amount"
            name="Repayment Amount"
            fill="#8b5cf6"
            radius={[6, 6, 0, 0]}
            maxBarSize={40}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
