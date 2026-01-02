'use client';

import { ArrowUpRight, ArrowDownRight, ArrowLeftRight, RefreshCw, ArrowRight, Receipt } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { useCurrency } from '@/lib/contexts/CurrencyContext';
import { formatDate } from '@/lib/utils';
import type { Transaction, Currency } from '@/types/database';

interface RecentTransactionsProps {
  transactions: Transaction[];
}

const typeIcons = {
  income: ArrowUpRight,
  expense: ArrowDownRight,
  transfer: ArrowLeftRight,
  adjustment: RefreshCw,
  interest: ArrowUpRight,
};

const typeColors = {
  income: 'text-emerald-500 bg-emerald-500/10',
  expense: 'text-red-500 bg-red-500/10',
  transfer: 'text-blue-500 bg-blue-500/10',
  adjustment: 'text-amber-500 bg-amber-500/10',
  interest: 'text-purple-500 bg-purple-500/10',
};

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  const { t } = useLanguage();
  const { currency: globalCurrency, convert, formatAmount } = useCurrency();

  if (transactions.length === 0) {
    return (
      <div className="rounded-2xl border bg-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl bg-primary/10">
            <Receipt className="h-5 w-5 text-primary" />
          </div>
          <span className="font-semibold">{t('dashboard.recentTransactions')}</span>
        </div>
        <div className="text-center py-8">
          <div className="p-4 rounded-2xl bg-muted/50 w-fit mx-auto mb-4">
            <RefreshCw className="h-10 w-10 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground mb-4">{t('transactions.noTransactions')}</p>
          <Button asChild>
            <Link href="/transactions">{t('transactions.addTransaction')}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between p-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10">
            <Receipt className="h-5 w-5 text-primary" />
          </div>
          <span className="font-semibold">{t('dashboard.recentTransactions')}</span>
        </div>
        <Button variant="ghost" size="sm" asChild className="text-primary hover:text-primary">
          <Link href="/transactions" className="flex items-center gap-1">
            {t('common.viewAll')}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* Transaction List */}
      <div className="px-6 pb-6">
        <div className="space-y-1">
          {transactions.slice(0, 5).map((tx, index) => {
            const Icon = typeIcons[tx.type as keyof typeof typeIcons] || RefreshCw;
            const colorClass = typeColors[tx.type as keyof typeof typeColors] || 'text-gray-500 bg-gray-500/10';
            const isPositive = tx.amount > 0;

            return (
              <div
                key={tx.id}
                className={`flex items-center justify-between py-3 ${
                  index !== Math.min(transactions.length, 5) - 1 ? 'border-b border-border/30' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Icon in colored circle */}
                  <div className={`p-2.5 rounded-full ${colorClass}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">
                      {tx.description || t(`transactionType.${tx.type}` as any)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(tx.transaction_date)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Type badge pill */}
                  <span className={`hidden sm:inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                    isPositive ? 'pill-income' : 'pill-expense'
                  }`}>
                    {t(`transactionType.${tx.type}` as any)}
                  </span>
                  {/* Amount */}
                  <span className={`font-semibold text-sm ${
                    isPositive ? 'text-emerald-500' : 'text-red-500'
                  }`}>
                    {isPositive ? '+' : ''}{formatAmount(convert(tx.amount, tx.currency as Currency, globalCurrency), globalCurrency)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
