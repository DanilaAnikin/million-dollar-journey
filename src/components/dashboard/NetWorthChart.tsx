'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { useCurrency } from '@/lib/contexts/CurrencyContext';
import type { Currency } from '@/types/database';

export interface NetWorthDataPoint {
  month: string;
  netWorth: number;
}

interface NetWorthChartProps {
  className?: string;
  goalAmount?: number;
  data?: NetWorthDataPoint[];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  formatAmount: (amount: number, currency: Currency) => string;
  currency: Currency;
}

// Generate realistic mock data showing growth over 12 months
function generateMockData(): NetWorthDataPoint[] {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  // Start at ~$150k and grow to ~$280k with realistic fluctuations
  const baseValues = [
    150000, 158000, 165000, 172000, 168000, 185000,
    195000, 210000, 225000, 240000, 260000, 280000
  ];

  return months.map((month, index) => ({
    month,
    netWorth: baseValues[index],
  }));
}

// Format large currency values (K for thousands, M for millions)
function formatYAxisValue(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value}`;
}

// Custom tooltip component with dark mode support
function CustomTooltip({
  active,
  payload,
  label,
  formatAmount,
  currency,
}: CustomTooltipProps) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const value = payload[0].value;

  return (
    <div className="rounded-lg border border-border/50 bg-popover px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
      <p className="text-sm font-semibold text-foreground">
        {formatAmount(value, currency)}
      </p>
    </div>
  );
}

export function NetWorthChart({
  className = '',
  goalAmount = 1000000,
  data,
}: NetWorthChartProps) {
  const { currency, formatAmount } = useCurrency();

  const chartData = data ?? generateMockData();

  // Calculate domain for Y-axis to include goal line
  const maxDataValue = Math.max(...chartData.map(d => d.netWorth));
  const yAxisMax = Math.max(maxDataValue, goalAmount) * 1.1;

  return (
    <div className={`w-full h-[300px] ${className}`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="currentColor"
            className="text-border/30"
          />

          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12 }}
            className="text-muted-foreground"
            dy={10}
          />

          <YAxis
            axisLine={false}
            tickLine={false}
            tickFormatter={formatYAxisValue}
            tick={{ fontSize: 12 }}
            className="text-muted-foreground"
            domain={[0, yAxisMax]}
            width={60}
          />

          <Tooltip
            content={({ active, payload, label }) => (
              <CustomTooltip
                active={active}
                payload={payload as Array<{ value: number }> | undefined}
                label={label as string}
                formatAmount={formatAmount}
                currency={currency}
              />
            )}
            cursor={{
              stroke: '#10b981',
              strokeWidth: 1,
              strokeDasharray: '4 4',
            }}
          />

          {/* Goal reference line */}
          <ReferenceLine
            y={goalAmount}
            stroke="#f59e0b"
            strokeDasharray="8 4"
            strokeWidth={2}
            label={{
              value: `Goal: ${formatYAxisValue(goalAmount)}`,
              position: 'right',
              fill: '#f59e0b',
              fontSize: 12,
              fontWeight: 500,
            }}
          />

          <Area
            type="monotone"
            dataKey="netWorth"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#netWorthGradient)"
            animationDuration={1000}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
