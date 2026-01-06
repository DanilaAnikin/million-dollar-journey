'use client';

import { useState, useEffect } from 'react';
import { Plus, TrendingUp, TrendingDown, Wallet, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AccountCard, AccountDialog } from '@/components/accounts';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { useCurrency } from '@/lib/contexts/CurrencyContext';
import { createAccount, updateAccount, deleteAccount, getAccounts } from '@/app/actions/accounts';
import type { Account, AccountCategory, Currency } from '@/types/database';

export default function AccountsPage() {
  const { t } = useLanguage();
  const { currency: globalCurrency, formatAmount } = useCurrency();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<AccountCategory[]>([]);
  const [serverTotals, setServerTotals] = useState<{
    netWorthUSD: number;
    totalUSD: number;
    assetsUSD: number;
    liabilitiesUSD: number;
    investmentsUSD: number;
    cashUSD: number;
    rates: Record<Currency, number>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<'ALL' | Currency>('ALL');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const result = await getAccounts();

      const fetchedAccounts = result.accounts;
      const fetchedCategories = result.categories;
      const fetchedTotals = result.totals;

      setAccounts(fetchedAccounts);
      setCategories(fetchedCategories);

      // Set server totals from the response (uses centralized portfolio calculator)
      setServerTotals({
        netWorthUSD: fetchedTotals.netWorthUSD,
        totalUSD: fetchedTotals.totalUSD,
        assetsUSD: fetchedTotals.assetsUSD,
        liabilitiesUSD: fetchedTotals.liabilitiesUSD,
        investmentsUSD: fetchedTotals.investmentsUSD,
        cashUSD: fetchedTotals.cashUSD,
        rates: fetchedTotals.rates
      });
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(data: {
    name: string;
    categoryId?: string;
    currency: Currency;
    balance: number;
    isInvestment: boolean;
    interestRatePa: number;
    institution?: string;
  }) {
    try {
      if (editingAccount) {
        const result = await updateAccount({
          id: editingAccount.id,
          name: data.name,
          categoryId: data.categoryId || null,
          balance: data.balance,
          isInvestment: data.isInvestment,
          interestRatePa: data.interestRatePa,
          institution: data.institution,
        });
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success(t('accounts.updatedSuccess'));
      } else {
        const result = await createAccount({
          categoryId: data.categoryId || null,
          name: data.name,
          currency: data.currency,
          balance: data.balance,
          isInvestment: data.isInvestment,
          interestRatePa: data.interestRatePa,
          institution: data.institution,
        });
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success(t('accounts.createdSuccess'));
      }

      await loadData();
      setEditingAccount(null);
    } catch (error) {
      console.error('Error submitting account form:', error);
      toast.error(t('common.somethingWentWrong'));
    }
  }

  async function handleDelete(accountId: string) {
    if (!confirm(t('accounts.confirmDelete'))) return;

    try {
      await deleteAccount(accountId);
      toast.success(t('accounts.deletedSuccess'));
      await loadData();
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error(t('common.somethingWentWrong'));
    }
  }

  function handleEdit(account: Account) {
    setEditingAccount(account);
    setDialogOpen(true);
  }

  function handleAddNew() {
    setEditingAccount(null);
    setDialogOpen(true);
  }

  // Filter accounts by selected currency
  const filteredAccounts = accounts.filter(
    (acc) => selectedCurrency === 'ALL' || acc.currency === selectedCurrency
  );

  // Currency filter options
  const currencyFilters: { value: 'ALL' | Currency; label: string }[] = [
    { value: 'ALL', label: t('transactions.all') },
    { value: 'CZK', label: 'CZK' },
    { value: 'USD', label: 'USD' },
    { value: 'EUR', label: 'EUR' },
  ];

  // Group accounts by category
  const groupedAccounts = categories.reduce((acc, category) => {
    const categoryAccounts = filteredAccounts.filter(a => a.category_id === category.id);
    if (categoryAccounts.length > 0) {
      acc[category.name] = { accounts: categoryAccounts, type: category.type };
    }
    return acc;
  }, {} as Record<string, { accounts: Account[]; type: string }>);

  // Add uncategorized accounts
  const uncategorized = filteredAccounts.filter(a => !a.category_id);
  if (uncategorized.length > 0) {
    groupedAccounts[t('accounts.uncategorized')] = { accounts: uncategorized, type: 'asset' };
  }

  // Use server totals with server rates for consistency
  // All calculations use the centralized portfolioCalculator for accuracy
  const displayNetWorth = serverTotals
    ? serverTotals.netWorthUSD * serverTotals.rates[globalCurrency]
    : 0;

  const displayAssets = serverTotals
    ? serverTotals.assetsUSD * serverTotals.rates[globalCurrency]
    : 0;

  const displayLiabilities = serverTotals
    ? serverTotals.liabilitiesUSD * serverTotals.rates[globalCurrency]
    : 0;

  if (loading) {
    return (
      <div className="p-4 lg:p-6 flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('accounts.title')}</h1>
        </div>
        <Button onClick={handleAddNew} className="btn-premium rounded-2xl h-12">
          <Plus className="h-4 w-4 mr-2" />
          {t('accounts.addAccount')}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Net Worth Card - Primary metric */}
        <Card className="rounded-2xl md:col-span-3 lg:col-span-1 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="icon-container bg-primary/20 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('dashboard.totalNetWorth')}</p>
                <p className="text-2xl font-bold">{formatAmount(displayNetWorth, globalCurrency)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="icon-container bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('accounts.totalAssets')}</p>
                <p className="text-2xl font-bold">{formatAmount(displayAssets, globalCurrency)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="icon-container bg-red-500/10 flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('accounts.totalLiabilities')}</p>
                <p className="text-2xl font-bold">{formatAmount(displayLiabilities, globalCurrency)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Currency Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {currencyFilters.map((filter) => (
          <button
            key={filter.value}
            onClick={() => setSelectedCurrency(filter.value)}
            className={`filter-pill whitespace-nowrap ${
              selectedCurrency === filter.value ? 'filter-pill-active' : ''
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Accounts by Category */}
      {Object.entries(groupedAccounts).map(([categoryName, { accounts: categoryAccounts, type }]) => (
        <div key={categoryName} className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${type === 'liability' ? 'bg-red-500' : 'bg-green-500'}`} />
            {categoryName}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categoryAccounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                categoryType={type}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Empty State - No accounts at all */}
      {accounts.length === 0 && (
        <Card className="rounded-2xl">
          <CardContent className="py-16 text-center">
            <div className="flex justify-center mb-4">
              <div className="icon-container-lg bg-muted flex items-center justify-center">
                <Wallet className="h-7 w-7 text-muted-foreground" />
              </div>
            </div>
            <p className="text-muted-foreground mb-6">{t('dashboard.noAccounts')}</p>
            <Button onClick={handleAddNew} className="btn-premium rounded-2xl h-12">
              <Plus className="h-4 w-4 mr-2" />
              {t('dashboard.addFirstAccount')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Empty State - No accounts for selected currency filter */}
      {accounts.length > 0 && filteredAccounts.length === 0 && (
        <Card className="rounded-2xl">
          <CardContent className="py-16 text-center">
            <div className="flex justify-center mb-4">
              <div className="icon-container-lg bg-muted flex items-center justify-center">
                <Wallet className="h-7 w-7 text-muted-foreground" />
              </div>
            </div>
            <p className="text-muted-foreground">{t('accounts.noAccountsForCurrency')}</p>
          </CardContent>
        </Card>
      )}

      {/* Account Dialog */}
      <AccountDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        account={editingAccount}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
