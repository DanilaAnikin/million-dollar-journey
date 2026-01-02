'use client';

import { ArrowUpRight, ArrowDownRight, ArrowLeftRight, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import type { TransactionType } from '@/types/database';

interface TransactionTypeSelectorProps {
  value: TransactionType;
  onChange: (type: TransactionType) => void;
}

const types: { type: TransactionType; icon: typeof ArrowUpRight; color: string }[] = [
  { type: 'expense', icon: ArrowDownRight, color: 'text-red-500 bg-red-500/10 border-red-500' },
  { type: 'income', icon: ArrowUpRight, color: 'text-green-500 bg-green-500/10 border-green-500' },
  { type: 'transfer', icon: ArrowLeftRight, color: 'text-blue-500 bg-blue-500/10 border-blue-500' },
  { type: 'adjustment', icon: RefreshCw, color: 'text-orange-500 bg-orange-500/10 border-orange-500' },
];

export function TransactionTypeSelector({ value, onChange }: TransactionTypeSelectorProps) {
  const { t } = useLanguage();

  const labels: Record<TransactionType, string> = {
    income: t('transactions.income'),
    expense: t('transactions.expense'),
    transfer: t('transactions.transfer'),
    adjustment: t('transactions.adjustment'),
    interest: 'Interest',
  };

  return (
    <div className="grid grid-cols-4 gap-2">
      {types.map(({ type, icon: Icon, color }) => {
        const isSelected = value === type;
        return (
          <button
            key={type}
            type="button"
            onClick={() => onChange(type)}
            className={cn(
              'flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all',
              isSelected ? color : 'border-border bg-background hover:bg-accent'
            )}
          >
            <Icon className={cn('h-6 w-6 mb-1', isSelected ? '' : 'text-muted-foreground')} />
            <span className={cn('text-xs font-medium', isSelected ? '' : 'text-muted-foreground')}>
              {labels[type]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
