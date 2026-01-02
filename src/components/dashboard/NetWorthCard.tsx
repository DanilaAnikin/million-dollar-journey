'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { useCurrency } from '@/lib/contexts/CurrencyContext';
import type { Currency } from '@/types/database';

interface NetWorthCardProps {
  amount: number;
  sourceCurrency: Currency;
  previousAmount?: number;
  targetAmount: number;
}

export function NetWorthCard({
  amount,
  sourceCurrency,
  previousAmount,
  targetAmount
}: NetWorthCardProps) {
  const { t } = useLanguage();
  const { currency: globalCurrency, convert, formatAmount } = useCurrency();

  // Convert amounts to global currency for display
  const displayAmount = convert(amount, sourceCurrency, globalCurrency);
  const displayPreviousAmount = previousAmount ? convert(previousAmount, sourceCurrency, globalCurrency) : undefined;
  const displayTargetAmount = convert(targetAmount, sourceCurrency, globalCurrency);

  const progressPercentage = Math.min(100, (displayAmount / displayTargetAmount) * 100);
  const change = displayPreviousAmount ? displayAmount - displayPreviousAmount : 0;
  const changePercent = displayPreviousAmount ? ((displayAmount - displayPreviousAmount) / displayPreviousAmount) * 100 : 0;
  const isPositive = change >= 0;

  // Format the amounts using the global currency
  const formattedNetWorth = formatAmount(displayAmount, globalCurrency);
  const formattedChange = formatAmount(Math.abs(change), globalCurrency);

  return (
    <div className="relative overflow-hidden rounded-3xl shadow-lg hero-gradient">
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, rgba(255,255,255,0.2) 1px, transparent 1px)`,
          backgroundSize: '24px 24px'
        }} />
      </div>

      <div className="relative p-6 md:p-8">
        <div className="space-y-6">
          {/* Label */}
          <p className="text-sm font-medium text-white/70 uppercase tracking-wide">
            {t('dashboard.totalNetWorth')}
          </p>

          {/* Amount - HUGE */}
          <div className="flex items-baseline gap-3">
            <span className="text-4xl md:text-5xl font-bold tracking-tight text-white">
              {formattedNetWorth}
            </span>
          </div>

          {/* Change Indicator */}
          {previousAmount !== undefined && (
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
              isPositive
                ? 'bg-white/20 text-emerald-200'
                : 'bg-white/20 text-red-200'
            }`}>
              {isPositive ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span>
                {isPositive ? '+' : '-'}{formattedChange} ({changePercent.toFixed(1)}%)
              </span>
              <span className="text-white/60">{t('dashboard.thisMonth')}</span>
            </div>
          )}

          {/* Progress Bar */}
          <div className="space-y-3 pt-2">
            <div className="flex justify-between text-sm text-white/70">
              <span>{t('dashboard.progressToGoal')}</span>
              <span className="font-medium text-white">{progressPercentage.toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
