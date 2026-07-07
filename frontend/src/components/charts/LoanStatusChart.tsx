'use client';

import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';

interface LoanStatusChartProps {
  data: Array<{
    status: string;
    count: number;
    total_amount: number;
  }>;
}

const STATUS_COLORS: Record<string, string> = {
  pending_approval: '#f59e0b',
  approved: '#3b82f6',
  disbursed: '#8b5cf6',
  fully_paid: '#10b981',
  defaulted: '#ef4444',
  rejected: '#6b7280',
};

const STATUS_LABELS: Record<string, string> = {
  pending_approval: 'Pending',
  approved: 'Approved',
  disbursed: 'Active',
  fully_paid: 'Fully Paid',
  defaulted: 'Defaulted',
  rejected: 'Rejected',
};

export default function LoanStatusChart({ data }: LoanStatusChartProps) {
  const chartData = data.map(item => ({
    name: STATUS_LABELS[item.status] || item.status,
    value: item.count,
    amount: item.total_amount,
    fill: STATUS_COLORS[item.status] || '#94a3b8',
  }));

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-neutral-500 dark:text-neutral-400">
        No loan data available
      </div>
    );
  }

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={90}
            paddingAngle={3}
            dataKey="value"
            stroke="none"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--color-surface, #fff)',
              border: '1px solid var(--color-outline-variant, #e2e8f0)',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            }}
            formatter={(value: number, name: string) => [`${value} loan(s)`, name]}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value: string) => (
              <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
