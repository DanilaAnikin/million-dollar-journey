'use client';

import { TrendingUp, Wallet, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { useCurrency } from '@/lib/contexts/CurrencyContext';
import type { Account, Currency } from '@/types/database';

interface AccountCardProps {
  account: Account;
  categoryType?: string;
  onEdit: (account: Account) => void;
  onDelete: (accountId: string) => void;
}

export function AccountCard({ account, categoryType = 'asset', onEdit, onDelete }: AccountCardProps) {
  const { t } = useLanguage();
  const { currency: globalCurrency, convert, formatAmount } = useCurrency();

  // Convert account balance to global currency
  const displayBalance = convert(account.balance, account.currency as Currency, globalCurrency);
  const formattedBalance = formatAmount(displayBalance, globalCurrency);

  // Determine card gradient based on category type
  const isLiability = categoryType === 'liability';
  const cardClass = isLiability ? 'account-card account-card-liability' : 'account-card account-card-asset';

  return (
    <div className={`${cardClass} cursor-pointer`} onClick={() => onEdit(account)}>
      {/* Header: Account name and dropdown */}
      <div className="relative z-10 flex items-start justify-between mb-auto">
        <div className="flex items-center gap-2">
          {account.is_investment ? (
            <TrendingUp className="h-5 w-5 text-white/80" />
          ) : (
            <Wallet className="h-5 w-5 text-white/80" />
          )}
          <h3 className="text-lg font-bold text-white">{account.name}</h3>
        </div>

        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/10">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(account)}>
              <Pencil className="h-4 w-4 mr-2" />
              {t('common.edit')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(account.id)}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t('common.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Footer: Institution/currency and Balance */}
      <div className="relative z-10 mt-auto pt-6">
        <p className="text-sm text-white/60 mb-1">
          {account.institution || account.currency}
          {account.is_investment && ` • ${account.interest_rate_pa}% ${t('accounts.apy')}`}
        </p>
        <p className="text-2xl font-bold text-white">
          {formattedBalance}
        </p>
      </div>
    </div>
  );
}
