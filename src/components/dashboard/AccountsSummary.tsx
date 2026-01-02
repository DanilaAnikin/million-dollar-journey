'use client';

import { Wallet, TrendingUp, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { useCurrency } from '@/lib/contexts/CurrencyContext';
import type { Account, Currency } from '@/types/database';

interface AccountsSummaryProps {
  accounts: Account[];
}

export function AccountsSummary({
  accounts
}: AccountsSummaryProps) {
  const { t } = useLanguage();
  const { currency: displayCurrency, convert, formatAmount } = useCurrency();

  // Sort by balance (converted to display currency) and take top 5
  const topAccounts = [...accounts]
    .sort((a, b) => {
      const aConverted = convert(a.balance, a.currency as Currency, displayCurrency);
      const bConverted = convert(b.balance, b.currency as Currency, displayCurrency);
      return bConverted - aConverted;
    })
    .slice(0, 5);

  if (accounts.length === 0) {
    return (
      <div className="rounded-2xl border bg-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl bg-primary/10">
            <Wallet className="h-5 w-5 text-primary" />
          </div>
          <span className="font-semibold">{t('accounts.title')}</span>
        </div>
        <div className="text-center py-8">
          <div className="p-4 rounded-2xl bg-muted/50 w-fit mx-auto mb-4">
            <Wallet className="h-10 w-10 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground mb-4">{t('dashboard.noAccounts')}</p>
          <Button asChild>
            <Link href="/accounts">{t('dashboard.addFirstAccount')}</Link>
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
            <Wallet className="h-5 w-5 text-primary" />
          </div>
          <span className="font-semibold">{t('dashboard.topAccounts')}</span>
        </div>
        <Button variant="ghost" size="sm" asChild className="text-primary hover:text-primary">
          <Link href="/accounts" className="flex items-center gap-1">
            {t('common.viewAll')}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* Account List */}
      <div className="px-6 pb-6">
        <div className="space-y-1">
          {topAccounts.map((account, index) => (
            <div
              key={account.id}
              className={`flex items-center justify-between py-3 ${
                index !== topAccounts.length - 1 ? 'border-b border-border/30' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Icon in colored squircle */}
                <div className={`p-2.5 rounded-xl ${
                  account.is_investment ? 'bg-emerald-500/10' : 'bg-blue-500/10'
                }`}>
                  {account.is_investment ? (
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Wallet className="h-4 w-4 text-blue-500" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-sm">{account.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {account.is_investment ? `${account.interest_rate_pa}% ${t('accounts.apy')}` : account.currency}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-sm">
                  {formatAmount(convert(account.balance, account.currency as Currency, displayCurrency), displayCurrency)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
