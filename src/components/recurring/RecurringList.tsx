'use client';

import { ArrowUpRight, ArrowDownRight, Pencil, Trash2, Calendar } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { useCurrency } from '@/lib/contexts/CurrencyContext';
import { Switch } from '@/components/ui/switch';
import type { RecurringTransaction, Account, Currency } from '@/types/database';

interface RecurringListProps {
  items: RecurringTransaction[];
  accounts: Account[];
  onEdit: (item: RecurringTransaction) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
}

const frequencyColors = {
  weekly: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300',
  monthly: 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300',
  yearly: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300',
};

export function RecurringList({ items, accounts, onEdit, onDelete, onToggleActive }: RecurringListProps) {
  const { t } = useLanguage();
  const { formatAmount } = useCurrency();

  const getAccountName = (accountId: string) => {
    const account = accounts.find((a) => a.id === accountId);
    return account?.name || t('common.unknown');
  };

  const getFrequencyLabel = (frequency: RecurringTransaction['frequency']) => {
    const labels = {
      weekly: t('recurring.weekly'),
      monthly: t('recurring.monthly'),
      yearly: t('recurring.yearly'),
    };
    return labels[frequency];
  };

  if (items.length === 0) {
    return null;
  }

  // Group by type
  const incomeItems = items.filter((item) => item.type === 'income');
  const expenseItems = items.filter((item) => item.type === 'expense');

  const renderItem = (item: RecurringTransaction) => {
    const isIncome = item.type === 'income';

    return (
      <div
        key={item.id}
        className={cn(
          'flex items-center justify-between p-4 transition-colors',
          !item.is_active && 'opacity-50'
        )}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Type Icon */}
          <div
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
              isIncome
                ? 'bg-emerald-100 dark:bg-emerald-500/20'
                : 'bg-rose-100 dark:bg-rose-500/20'
            )}
          >
            {isIncome ? (
              <ArrowUpRight className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <ArrowDownRight className="h-5 w-5 text-rose-600 dark:text-rose-400" />
            )}
          </div>

          {/* Details */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="font-medium truncate">{item.name}</p>
              <span
                className={cn(
                  'px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0',
                  frequencyColors[item.frequency]
                )}
              >
                {getFrequencyLabel(item.frequency)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="truncate">{getAccountName(item.account_id)}</span>
              <span className="text-muted-foreground/50">|</span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDate(item.next_due_date)}
              </span>
            </div>
          </div>
        </div>

        {/* Amount & Actions */}
        <div className="flex items-center gap-4">
          {/* Amount */}
          <div
            className={cn(
              'text-right font-semibold',
              isIncome
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            )}
          >
            {isIncome ? '+' : '-'}
            {formatAmount(item.amount, item.currency as Currency)}
          </div>

          {/* Active Toggle */}
          <Switch
            checked={item.is_active}
            onCheckedChange={(checked) => onToggleActive(item.id, checked)}
          />

          {/* Edit/Delete */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => onEdit(item)}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
              aria-label={t('common.edit')}
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => onDelete(item.id)}
              className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
              aria-label={t('common.delete')}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Income Section */}
      {incomeItems.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            {t('transactions.income')}
          </h3>
          <div className="bg-card rounded-2xl shadow-sm border border-border/50 divide-y divide-border/30">
            {incomeItems.map(renderItem)}
          </div>
        </div>
      )}

      {/* Expense Section */}
      {expenseItems.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            {t('transactions.expense')}
          </h3>
          <div className="bg-card rounded-2xl shadow-sm border border-border/50 divide-y divide-border/30">
            {expenseItems.map(renderItem)}
          </div>
        </div>
      )}
    </div>
  );
}
