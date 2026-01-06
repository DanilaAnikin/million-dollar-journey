'use client';

import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { PieChart as PieChartIcon } from 'lucide-react';
import { useCurrency } from '@/lib/contexts/CurrencyContext';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import type { Account, AccountCategory, Currency } from '@/types/database';

// Default color palette
const DEFAULT_COLORS = [
  '#10b981', // Emerald
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#f97316', // Orange
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#f59e0b', // Amber
  '#6366f1', // Indigo
];

export interface AllocationDataItem {
  name: string;
  value: number;
  color?: string;
  [key: string]: unknown;
}

interface AllocationChartProps {
  data?: AllocationDataItem[];
  accounts?: Account[];
  categories?: AccountCategory[];
  className?: string;
}

// Mock data for demonstration
const MOCK_DATA: AllocationDataItem[] = [
  { name: 'Investments', value: 45000, color: '#10b981' },
  { name: 'Cash', value: 15000, color: '#3b82f6' },
  { name: 'Bank Accounts', value: 25000, color: '#8b5cf6' },
  { name: 'Retirement', value: 35000, color: '#f97316' },
];

// Custom tooltip component defined outside to avoid recreating on each render
interface TooltipPayloadItem {
  payload: AllocationDataItem;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  total: number;
  formatAmount: (amount: number, currency: Currency) => string;
  displayCurrency: Currency;
}

function CustomTooltipContent({ active, payload, total, formatAmount, displayCurrency }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    const percentage = ((item.value / total) * 100).toFixed(1);
    return (
      <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
        <p className="font-medium text-sm">{item.name}</p>
        <p className="text-sm text-muted-foreground">
          {formatAmount(item.value, displayCurrency)} ({percentage}%)
        </p>
      </div>
    );
  }
  return null;
}

export function AllocationChart({
  data,
  accounts,
  categories,
  className = '',
}: AllocationChartProps) {
  const { currency: displayCurrency, convert, formatAmount } = useCurrency();
  const { t } = useLanguage();

  // Calculate allocation data from accounts if provided
  const chartData = useMemo(() => {
    // If explicit data is provided, use it
    if (data && data.length > 0) {
      return data.map((item, index) => ({
        ...item,
        color: item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
      }));
    }

    // If accounts and categories are provided, aggregate by category
    if (accounts && accounts.length > 0 && categories) {
      const categoryTotals = new Map<string, { name: string; value: number; color: string }>();

      // Also track uncategorized and investments separately
      let investmentTotal = 0;
      let cashTotal = 0;

      for (const account of accounts) {
        const balanceInDisplayCurrency = convert(
          account.balance,
          account.currency as Currency,
          displayCurrency
        );

        if (account.category_id) {
          const category = categories.find((c) => c.id === account.category_id);
          if (category) {
            const existing = categoryTotals.get(category.id);
            if (existing) {
              existing.value += balanceInDisplayCurrency;
            } else {
              categoryTotals.set(category.id, {
                name: category.name,
                value: balanceInDisplayCurrency,
                color: category.color || DEFAULT_COLORS[categoryTotals.size % DEFAULT_COLORS.length],
              });
            }
          }
        } else {
          // No category - group by investment vs cash
          if (account.is_investment) {
            investmentTotal += balanceInDisplayCurrency;
          } else {
            cashTotal += balanceInDisplayCurrency;
          }
        }
      }

      const result: AllocationDataItem[] = Array.from(categoryTotals.values());

      // Add uncategorized totals if any
      if (investmentTotal > 0) {
        result.push({
          name: t('dashboard.investments'),
          value: investmentTotal,
          color: '#10b981',
        });
      }
      if (cashTotal > 0) {
        result.push({
          name: t('dashboard.cash'),
          value: cashTotal,
          color: '#3b82f6',
        });
      }

      // Sort by value descending
      result.sort((a, b) => b.value - a.value);

      return result.length > 0 ? result : MOCK_DATA;
    }

    // Fall back to mock data
    return MOCK_DATA;
  }, [data, accounts, categories, convert, displayCurrency, t]);

  // Calculate total for center label and percentages
  const total = useMemo(() => {
    return chartData.reduce((sum, item) => sum + item.value, 0);
  }, [chartData]);

  if (chartData.length === 0) {
    return (
      <div className={`rounded-2xl border bg-card p-6 ${className}`}>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl bg-primary/10">
            <PieChartIcon className="h-5 w-5 text-primary" />
          </div>
          <span className="font-semibold">{t('dashboard.assetAllocation')}</span>
        </div>
        <div className="text-center py-8">
          <p className="text-muted-foreground">{t('dashboard.noData')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border bg-card p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-xl bg-primary/10">
          <PieChartIcon className="h-5 w-5 text-primary" />
        </div>
        <span className="font-semibold">{t('dashboard.assetAllocation')}</span>
      </div>

      {/* Chart Container */}
      <div className="relative h-[200px] w-full">
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            {t('dashboard.total')}
          </p>
          <p className="text-xl font-bold tracking-tight">
            {formatAmount(total, displayCurrency)}
          </p>
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
              stroke="none"
              animationBegin={0}
              animationDuration={800}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                  className="transition-all duration-200 hover:opacity-80 cursor-pointer"
                  style={{
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
                  }}
                />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => (
                <CustomTooltipContent
                  active={active}
                  payload={payload as TooltipPayloadItem[] | undefined}
                  total={total}
                  formatAmount={formatAmount}
                  displayCurrency={displayCurrency}
                />
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Custom Legend */}
      <div className="mt-6 space-y-2">
        {chartData.map((item, index) => {
          const percentage = ((item.value / total) * 100).toFixed(1);
          return (
            <div
              key={`legend-${index}`}
              className="flex items-center justify-between py-2 border-b border-border/30 last:border-0"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor: item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
                  }}
                />
                <span className="text-sm font-medium">{item.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  {formatAmount(item.value, displayCurrency)}
                </span>
                <span className="text-sm font-semibold w-12 text-right">
                  {percentage}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
