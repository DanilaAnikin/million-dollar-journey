'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Loader2, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, RefreshCw, ChevronDown } from 'lucide-react';
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
  const dropdownRef = useRef<HTMLDivElement>(null);
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

  // Custom dropdown open states
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isFromAccountOpen, setIsFromAccountOpen] = useState(false);
  const [isToAccountOpen, setIsToAccountOpen] = useState(false);

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
        // Close all dropdowns
        setIsCurrencyOpen(false);
        setIsAccountOpen(false);
        setIsFromAccountOpen(false);
        setIsToAccountOpen(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCurrencyOpen(false);
        setIsAccountOpen(false);
        setIsFromAccountOpen(false);
        setIsToAccountOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
          toast.error(t('validation.differentAccounts'));
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xl cursor-pointer"
      onClick={handleOverlayClick}
    >
      <div
        ref={modalRef}
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-lg w-full mx-4 p-6 animate-in zoom-in-95 fade-in duration-200 cursor-default"
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
            className="p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
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
              className="px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              {t('dashboard.addFirstAccount')}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Type Selector - 2x2 Grid */}
            <div className="grid grid-cols-2 gap-2 mb-6">
              <button
                type="button"
                onClick={() => setType('expense')}
                className={cn(
                  'flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all cursor-pointer',
                  type === 'expense'
                    ? 'bg-red-500 text-white shadow-lg shadow-red-500/25'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                )}
              >
                <ArrowDownLeft className="size-4" />
                {t('transactions.expense')}
              </button>
              <button
                type="button"
                onClick={() => setType('income')}
                className={cn(
                  'flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all cursor-pointer',
                  type === 'income'
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                )}
              >
                <ArrowUpRight className="size-4" />
                {t('transactions.income')}
              </button>
              <button
                type="button"
                onClick={() => setType('transfer')}
                className={cn(
                  'flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all cursor-pointer',
                  type === 'transfer'
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                )}
              >
                <ArrowLeftRight className="size-4" />
                {t('transactions.transfer')}
              </button>
              <button
                type="button"
                onClick={() => setType('adjustment')}
                className={cn(
                  'flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all cursor-pointer',
                  type === 'adjustment'
                    ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/25'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                )}
              >
                <RefreshCw className="size-4" />
                {t('transactions.adjustment')}
              </button>
            </div>

            {/* Amount Section - HERO Centered */}
            <div className="flex items-center justify-center gap-3 py-8">
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
                className="text-5xl font-bold text-center bg-transparent border-none focus:outline-none focus:ring-0 w-48 placeholder-slate-300 dark:placeholder-slate-600 text-slate-900 dark:text-white"
              />
              {/* Currency Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setIsCurrencyOpen(!isCurrencyOpen);
                    setIsAccountOpen(false);
                    setIsFromAccountOpen(false);
                    setIsToAccountOpen(false);
                  }}
                  className="text-lg font-medium bg-slate-100 dark:bg-slate-800 rounded-full px-4 py-2 border-none text-slate-700 dark:text-slate-300 cursor-pointer flex items-center gap-2 transition-all hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  {selectedCurrency}
                  <ChevronDown className={`size-4 text-slate-400 transition-transform ${isCurrencyOpen ? 'rotate-180' : ''}`} />
                </button>
                {isCurrencyOpen && (
                  <div className="absolute top-[110%] right-0 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-2xl overflow-hidden p-2 min-w-[100px]">
                    {AVAILABLE_CURRENCIES.map((curr) => (
                      <button
                        key={curr}
                        type="button"
                        onClick={() => {
                          setSelectedCurrency(curr);
                          setIsCurrencyOpen(false);
                        }}
                        className={`w-full p-3 rounded-xl text-left text-sm font-medium transition-colors cursor-pointer ${
                          selectedCurrency === curr
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-white'
                        }`}
                      >
                        {curr}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Form Fields - Full Width Vertical Stack with Filled Style */}
            <div ref={dropdownRef} className="space-y-4">
              {/* Account Field (shown for non-transfer types) */}
              {type !== 'transfer' && (
                <div className="relative w-full">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAccountOpen(!isAccountOpen);
                      setIsCurrencyOpen(false);
                      setIsFromAccountOpen(false);
                      setIsToAccountOpen(false);
                    }}
                    className="w-full bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-4 text-left font-medium text-slate-900 dark:text-white cursor-pointer flex justify-between items-center transition-all hover:bg-slate-200 dark:hover:bg-slate-700"
                  >
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-500 dark:text-slate-400">{t('common.account')}</span>
                      <span className="truncate">{accounts.find(acc => acc.id === accountId)?.name || t('transactions.selectAccount')}</span>
                    </div>
                    <ChevronDown className={`size-5 text-slate-400 transition-transform ${isAccountOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isAccountOpen && (
                    <div className="absolute top-[110%] left-0 w-full z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-2xl overflow-hidden p-2 max-h-60 overflow-y-auto">
                      {accounts.map((account) => (
                        <button
                          key={account.id}
                          type="button"
                          onClick={() => {
                            setAccountId(account.id);
                            setIsAccountOpen(false);
                          }}
                          className={`w-full p-3 rounded-xl text-left text-sm font-medium transition-colors cursor-pointer ${
                            accountId === account.id
                              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-white'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span>{account.name}</span>
                            <span className="text-slate-500 text-xs">{account.balance?.toLocaleString() || '0'} {account.currency}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Transfer: From Account - Custom Dropdown */}
              {type === 'transfer' && (
                <div className="relative w-full">
                  <button
                    type="button"
                    onClick={() => {
                      setIsFromAccountOpen(!isFromAccountOpen);
                      setIsCurrencyOpen(false);
                      setIsAccountOpen(false);
                      setIsToAccountOpen(false);
                    }}
                    className="w-full bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-4 text-left font-medium text-slate-900 dark:text-white cursor-pointer flex justify-between items-center transition-all hover:bg-slate-200 dark:hover:bg-slate-700"
                  >
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-500 dark:text-slate-400">{t('transactions.fromAccount')}</span>
                      <span className="truncate">{accounts.find(acc => acc.id === accountId)?.name || t('transactions.selectAccount')}</span>
                    </div>
                    <ChevronDown className={`size-5 text-slate-400 transition-transform ${isFromAccountOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isFromAccountOpen && (
                    <div className="absolute top-[110%] left-0 w-full z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-2xl overflow-hidden p-2 max-h-60 overflow-y-auto">
                      {accounts.map((account) => (
                        <button
                          key={account.id}
                          type="button"
                          onClick={() => {
                            setAccountId(account.id);
                            setIsFromAccountOpen(false);
                          }}
                          className={`w-full p-3 rounded-xl text-left text-sm font-medium transition-colors cursor-pointer ${
                            accountId === account.id
                              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-white'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span>{account.name}</span>
                            <span className="text-slate-500 text-xs">{account.balance?.toLocaleString() || '0'} {account.currency}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Transfer: To Account - Custom Dropdown */}
              {type === 'transfer' && (
                <div className="relative w-full">
                  <button
                    type="button"
                    onClick={() => {
                      setIsToAccountOpen(!isToAccountOpen);
                      setIsCurrencyOpen(false);
                      setIsAccountOpen(false);
                      setIsFromAccountOpen(false);
                    }}
                    className="w-full bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-4 text-left font-medium text-slate-900 dark:text-white cursor-pointer flex justify-between items-center transition-all hover:bg-slate-200 dark:hover:bg-slate-700"
                  >
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-500 dark:text-slate-400">{t('transactions.toAccount')}</span>
                      <span className="truncate">{accounts.find(acc => acc.id === toAccountId)?.name || t('transactions.selectDestinationAccount')}</span>
                    </div>
                    <ChevronDown className={`size-5 text-slate-400 transition-transform ${isToAccountOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isToAccountOpen && (
                    <div className="absolute top-[110%] left-0 w-full z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-2xl overflow-hidden p-2 max-h-60 overflow-y-auto">
                      {accounts
                        .filter((acc) => acc.id !== accountId)
                        .map((account) => (
                          <button
                            key={account.id}
                            type="button"
                            onClick={() => {
                              setToAccountId(account.id);
                              setIsToAccountOpen(false);
                            }}
                            className={`w-full p-3 rounded-xl text-left text-sm font-medium transition-colors cursor-pointer ${
                              toAccountId === account.id
                                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-white'
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <span>{account.name}</span>
                              <span className="text-slate-500 text-xs">{account.balance?.toLocaleString() || '0'} {account.currency}</span>
                            </div>
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {/* Date Field - Filled Style (hidden for adjustments) */}
              {type !== 'adjustment' && (
                <div className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl h-14 px-4 flex flex-col justify-center focus-within:ring-2 focus-within:ring-emerald-500 transition-shadow">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {t('common.date')}
                  </span>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-transparent font-medium text-slate-900 dark:text-white border-none p-0 focus:ring-0 focus:outline-none cursor-pointer"
                  />
                </div>
              )}

              {/* Note/Description Field - Filled Style */}
              <div className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl h-14 px-4 flex flex-col justify-center focus-within:ring-2 focus-within:ring-emerald-500 transition-shadow">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {t('transactions.note')}
                </span>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('transactions.notePlaceholder')}
                  className="w-full bg-transparent font-medium text-slate-900 dark:text-white border-none p-0 focus:ring-0 focus:outline-none placeholder-slate-400 dark:placeholder-slate-500 truncate"
                />
              </div>
            </div>

            {/* Save Button */}
            <button
              type="submit"
              disabled={loading || !isValid}
              className="w-full h-14 mt-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold text-lg shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
            >
              {loading ? (
                <Loader2 className="animate-spin mx-auto size-6" />
              ) : (
                t('transactions.saveTransaction')
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
