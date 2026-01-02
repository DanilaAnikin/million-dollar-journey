'use client';

import { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownRight, ArrowLeftRight, RefreshCw, Receipt, Loader2, Plus } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { useCurrency } from '@/lib/contexts/CurrencyContext';
import { formatDate } from '@/lib/utils';
import { getTransactions, getAccounts } from '@/app/actions/transactions';
import type { Transaction, Account, TransactionType, Currency } from '@/types/database';
import { NewTransactionModal } from '@/components/transactions/NewTransactionModal';

const typeIcons = {
  income: ArrowUpRight,
  expense: ArrowDownRight,
  transfer: ArrowLeftRight,
  adjustment: RefreshCw,
  interest: ArrowUpRight,
};

const iconBackgrounds = {
  income: 'bg-emerald-100 dark:bg-emerald-500/20',
  expense: 'bg-rose-100 dark:bg-rose-500/20',
  transfer: 'bg-blue-100 dark:bg-blue-500/20',
  adjustment: 'bg-orange-100 dark:bg-orange-500/20',
  interest: 'bg-emerald-100 dark:bg-emerald-500/20',
};

const iconColors = {
  income: 'text-emerald-600 dark:text-emerald-400',
  expense: 'text-rose-600 dark:text-rose-400',
  transfer: 'text-blue-600 dark:text-blue-400',
  adjustment: 'text-orange-600 dark:text-orange-400',
  interest: 'text-emerald-600 dark:text-emerald-400',
};

const filterTypes = [
  { value: 'all', labelKey: 'transactions.all' },
  { value: 'income', labelKey: 'transactions.income' },
  { value: 'expense', labelKey: 'transactions.expense' },
  { value: 'transfer', labelKey: 'transactions.transfer' },
  { value: 'adjustment', labelKey: 'transactions.adjustment' },
];

export default function TransactionsPage() {
  const { t } = useLanguage();
  const { currency: globalCurrency, convert, formatAmount } = useCurrency();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterAccount, setFilterAccount] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      console.log('TransactionsPage: Loading...');
      const [txData, accData] = await Promise.all([
        getTransactions(),
        getAccounts(),
      ]);

      console.log('TransactionsPage: Received', txData.length, 'transactions');
      console.log('TransactionsPage: Data sample', txData[0]);
      console.log('TransactionsPage: Loaded', accData.length, 'accounts');
      setTransactions(txData);
      setAccounts(accData as Account[]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  const getAccountName = (accountId: string | null) => {
    if (!accountId) return t('common.unknown');
    const account = accounts.find((a) => a.id === accountId);
    return account?.name || t('common.unknown');
  };

  const filteredTransactions = transactions.filter((tx) => {
    if (filterType !== 'all' && tx.type !== filterType) return false;
    if (filterAccount !== 'all' && tx.account_id !== filterAccount) return false;
    return true;
  });

  // Group transactions by date
  const groupedByDate = filteredTransactions.reduce((acc, tx) => {
    const date = formatDate(tx.transaction_date);
    if (!acc[date]) acc[date] = [];
    acc[date].push(tx);
    return acc;
  }, {} as Record<string, Transaction[]>);

  if (loading) {
    return (
      <div className="p-4 lg:p-6 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{t('transactions.history')}</h1>
      </div>

      {/* Filters */}
      <div className="space-y-4">
        {/* Type filter pills - horizontal scrollable */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {filterTypes.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setFilterType(filter.value)}
              className={`filter-pill whitespace-nowrap ${
                filterType === filter.value ? 'filter-pill-active' : ''
              }`}
            >
              {t(filter.labelKey)}
            </button>
          ))}
        </div>

        {/* Account filter dropdown */}
        <Select value={filterAccount} onValueChange={setFilterAccount}>
          <SelectTrigger className="w-[200px] rounded-xl">
            <SelectValue placeholder={t('transactions.filterByAccount')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('transactions.allAccounts')}</SelectItem>
            {accounts.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Transactions List */}
      {Object.keys(groupedByDate).length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Receipt className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-semibold mt-4">{t('transactions.noTransactions')}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {t('transactions.noTransactionsHint')}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByDate).map(([date, dateTxs]) => (
            <div key={date} className="space-y-3">
              <h3 className="section-header">{date}</h3>
              <div className="bg-card rounded-2xl shadow-sm border border-border/50 divide-y divide-border/30">
                {dateTxs.map((tx) => {
                  const Icon = typeIcons[tx.type as keyof typeof typeIcons] || RefreshCw;
                  const bgClass = iconBackgrounds[tx.type as keyof typeof iconBackgrounds] || 'bg-gray-100 dark:bg-gray-500/20';
                  const iconColor = iconColors[tx.type as keyof typeof iconColors] || 'text-gray-600 dark:text-gray-400';

                  // Convert and format amount using global currency
                  const displayAmount = convert(tx.amount, tx.currency as Currency, globalCurrency);
                  const formatted = formatAmount(displayAmount, globalCurrency);

                  // Determine color based on transaction type
                  const amountColorClass =
                    tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' :
                    tx.type === 'expense' ? 'text-rose-600 dark:text-rose-400' :
                    'text-foreground';

                  // Determine prefix based on transaction type
                  const amountPrefix =
                    tx.type === 'income' ? '+' :
                    tx.type === 'expense' ? '-' :
                    '';

                  return (
                    <div
                      key={tx.id}
                      className="transaction-item flex items-center justify-between p-4"
                    >
                      <div className="flex items-center gap-3">
                        {/* Category icon in colored circle */}
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bgClass}`}>
                          <Icon className={`h-5 w-5 ${iconColor}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">
                            {tx.description || t('transactions.noDescription')}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {tx.type === 'transfer' ? (
                              <>
                                {tx.account?.name || t('common.unknown')} &rarr; {tx.to_account?.name || t('common.unknown')}
                              </>
                            ) : (
                              tx.account?.name || t('accounts.unknownAccount')
                            )}
                            {' '}&bull;{' '}
                            {formatDate(tx.transaction_date)}
                          </p>
                        </div>
                      </div>
                      <div className={`font-semibold text-right whitespace-nowrap ${amountColorClass}`}>
                        {amountPrefix}{formatted}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-24 right-6 z-40 size-14 bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-full shadow-lg shadow-emerald-600/30 flex items-center justify-center text-white transition-all duration-200"
        aria-label="Add new transaction"
      >
        <Plus className="size-7" />
      </button>

      {/* New Transaction Modal */}
      <NewTransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false);
          loadData();
        }}
      />
    </div>
  );
}
