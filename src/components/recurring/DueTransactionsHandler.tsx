'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, Loader2, CheckCircle2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { cn, formatDate } from '@/lib/utils';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { useCurrency } from '@/lib/contexts/CurrencyContext';
import { Button } from '@/components/ui/button';
import {
  getDueRecurringTransactions,
  processRecurringTransaction,
  processAllDueTransactions,
} from '@/app/actions/recurring';
import type { RecurringTransaction, Currency } from '@/types/database';

interface DueTransactionsHandlerProps {
  onProcessed?: () => void;
}

export function DueTransactionsHandler({ onProcessed }: DueTransactionsHandlerProps) {
  const { t } = useLanguage();
  const { formatAmount } = useCurrency();

  const [dueTransactions, setDueTransactions] = useState<RecurringTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  // Load due transactions on mount
  const loadDueTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDueRecurringTransactions();
      setDueTransactions(data);
    } catch (error) {
      console.error('Error loading due transactions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDueTransactions();
  }, [loadDueTransactions]);

  // Process a single transaction
  const handleProcessSingle = async (id: string, name: string) => {
    setProcessingId(id);
    try {
      const result = await processRecurringTransaction(id);
      if (result.success) {
        toast.success(t('recurring.processedSuccess').replace('{name}', name));
        await loadDueTransactions();
        onProcessed?.();
      } else {
        toast.error(result.error || t('common.error'));
      }
    } catch (error) {
      console.error('Error processing transaction:', error);
      toast.error(t('common.error'));
    } finally {
      setProcessingId(null);
    }
  };

  // Process all due transactions
  const handleProcessAll = async () => {
    setProcessing(true);
    try {
      const result = await processAllDueTransactions();
      if (result.processedCount > 0) {
        toast.success(
          t('recurring.allProcessedSuccess').replace('{count}', String(result.processedCount))
        );
        await loadDueTransactions();
        onProcessed?.();
      }
      if (result.errors.length > 0) {
        result.errors.forEach((err) => toast.error(err));
      }
    } catch (error) {
      console.error('Error processing all transactions:', error);
      toast.error(t('common.error'));
    } finally {
      setProcessing(false);
    }
  };

  // Don't show anything while loading or if no due transactions
  if (loading) {
    return null;
  }

  if (dueTransactions.length === 0) {
    return null;
  }

  const totalDueCount = dueTransactions.length;
  const totalDueAmount = dueTransactions.reduce((sum, tx) => {
    const amount = tx.type === 'expense' ? -tx.amount : tx.amount;
    return sum + amount;
  }, 0);

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl overflow-hidden">
      {/* Header Banner */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-800/50 flex items-center justify-center">
            <Bell className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="font-semibold text-amber-900 dark:text-amber-100">
              {t('recurring.duePayments').replace('{count}', String(totalDueCount))}
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              {t('recurring.clickToExpand')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              handleProcessAll();
            }}
            disabled={processing}
            variant="default"
            size="sm"
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {processing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {t('recurring.processing')}
              </>
            ) : (
              t('recurring.processAll')
            )}
          </Button>
          {expanded ? (
            <ChevronUp className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          )}
        </div>
      </div>

      {/* Expanded List */}
      {expanded && (
        <div className="border-t border-amber-200 dark:border-amber-800 divide-y divide-amber-200 dark:divide-amber-800">
          {dueTransactions.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between p-4 bg-white/50 dark:bg-slate-900/50"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Type indicator */}
                <div
                  className={cn(
                    'w-2 h-2 rounded-full flex-shrink-0',
                    tx.type === 'income' ? 'bg-emerald-500' : 'bg-rose-500'
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate text-slate-900 dark:text-white">
                    {tx.name}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {t('recurring.dueOn')} {formatDate(tx.next_due_date)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {/* Amount */}
                <span
                  className={cn(
                    'font-semibold',
                    tx.type === 'income'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  )}
                >
                  {tx.type === 'income' ? '+' : '-'}
                  {formatAmount(tx.amount, tx.currency as Currency)}
                </span>

                {/* Process Button */}
                <Button
                  onClick={() => handleProcessSingle(tx.id, tx.name)}
                  disabled={processingId === tx.id}
                  variant="outline"
                  size="sm"
                >
                  {processingId === tx.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  <span className="ml-1">{t('recurring.process')}</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
