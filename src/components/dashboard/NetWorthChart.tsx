'use client';

import { useState, useMemo } from 'react';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Currency } from '@/types/database';

export interface NetWorthDataPoint {
  month: string;
  netWorth: number;
}

export type TimeRange = '1W' | '1M' | '1Y' | '10Y' | 'ALL';

interface NetWorthChartProps {
  className?: string;
  goalAmount?: number;
  data?: NetWorthDataPoint[];
  selectedRange?: TimeRange;
  onRangeChange?: (range: TimeRange) => void;
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
  selectedRange: externalSelectedRange,
  onRangeChange,
}: NetWorthChartProps) {
  const { currency, formatAmount } = useCurrency();
  const [internalSelectedRange, setInternalSelectedRange] = useState<TimeRange>('ALL');

  // Use external state if provided, otherwise use internal state
  const selectedRange = externalSelectedRange ?? internalSelectedRange;
  const handleRangeChange = onRangeChange ?? setInternalSelectedRange;

  const chartData = data ?? generateMockData();

  // Filter data based on selected time range
  const filteredData = useMemo(() => {
    if (selectedRange === 'ALL') {
      return chartData;
    }

    const rangeMap: Record<TimeRange, number> = {
      '1W': 0.25, // Approximately 1 week in months
      '1M': 1,
      '1Y': 12,
      '10Y': 120,
      'ALL': chartData.length,
    };

    const monthsToShow = rangeMap[selectedRange];
    return chartData.slice(-Math.ceil(monthsToShow));
  }, [chartData, selectedRange]);

  // Calculate performance metrics
  const performanceData = useMemo(() => {
    if (filteredData.length < 2) {
      return { absolute: 0, percentage: 0 };
    }

    const currentValue = filteredData[filteredData.length - 1].netWorth;
    const previousValue = filteredData[0].netWorth;
    const absolute = currentValue - previousValue;
    const percentage = previousValue !== 0 ? (absolute / previousValue) * 100 : 0;

    return { absolute, percentage };
  }, [filteredData]);

  const currentNetWorth = filteredData.length > 0
    ? filteredData[filteredData.length - 1].netWorth
    : 0;

  // Calculate domain for Y-axis to include goal line
  const maxDataValue = Math.max(...filteredData.map(d => d.netWorth));
  const yAxisMax = Math.max(maxDataValue, goalAmount) * 1.1;

  const isPositiveChange = performanceData.absolute >= 0;

  return (
    <div className={className}>
      {/* Header with Time Range Controls */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          {/* Current Net Worth */}
          <div className="text-3xl font-bold mb-2">
            {formatAmount(currentNetWorth, currency)}
          </div>

          {/* Period Change */}
          <div className="flex items-center gap-2 text-sm">
            <span
              className={`font-semibold ${
                isPositiveChange ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'
              }`}
            >
              {isPositiveChange ? '+' : ''}
              {formatAmount(performanceData.absolute, currency)}
              {' '}
              ({isPositiveChange ? '+' : ''}
              {performanceData.percentage.toFixed(2)}%)
            </span>
            <span className="text-muted-foreground">this period</span>
          </div>
        </div>

        {/* Time Range Controls */}
        <Tabs value={selectedRange} onValueChange={(value) => handleRangeChange(value as TimeRange)}>
          <TabsList>
            <TabsTrigger value="1W">1W</TabsTrigger>
            <TabsTrigger value="1M">1M</TabsTrigger>
            <TabsTrigger value="1Y">1Y</TabsTrigger>
            <TabsTrigger value="10Y">10Y</TabsTrigger>
            <TabsTrigger value="ALL">ALL</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Chart */}
      <div className="w-full h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={filteredData}
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
    </div>
  );
}
