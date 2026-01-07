'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Loader2, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, RefreshCw, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { useCurrency } from '@/lib/contexts/CurrencyContext';
import { createClient } from '@/lib/supabase/client';
import { getAccountsForTransactions, addTransaction, addTransfer, addAdjustment, updateTransaction } from '@/app/actions/transactions';
import type { Account, Transaction, TransactionType, Currency } from '@/types/database';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: Transaction;
  mode: 'create' | 'edit';
}

// Available currencies
const AVAILABLE_CURRENCIES: Currency[] = ['USD', 'EUR', 'GBP', 'CZK', 'JPY', 'CHF', 'CAD', 'AUD'];

export function TransactionModal({ isOpen, onClose, onSuccess, initialData, mode }: TransactionModalProps) {
  const { t } = useLanguage();
  const { currency: globalCurrency } = useCurrency();
  const modalRef = useRef<HTMLDivElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const currencyDropdownRef = useRef<HTMLDivElement>(null);
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

  // Reset form to defaults
  const resetFormToDefaults = useCallback(() => {
    setType('expense');
    setAmount('');
    setDescription('');
    setDate(new Date().toISOString().split('T')[0]);
    setToAccountId('');
    if (AVAILABLE_CURRENCIES.includes(globalCurrency)) {
      setSelectedCurrency(globalCurrency);
    }
    initialCurrencySynced.current = false;
    // Close all dropdowns
    setIsCurrencyOpen(false);
    setIsAccountOpen(false);
    setIsFromAccountOpen(false);
    setIsToAccountOpen(false);
  }, [globalCurrency]);

  // Populate form with initialData for edit mode
  const populateFormFromTransaction = useCallback((tx: Transaction) => {
    setType(tx.type);
    // For display, always show absolute value
    setAmount(Math.abs(tx.amount).toString());
    setSelectedCurrency(tx.currency);
    setAccountId(tx.account_id);
    setDescription(tx.description || '');
    setDate(tx.transaction_date.split('T')[0]);
    if (tx.transfer_to_account_id) {
      setToAccountId(tx.transfer_to_account_id);
    }
  }, []);

  // Define loadAccounts before it's used in useEffect
  const loadAccounts = useCallback(async () => {
    setLoadingAccounts(true);
    try {
      const data = await getAccountsForTransactions();
      setAccounts(data);
      // Only set default account in create mode if not already set
      if (data.length > 0 && !accountId && mode === 'create') {
        setAccountId(data[0].id);
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
      toast.error(t('common.error'));
    } finally {
      setLoadingAccounts(false);
    }
  }, [accountId, mode, t]);

  // Load accounts on mount
  useEffect(() => {
    if (isOpen) {
      loadAccounts();
    }
  }, [isOpen, loadAccounts]);

  // Handle form initialization based on mode
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && initialData) {
        populateFormFromTransaction(initialData);
      } else if (mode === 'create') {
        // For create mode, sync currency with global preference
        if (globalCurrency && !initialCurrencySynced.current) {
          if (AVAILABLE_CURRENCIES.includes(globalCurrency)) {
            setSelectedCurrency(globalCurrency);
          }
          initialCurrencySynced.current = true;
        }
      }
    }
  }, [isOpen, mode, initialData, globalCurrency, populateFormFromTransaction]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Reset after animation completes
      const timer = setTimeout(() => {
        resetFormToDefaults();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen, resetFormToDefaults]);

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isInsideDropdownRef = dropdownRef.current?.contains(target);
      const isInsideCurrencyDropdown = currencyDropdownRef.current?.contains(target);

      if (!isInsideDropdownRef && !isInsideCurrencyDropdown) {
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

      if (mode === 'edit' && initialData) {
        // Edit mode - update existing transaction
        const result = await updateTransaction(initialData.id, {
          accountId,
          type,
          amount: numAmount,
          currency: selectedCurrency,
          description,
          date,
          toAccountId: type === 'transfer' ? toAccountId : undefined,
        });

        if (result.error) {
          toast.error(result.error);
          setLoading(false);
          return;
        }

        toast.success(t('transactions.updatedSuccess'));
      } else {
        // Create mode - add new transaction
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
      }

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error saving transaction:', error);
      toast.error(mode === 'edit' ? t('transactions.updateFailed') : t('transactions.addFailed'));
    } finally {
      setLoading(false);
    }
  }

  // Validation
  const isValid = amount && parseFloat(amount) > 0 && accountId && (type !== 'transfer' || toAccountId);

  // Modal title based on mode
  const modalTitle = mode === 'edit' ? t('transactions.editTransaction') : t('transactions.addTransaction');

  // Submit button text based on mode
  const submitButtonText = mode === 'edit' ? t('transactions.saveChanges') : t('transactions.saveTransaction');

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xl cursor-pointer"
      onClick={handleOverlayClick}
    >
      <div
        ref={modalRef}
        className="bg-card rounded-3xl shadow-2xl max-w-lg w-full mx-4 p-6 animate-in zoom-in-95 fade-in duration-200 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-foreground">
            {modalTitle}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </button>
        </div>

        {loadingAccounts ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">{t('dashboard.noAccounts')}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-full bg-muted text-foreground font-medium hover:bg-muted/80 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
                  'flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  type === 'expense'
                    ? 'bg-red-500 text-white shadow-lg shadow-red-500/25'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                <ArrowDownLeft className="size-4" />
                {t('transactions.expense')}
              </button>
              <button
                type="button"
                onClick={() => setType('income')}
                className={cn(
                  'flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  type === 'income'
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                <ArrowUpRight className="size-4" />
                {t('transactions.income')}
              </button>
              <button
                type="button"
                onClick={() => setType('transfer')}
                className={cn(
                  'flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  type === 'transfer'
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                <ArrowLeftRight className="size-4" />
                {t('transactions.transfer')}
              </button>
              <button
                type="button"
                onClick={() => setType('adjustment')}
                className={cn(
                  'flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  type === 'adjustment'
                    ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/25'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
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
                className="text-5xl font-bold text-center bg-transparent border-none focus:outline-none focus:ring-0 w-48 placeholder:text-muted-foreground/40 text-foreground"
              />
              {/* Currency Dropdown */}
              <div className="relative" ref={currencyDropdownRef}>
                <button
                  type="button"
                  onClick={() => {
                    setIsCurrencyOpen(!isCurrencyOpen);
                    setIsAccountOpen(false);
                    setIsFromAccountOpen(false);
                    setIsToAccountOpen(false);
                  }}
                  className="text-lg font-medium bg-muted rounded-full px-4 py-2 border-none text-foreground cursor-pointer flex items-center gap-2 transition-all hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {selectedCurrency}
                  <ChevronDown className={`size-4 text-muted-foreground transition-transform ${isCurrencyOpen ? 'rotate-180' : ''}`} />
                </button>
                {isCurrencyOpen && (
                  <div className="absolute top-[110%] right-0 z-50 bg-popover border border-border shadow-2xl rounded-2xl overflow-hidden p-2 min-w-[100px]">
                    {AVAILABLE_CURRENCIES.map((curr) => (
                      <button
                        key={curr}
                        type="button"
                        onClick={() => {
                          setSelectedCurrency(curr);
                          setIsCurrencyOpen(false);
                        }}
                        className={`w-full p-3 rounded-xl text-left text-sm font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          selectedCurrency === curr
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                            : 'hover:bg-accent text-foreground'
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
                    className="w-full bg-muted rounded-2xl px-4 py-4 text-left font-medium text-foreground cursor-pointer flex justify-between items-center transition-all hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground">{t('common.account')}</span>
                      <span className="truncate">{accounts.find(acc => acc.id === accountId)?.name || t('transactions.selectAccount')}</span>
                    </div>
                    <ChevronDown className={`size-5 text-muted-foreground transition-transform ${isAccountOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isAccountOpen && (
                    <div className="absolute top-[110%] left-0 w-full z-50 bg-popover border border-border shadow-2xl rounded-2xl overflow-hidden p-2 max-h-60 overflow-y-auto">
                      {accounts.map((account) => (
                        <button
                          key={account.id}
                          type="button"
                          onClick={() => {
                            setAccountId(account.id);
                            setIsAccountOpen(false);
                          }}
                          className={`w-full p-3 rounded-xl text-left text-sm font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                            accountId === account.id
                              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                              : 'hover:bg-accent text-foreground'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span>{account.name}</span>
                            <span className="text-muted-foreground text-xs">{account.balance?.toLocaleString() || '0'} {account.currency}</span>
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
                    className="w-full bg-muted rounded-2xl px-4 py-4 text-left font-medium text-foreground cursor-pointer flex justify-between items-center transition-all hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground">{t('transactions.fromAccount')}</span>
                      <span className="truncate">{accounts.find(acc => acc.id === accountId)?.name || t('transactions.selectAccount')}</span>
                    </div>
                    <ChevronDown className={`size-5 text-muted-foreground transition-transform ${isFromAccountOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isFromAccountOpen && (
                    <div className="absolute top-[110%] left-0 w-full z-50 bg-popover border border-border shadow-2xl rounded-2xl overflow-hidden p-2 max-h-60 overflow-y-auto">
                      {accounts.map((account) => (
                        <button
                          key={account.id}
                          type="button"
                          onClick={() => {
                            setAccountId(account.id);
                            setIsFromAccountOpen(false);
                          }}
                          className={`w-full p-3 rounded-xl text-left text-sm font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                            accountId === account.id
                              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                              : 'hover:bg-accent text-foreground'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span>{account.name}</span>
                            <span className="text-muted-foreground text-xs">{account.balance?.toLocaleString() || '0'} {account.currency}</span>
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
                    className="w-full bg-muted rounded-2xl px-4 py-4 text-left font-medium text-foreground cursor-pointer flex justify-between items-center transition-all hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground">{t('transactions.toAccount')}</span>
                      <span className="truncate">{accounts.find(acc => acc.id === toAccountId)?.name || t('transactions.selectDestinationAccount')}</span>
                    </div>
                    <ChevronDown className={`size-5 text-muted-foreground transition-transform ${isToAccountOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isToAccountOpen && (
                    <div className="absolute top-[110%] left-0 w-full z-50 bg-popover border border-border shadow-2xl rounded-2xl overflow-hidden p-2 max-h-60 overflow-y-auto">
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
                            className={`w-full p-3 rounded-xl text-left text-sm font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                              toAccountId === account.id
                                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                                : 'hover:bg-accent text-foreground'
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <span>{account.name}</span>
                              <span className="text-muted-foreground text-xs">{account.balance?.toLocaleString() || '0'} {account.currency}</span>
                            </div>
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {/* Date Field - Filled Style (hidden for adjustments) */}
              {type !== 'adjustment' && (
                <div className="w-full bg-muted border-none rounded-xl h-14 px-4 flex flex-col justify-center focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 transition-shadow">
                  <span className="text-xs text-muted-foreground">
                    {t('common.date')}
                  </span>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-transparent font-medium text-foreground border-none p-0 focus:ring-0 focus:outline-none cursor-pointer"
                  />
                </div>
              )}

              {/* Note/Description Field - Filled Style */}
              <div className="w-full bg-muted border-none rounded-xl h-14 px-4 flex flex-col justify-center focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 transition-shadow">
                <span className="text-xs text-muted-foreground">
                  {t('transactions.note')}
                </span>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('transactions.notePlaceholder')}
                  className="w-full bg-transparent font-medium text-foreground border-none p-0 focus:ring-0 focus:outline-none placeholder:text-muted-foreground/60 truncate"
                />
              </div>
            </div>

            {/* Save Button */}
            <button
              type="submit"
              disabled={loading || !isValid}
              className="w-full h-14 mt-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed text-white font-semibold text-lg shadow-lg shadow-emerald-500/25 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {loading ? (
                <Loader2 className="animate-spin mx-auto size-6" />
              ) : (
                submitButtonText
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// Backward compatibility export
export { TransactionModal as NewTransactionModal };
