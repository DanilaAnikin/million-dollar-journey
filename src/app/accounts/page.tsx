'use client';

import { useState, useEffect } from 'react';
import { Plus, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
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
    totalUSD: number;
    assetsUSD: number;
    liabilitiesUSD: number;
    rates: { USD: number; CZK: number; EUR: number };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

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

      // Set server totals from the response
      setServerTotals({
        totalUSD: fetchedTotals.totalUSD,
        assetsUSD: fetchedTotals.assetsUSD,
        liabilitiesUSD: fetchedTotals.liabilitiesUSD,
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

  // Group accounts by category
  const groupedAccounts = categories.reduce((acc, category) => {
    const categoryAccounts = accounts.filter(a => a.category_id === category.id);
    if (categoryAccounts.length > 0) {
      acc[category.name] = { accounts: categoryAccounts, type: category.type };
    }
    return acc;
  }, {} as Record<string, { accounts: Account[]; type: string }>);

  // Add uncategorized accounts
  const uncategorized = accounts.filter(a => !a.category_id);
  if (uncategorized.length > 0) {
    groupedAccounts[t('accounts.uncategorized')] = { accounts: uncategorized, type: 'asset' };
  }

  // Use server totals with server rates for consistency
  const displayAssets = serverTotals
    ? serverTotals.assetsUSD * serverTotals.rates[globalCurrency as 'USD' | 'CZK' | 'EUR']
    : 0;

  const displayLiabilities = serverTotals
    ? serverTotals.liabilitiesUSD * serverTotals.rates[globalCurrency as 'USD' | 'CZK' | 'EUR']
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
      <div className="grid gap-4 md:grid-cols-2">
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

      {/* Empty State */}
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
