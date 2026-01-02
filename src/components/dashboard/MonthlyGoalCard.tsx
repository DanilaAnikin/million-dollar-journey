'use client';

import { Target, Calendar, Sparkles, Info } from 'lucide-react';
import { MathExplanationDialog } from './MathExplanationDialog';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { useCurrency } from '@/lib/contexts/CurrencyContext';
import type { CalculationResult } from '@/lib/services/calculator';

interface MonthlyGoalCardProps {
  monthlyContributionUSD: number;
  monthsRemaining: number;
  yearsRemaining: number;
  onTrack: boolean;
  calculation?: CalculationResult;
}

export function MonthlyGoalCard({
  monthlyContributionUSD,
  monthsRemaining,
  yearsRemaining,
  onTrack,
  calculation,
}: MonthlyGoalCardProps) {
  const { t } = useLanguage();
  const { currency: globalCurrency, convert, formatAmount } = useCurrency();

  // Convert the monthly contribution from USD (base) to the global display currency
  const displayAmount = convert(monthlyContributionUSD, 'USD', globalCurrency);
  const formattedGoal = formatAmount(displayAmount, globalCurrency);

  const cardContent = (
    <div className={`rounded-2xl border bg-card p-6 transition-all hover:shadow-md ${
      onTrack ? 'border-emerald-500/30' : 'border-amber-500/30'
    } ${calculation ? 'cursor-pointer' : ''}`}>
      <div className="space-y-5">
        {/* Header with icon and info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Icon in colored squircle */}
            <div className={`p-3 rounded-xl ${
              onTrack ? 'bg-emerald-500/10' : 'bg-amber-500/10'
            }`}>
              <Target className={`h-5 w-5 ${
                onTrack ? 'text-emerald-500' : 'text-amber-500'
              }`} />
            </div>
            <span className="text-sm font-medium text-muted-foreground">
              {t('dashboard.monthlyContribution')}
            </span>
          </div>
          {calculation && (
            <Info className="h-4 w-4 text-muted-foreground" />
          )}
        </div>

        {/* Main Number */}
        <div className="flex items-baseline gap-2">
          <span className="text-2xl md:text-3xl font-bold tracking-tight">
            {formattedGoal}
          </span>
          <span className="text-sm text-muted-foreground">{t('dashboard.perMonth')}</span>
        </div>

        {/* Status Pill */}
        <div>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
            onTrack
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
          }`}>
            <Sparkles className="h-3.5 w-3.5" />
            {onTrack ? t('dashboard.onTrack') : t('dashboard.needMore')}
          </span>
        </div>

        {/* Time Remaining */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground pt-3 border-t border-border/30">
          <Calendar className="h-4 w-4" />
          <span>
            {Math.floor(yearsRemaining)} {t('common.years')}, {monthsRemaining % 12} {t('common.months')} {t('common.remaining')}
          </span>
        </div>
      </div>
    </div>
  );

  if (calculation) {
    return (
      <MathExplanationDialog calculation={calculation} currency={globalCurrency}>
        {cardContent}
      </MathExplanationDialog>
    );
  }

  return cardContent;
}
