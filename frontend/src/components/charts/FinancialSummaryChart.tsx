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

interface FinancialSummaryChartProps {
  data: Array<{
    month: string;
    month_label: string;
    share_capital_credits: number;
    loan_disbursements: number;
  }>;
}

const formatCurrency = (val: number) => {
  if (val >= 1000000) return `₱${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) return `₱${(val / 1000).toFixed(1)}K`;
  return `₱${val.toFixed(0)}`;
};

export default function FinancialSummaryChart({ data }: FinancialSummaryChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-neutral-500 dark:text-neutral-400">
        No financial data available
      </div>
    );
  }

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="colorShareCapital" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorLoanDisbursements" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
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
            formatter={(value: any) => [
              new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(value || 0)),
            ]}
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
            dataKey="share_capital_credits"
            name="Share Capital Contributions"
            stroke="#10b981"
            fill="url(#colorShareCapital)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="loan_disbursements"
            name="Loan Disbursements"
            stroke="#f59e0b"
            fill="url(#colorLoanDisbursements)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
