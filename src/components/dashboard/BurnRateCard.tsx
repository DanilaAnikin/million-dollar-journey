'use client';

import { useMemo } from 'react';
import { Repeat, ArrowRight, TrendingDown, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { useCurrency } from '@/lib/contexts/CurrencyContext';
import type { Currency, RecurringTransaction } from '@/types/database';

interface BurnRateCardProps {
  recurringTransactions: RecurringTransaction[];
}

// Convert any frequency to monthly equivalent
function toMonthlyAmount(amount: number, frequency: 'weekly' | 'monthly' | 'yearly'): number {
  switch (frequency) {
    case 'weekly':
      return amount * 4.33; // Average weeks per month
    case 'monthly':
      return amount;
    case 'yearly':
      return amount / 12;
  }
}

export function BurnRateCard({ recurringTransactions }: BurnRateCardProps) {
  const { t } = useLanguage();
  const { currency: displayCurrency, convert, formatAmount } = useCurrency();

  // Memoize calculations to avoid recalculating on every render
  const { activeTransactions, monthlyExpenses, monthlyIncome, netAmount, isPositiveNet, expenseRatio } = useMemo(() => {
    // Filter active recurring transactions
    const active = recurringTransactions.filter((rt) => rt.is_active);

    // Calculate monthly totals in display currency
    let expenses = 0;
    let income = 0;

    active.forEach((rt) => {
      const monthlyAmount = toMonthlyAmount(rt.amount, rt.frequency);
      const convertedAmount = convert(monthlyAmount, rt.currency as Currency, displayCurrency);

      if (rt.type === 'expense') {
        expenses += convertedAmount;
      } else {
        income += convertedAmount;
      }
    });

    const net = income - expenses;
    const isPositive = net >= 0;
    const ratio = income > 0 ? (expenses / income) * 100 : 0;

    return {
      activeTransactions: active,
      monthlyExpenses: expenses,
      monthlyIncome: income,
      netAmount: net,
      isPositiveNet: isPositive,
      expenseRatio: ratio,
    };
  }, [recurringTransactions, convert, displayCurrency]);

  return (
    <div className="rounded-2xl border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between p-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-rose-500/10">
            <Repeat className="h-5 w-5 text-rose-500" />
          </div>
          <span className="font-semibold">{t('dashboard.monthlyCommitments')}</span>
        </div>
        <Button variant="ghost" size="sm" asChild className="text-primary hover:text-primary">
          <Link href="/recurring" className="flex items-center gap-1">
            {t('dashboard.viewRecurring')}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* Content */}
      <div className="px-6 pb-6 space-y-5">
        {activeTransactions.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-muted-foreground text-sm">{t('dashboard.noRecurring')}</p>
          </div>
        ) : (
          <>
            {/* Main Value - Monthly Expenses */}
            <div>
              <p className="text-sm text-muted-foreground mb-1">{t('dashboard.fixedExpenses')}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl md:text-3xl font-bold tracking-tight text-rose-500">
                  {formatAmount(monthlyExpenses, displayCurrency)}
                </span>
                <span className="text-sm text-muted-foreground">{t('dashboard.perMonth')}</span>
              </div>
            </div>

            {/* Secondary Info */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/30">
              {/* Fixed Income */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  <p className="text-sm text-muted-foreground">{t('dashboard.fixedIncome')}</p>
                </div>
                <p className="font-semibold text-emerald-500">
                  {formatAmount(monthlyIncome, displayCurrency)}
                </p>
              </div>

              {/* Net */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {isPositiveNet ? (
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-rose-500" />
                  )}
                  <p className="text-sm text-muted-foreground">{t('dashboard.netRecurring')}</p>
                </div>
                <p className={`font-semibold ${isPositiveNet ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {isPositiveNet ? '+' : ''}{formatAmount(netAmount, displayCurrency)}
                </p>
              </div>
            </div>

            {/* Progress bar - shows expense ratio */}
            {monthlyIncome > 0 && (
              <div className="space-y-2 pt-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{t('dashboard.commitmentRatio')}</span>
                  <span className={expenseRatio > 100 ? 'text-rose-500' : ''}>
                    {expenseRatio.toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      expenseRatio > 100 ? 'bg-rose-500' : expenseRatio > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, expenseRatio)}%` }}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
