'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Loader2, ArrowDownLeft, ArrowUpRight, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { useCurrency } from '@/lib/contexts/CurrencyContext';
import type { RecurringTransaction, Account, AccountCategory, Currency, RecurringFrequency } from '@/types/database';

interface RecurringModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: RecurringFormData) => Promise<void>;
  recurring?: RecurringTransaction | null;
  accounts: Account[];
  categories: AccountCategory[];
}

export interface RecurringFormData {
  name: string;
  amount: number;
  currency: Currency;
  frequency: RecurringFrequency;
  nextDueDate: string;
  accountId: string;
  categoryId: string | null;
  type: 'expense' | 'income';
  description: string | null;
  isActive: boolean;
}

const AVAILABLE_CURRENCIES: Currency[] = ['USD', 'EUR', 'GBP', 'CZK', 'JPY', 'CHF', 'CAD', 'AUD'];
const FREQUENCIES: RecurringFrequency[] = ['weekly', 'monthly', 'yearly'];

export function RecurringModal({
  isOpen,
  onClose,
  onSubmit,
  recurring,
  accounts,
  categories,
}: RecurringModalProps) {
  const { t } = useLanguage();
  const { currency: globalCurrency } = useCurrency();
  const modalRef = useRef<HTMLDivElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Form state
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(
    AVAILABLE_CURRENCIES.includes(globalCurrency) ? globalCurrency : 'CZK'
  );
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly');
  const [nextDueDate, setNextDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);

  // Dropdown states
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isFrequencyOpen, setIsFrequencyOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);

  // Initialize form when editing
  useEffect(() => {
    if (recurring) {
      setType(recurring.type);
      setName(recurring.name);
      setAmount(recurring.amount.toString());
      setSelectedCurrency(recurring.currency);
      setFrequency(recurring.frequency);
      setNextDueDate(recurring.next_due_date);
      setAccountId(recurring.account_id);
      setCategoryId(recurring.category_id);
      setDescription(recurring.description || '');
      setIsActive(recurring.is_active);
    } else {
      // Reset form
      setType('expense');
      setName('');
      setAmount('');
      setSelectedCurrency(AVAILABLE_CURRENCIES.includes(globalCurrency) ? globalCurrency : 'CZK');
      setFrequency('monthly');
      setNextDueDate(new Date().toISOString().split('T')[0]);
      setAccountId(accounts[0]?.id || '');
      setCategoryId(null);
      setDescription('');
      setIsActive(true);
    }
  }, [recurring, isOpen, accounts, globalCurrency]);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!dropdownRef.current?.contains(target)) {
        setIsCurrencyOpen(false);
        setIsAccountOpen(false);
        setIsFrequencyOpen(false);
        setIsCategoryOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const numAmount = parseFloat(amount);
    if (!name.trim() || !accountId || numAmount <= 0) {
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        name: name.trim(),
        amount: numAmount,
        currency: selectedCurrency,
        frequency,
        nextDueDate,
        accountId,
        categoryId,
        type,
        description: description.trim() || null,
        isActive,
      });
      onClose();
    } catch (error) {
      console.error('Error submitting recurring payment:', error);
    } finally {
      setLoading(false);
    }
  };

  const isValid = name.trim() && amount && parseFloat(amount) > 0 && accountId;

  const getFrequencyLabel = (freq: RecurringFrequency) => {
    const labels = {
      weekly: t('recurring.weekly'),
      monthly: t('recurring.monthly'),
      yearly: t('recurring.yearly'),
    };
    return labels[freq];
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xl cursor-pointer"
      onClick={handleOverlayClick}
    >
      <div
        ref={modalRef}
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-lg w-full mx-4 p-6 animate-in zoom-in-95 fade-in duration-200 cursor-default max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            {recurring ? t('recurring.editRecurring') : t('recurring.addRecurring')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
            <span className="sr-only">{t('common.close')}</span>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Type Selector */}
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
          </div>

          {/* Amount Section */}
          <div className="flex items-center justify-center gap-3 py-6">
            <input
              ref={amountInputRef}
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => {
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
                  setIsFrequencyOpen(false);
                  setIsCategoryOpen(false);
                }}
                className="text-lg font-medium bg-slate-100 dark:bg-slate-800 rounded-full px-4 py-2 border-none text-slate-700 dark:text-slate-300 cursor-pointer flex items-center gap-2 transition-all hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                {selectedCurrency}
                <ChevronDown
                  className={`size-4 text-slate-400 transition-transform ${isCurrencyOpen ? 'rotate-180' : ''}`}
                />
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

          {/* Form Fields */}
          <div ref={dropdownRef} className="space-y-4">
            {/* Name Field */}
            <div className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl h-14 px-4 flex flex-col justify-center focus-within:ring-2 focus-within:ring-emerald-500 transition-shadow">
              <span className="text-xs text-slate-500 dark:text-slate-400">{t('recurring.name')}</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('recurring.namePlaceholder')}
                className="w-full bg-transparent font-medium text-slate-900 dark:text-white border-none p-0 focus:ring-0 focus:outline-none placeholder-slate-400 dark:placeholder-slate-500"
              />
            </div>

            {/* Account Dropdown */}
            <div className="relative w-full">
              <button
                type="button"
                onClick={() => {
                  setIsAccountOpen(!isAccountOpen);
                  setIsCurrencyOpen(false);
                  setIsFrequencyOpen(false);
                  setIsCategoryOpen(false);
                }}
                className="w-full bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-4 text-left font-medium text-slate-900 dark:text-white cursor-pointer flex justify-between items-center transition-all hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                <div className="flex flex-col">
                  <span className="text-xs text-slate-500 dark:text-slate-400">{t('common.account')}</span>
                  <span className="truncate">
                    {accounts.find((acc) => acc.id === accountId)?.name || t('transactions.selectAccount')}
                  </span>
                </div>
                <ChevronDown
                  className={`size-5 text-slate-400 transition-transform ${isAccountOpen ? 'rotate-180' : ''}`}
                />
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
                        <span className="text-slate-500 text-xs">{account.currency}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Frequency Dropdown */}
            <div className="relative w-full">
              <button
                type="button"
                onClick={() => {
                  setIsFrequencyOpen(!isFrequencyOpen);
                  setIsCurrencyOpen(false);
                  setIsAccountOpen(false);
                  setIsCategoryOpen(false);
                }}
                className="w-full bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-4 text-left font-medium text-slate-900 dark:text-white cursor-pointer flex justify-between items-center transition-all hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                <div className="flex flex-col">
                  <span className="text-xs text-slate-500 dark:text-slate-400">{t('recurring.frequency')}</span>
                  <span className="truncate">{getFrequencyLabel(frequency)}</span>
                </div>
                <ChevronDown
                  className={`size-5 text-slate-400 transition-transform ${isFrequencyOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {isFrequencyOpen && (
                <div className="absolute top-[110%] left-0 w-full z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-2xl overflow-hidden p-2">
                  {FREQUENCIES.map((freq) => (
                    <button
                      key={freq}
                      type="button"
                      onClick={() => {
                        setFrequency(freq);
                        setIsFrequencyOpen(false);
                      }}
                      className={`w-full p-3 rounded-xl text-left text-sm font-medium transition-colors cursor-pointer ${
                        frequency === freq
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-white'
                      }`}
                    >
                      {getFrequencyLabel(freq)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Category Dropdown (Optional) */}
            <div className="relative w-full">
              <button
                type="button"
                onClick={() => {
                  setIsCategoryOpen(!isCategoryOpen);
                  setIsCurrencyOpen(false);
                  setIsAccountOpen(false);
                  setIsFrequencyOpen(false);
                }}
                className="w-full bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-4 text-left font-medium text-slate-900 dark:text-white cursor-pointer flex justify-between items-center transition-all hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                <div className="flex flex-col">
                  <span className="text-xs text-slate-500 dark:text-slate-400">{t('accounts.category')}</span>
                  <span className="truncate">
                    {categoryId
                      ? categories.find((c) => c.id === categoryId)?.name
                      : t('recurring.noCategory')}
                  </span>
                </div>
                <ChevronDown
                  className={`size-5 text-slate-400 transition-transform ${isCategoryOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {isCategoryOpen && (
                <div className="absolute top-[110%] left-0 w-full z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-2xl overflow-hidden p-2 max-h-60 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setCategoryId(null);
                      setIsCategoryOpen(false);
                    }}
                    className={`w-full p-3 rounded-xl text-left text-sm font-medium transition-colors cursor-pointer ${
                      !categoryId
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-white'
                    }`}
                  >
                    {t('recurring.noCategory')}
                  </button>
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => {
                        setCategoryId(category.id);
                        setIsCategoryOpen(false);
                      }}
                      className={`w-full p-3 rounded-xl text-left text-sm font-medium transition-colors cursor-pointer ${
                        categoryId === category.id
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-white'
                      }`}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Next Due Date */}
            <div className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl h-14 px-4 flex flex-col justify-center focus-within:ring-2 focus-within:ring-emerald-500 transition-shadow">
              <span className="text-xs text-slate-500 dark:text-slate-400">{t('recurring.nextDue')}</span>
              <input
                type="date"
                value={nextDueDate}
                onChange={(e) => setNextDueDate(e.target.value)}
                className="w-full bg-transparent font-medium text-slate-900 dark:text-white border-none p-0 focus:ring-0 focus:outline-none cursor-pointer"
              />
            </div>

            {/* Description (Optional) */}
            <div className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl h-14 px-4 flex flex-col justify-center focus-within:ring-2 focus-within:ring-emerald-500 transition-shadow">
              <span className="text-xs text-slate-500 dark:text-slate-400">{t('common.description')}</span>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('transactions.notePlaceholder')}
                className="w-full bg-transparent font-medium text-slate-900 dark:text-white border-none p-0 focus:ring-0 focus:outline-none placeholder-slate-400 dark:placeholder-slate-500 truncate"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !isValid}
            className="w-full h-14 mt-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold text-lg shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
          >
            {loading ? (
              <Loader2 className="animate-spin mx-auto size-6" />
            ) : (
              t('common.save')
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
