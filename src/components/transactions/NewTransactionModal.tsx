'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { useCurrency } from '@/lib/contexts/CurrencyContext';
import { createClient } from '@/lib/supabase/client';
import { getAccounts, addTransaction, addTransfer, addAdjustment } from '@/app/actions/transactions';
import type { Account, TransactionType, Currency } from '@/types/database';

interface NewTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// Limited currencies as per spec
const AVAILABLE_CURRENCIES: Currency[] = ['CZK', 'USD', 'EUR'];

export function NewTransactionModal({ isOpen, onClose, onSuccess }: NewTransactionModalProps) {
  const { t } = useLanguage();
  const { currency: globalCurrency } = useCurrency();
  const modalRef = useRef<HTMLDivElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const initialCurrencySynced = useRef(false);

  // Form state
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(
    AVAILABLE_CURRENCIES.includes(globalCurrency) ? globalCurrency : 'CZK'
  );
  const [accountId, setAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Loading state
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  // Load accounts on mount
  useEffect(() => {
    if (isOpen) {
      loadAccounts();
    }
  }, [isOpen]);

  // Sync currency with global preference on initial open
  useEffect(() => {
    if (isOpen && globalCurrency && !initialCurrencySynced.current) {
      if (AVAILABLE_CURRENCIES.includes(globalCurrency)) {
        setSelectedCurrency(globalCurrency);
      }
      initialCurrencySynced.current = true;
    }
  }, [isOpen, globalCurrency]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Reset after animation completes
      const timer = setTimeout(() => {
        setType('expense');
        setAmount('');
        setDescription('');
        setDate(new Date().toISOString().split('T')[0]);
        setToAccountId('');
        initialCurrencySynced.current = false;
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Focus amount input when modal opens
  useEffect(() => {
    if (isOpen && !loadingAccounts) {
      const timer = setTimeout(() => {
        amountInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, loadingAccounts]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Handle click outside
  const handleOverlayClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  async function loadAccounts() {
    setLoadingAccounts(true);
    try {
      const data = await getAccounts();
      setAccounts(data);
      if (data.length > 0 && !accountId) {
        setAccountId(data[0].id);
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
      toast.error(t('common.error'));
    } finally {
      setLoadingAccounts(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const numAmount = parseFloat(amount);
    if (!accountId || numAmount <= 0) {
      toast.error(t('validation.positiveNumber'));
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error(t('auth.mustBeLoggedIn'));
        setLoading(false);
        return;
      }

      if (type === 'transfer') {
        if (!toAccountId || toAccountId === accountId) {
          toast.error(t('validation.differentAccounts') || 'Select different accounts');
          setLoading(false);
          return;
        }
        await addTransfer({
          userId: user.id,
          fromAccountId: accountId,
          toAccountId,
          amount: numAmount,
          currency: selectedCurrency,
          description,
        });
      } else if (type === 'adjustment') {
        await addAdjustment(user.id, accountId, numAmount, selectedCurrency, description);
      } else {
        const finalAmount = type === 'expense' ? -Math.abs(numAmount) : Math.abs(numAmount);
        await addTransaction({
          userId: user.id,
          accountId,
          amount: finalAmount,
          currency: selectedCurrency,
          transactionDate: new Date(date),
          description,
          type,
        });
      }

      toast.success(t('transactions.addedSuccess'));
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error adding transaction:', error);
      toast.error(t('transactions.addFailed'));
    } finally {
      setLoading(false);
    }
  }

  // Validation
  const isValid = amount && parseFloat(amount) > 0 && accountId && (type !== 'transfer' || toAccountId);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleOverlayClick}
    >
      <div
        ref={modalRef}
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-lg w-full mx-4 p-6 animate-in zoom-in-95 fade-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            {t('transactions.addTransaction')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </button>
        </div>

        {loadingAccounts ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-500 dark:text-slate-400 mb-4">{t('dashboard.noAccounts')}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              {t('dashboard.addFirstAccount')}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Type Selector - Pill Shape Segmented Control */}
            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-full p-1 mb-8">
              <button
                type="button"
                onClick={() => setType('expense')}
                className={cn(
                  'flex-1 py-3 px-4 rounded-full text-sm font-medium transition-all',
                  type === 'expense'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                )}
              >
                {t('transactions.expense')}
              </button>
              <button
                type="button"
                onClick={() => setType('income')}
                className={cn(
                  'flex-1 py-3 px-4 rounded-full text-sm font-medium transition-all',
                  type === 'income'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                )}
              >
                {t('transactions.income')}
              </button>
              <button
                type="button"
                onClick={() => setType('transfer')}
                className={cn(
                  'flex-1 py-3 px-4 rounded-full text-sm font-medium transition-all',
                  type === 'transfer'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                )}
              >
                {t('transactions.transfer')}
              </button>
            </div>

            {/* Amount Section - HERO Centered */}
            <div className="flex items-center justify-center gap-2 mb-8">
              <input
                ref={amountInputRef}
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => {
                  // Allow only numbers and decimal point
                  const val = e.target.value;
                  if (val === '' || /^\d*\.?\d*$/.test(val)) {
                    setAmount(val);
                  }
                }}
                placeholder="0.00"
                className="text-5xl font-bold text-center bg-transparent border-none focus:outline-none focus:ring-0 w-2/3 placeholder-slate-300 dark:placeholder-slate-600 text-slate-900 dark:text-white"
              />
              {/* Currency pill */}
              <select
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value as Currency)}
                className="text-lg font-medium bg-slate-100 dark:bg-slate-800 rounded-full px-4 py-2 border-none text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                {AVAILABLE_CURRENCIES.map((curr) => (
                  <option key={curr} value={curr}>
                    {curr}
                  </option>
                ))}
              </select>
            </div>

            {/* Details Grid */}
            {type === 'transfer' ? (
              /* Transfer: From Account / To Account */
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 h-20 flex flex-col justify-center">
                  <label className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                    {t('transactions.fromAccount')}
                  </label>
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="bg-transparent font-medium text-slate-900 dark:text-white border-none p-0 focus:ring-0 focus:outline-none cursor-pointer"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 h-20 flex flex-col justify-center">
                  <label className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                    {t('transactions.toAccount')}
                  </label>
                  <select
                    value={toAccountId}
                    onChange={(e) => setToAccountId(e.target.value)}
                    className="bg-transparent font-medium text-slate-900 dark:text-white border-none p-0 focus:ring-0 focus:outline-none cursor-pointer"
                  >
                    <option value="">{t('transactions.selectDestinationAccount')}</option>
                    {accounts
                      .filter((acc) => acc.id !== accountId)
                      .map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            ) : (
              /* Expense/Income: Date + Account + Category placeholder */
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 h-20 flex flex-col justify-center">
                  <label className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                    {t('common.date')}
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="bg-transparent font-medium text-slate-900 dark:text-white border-none p-0 focus:ring-0 focus:outline-none cursor-pointer"
                  />
                </div>

                <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 h-20 flex flex-col justify-center">
                  <label className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                    {t('common.account')}
                  </label>
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="bg-transparent font-medium text-slate-900 dark:text-white border-none p-0 focus:ring-0 focus:outline-none cursor-pointer"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Description Input */}
            <div className="mb-6">
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('transactions.descriptionPlaceholder') || 'Add a note (optional)'}
                className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl px-4 py-4 border-none focus:ring-2 focus:ring-emerald-500 focus:outline-none placeholder-slate-400 text-slate-900 dark:text-white"
              />
            </div>

            {/* Save Button */}
            <button
              type="submit"
              disabled={loading || !isValid}
              className="w-full h-14 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-medium text-lg shadow-lg shadow-emerald-500/20 transition-all"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {t('common.saving')}
                </span>
              ) : (
                t('transactions.addTransaction')
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
