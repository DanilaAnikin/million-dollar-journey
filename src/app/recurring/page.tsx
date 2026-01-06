'use client';

import { useState, useEffect } from 'react';
import { Plus, TrendingUp, TrendingDown, DollarSign, Repeat, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RecurringList, RecurringModal, type RecurringFormData } from '@/components/recurring';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { useCurrency } from '@/lib/contexts/CurrencyContext';
import {
  getRecurringPageData,
  createRecurringTransaction,
  updateRecurringTransaction,
  deleteRecurringTransaction,
} from '@/app/actions/recurring';
import type { RecurringTransaction, Account, AccountCategory, Currency } from '@/types/database';

export default function RecurringPage() {
  const { t } = useLanguage();
  const { currency: globalCurrency, formatAmount } = useCurrency();

  const [recurring, setRecurring] = useState<RecurringTransaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<AccountCategory[]>([]);
  const [totals, setTotals] = useState<{
    monthlyExpensesUSD: number;
    monthlyIncomeUSD: number;
    netMonthlyUSD: number;
    rates: Record<Currency, number>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RecurringTransaction | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const result = await getRecurringPageData();
      setRecurring(result.recurring);
      setAccounts(result.accounts);
      setCategories(result.categories);
      setTotals(result.totals);
    } catch (error) {
      console.error('Error loading recurring data:', error);
      toast.error(t('common.somethingWentWrong'));
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(data: RecurringFormData) {
    try {
      if (editingItem) {
        const result = await updateRecurringTransaction({
          id: editingItem.id,
          name: data.name,
          amount: data.amount,
          currency: data.currency,
          frequency: data.frequency,
          next_due_date: data.nextDueDate,
          account_id: data.accountId,
          category_id: data.categoryId,
          type: data.type,
          description: data.description,
          is_active: data.isActive,
        });
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success(t('recurring.updatedSuccess'));
      } else {
        const result = await createRecurringTransaction({
          name: data.name,
          amount: data.amount,
          currency: data.currency,
          frequency: data.frequency,
          next_due_date: data.nextDueDate,
          account_id: data.accountId,
          category_id: data.categoryId,
          type: data.type,
          description: data.description,
        });
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success(t('recurring.createdSuccess'));
      }

      await loadData();
      setEditingItem(null);
    } catch (error) {
      console.error('Error submitting recurring payment:', error);
      toast.error(t('common.somethingWentWrong'));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t('recurring.confirmDelete'))) return;

    try {
      const result = await deleteRecurringTransaction(id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(t('recurring.deletedSuccess'));
      await loadData();
    } catch (error) {
      console.error('Error deleting recurring payment:', error);
      toast.error(t('common.somethingWentWrong'));
    }
  }

  async function handleToggleActive(id: string, isActive: boolean) {
    try {
      const result = await updateRecurringTransaction({
        id,
        is_active: isActive,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      await loadData();
    } catch (error) {
      console.error('Error toggling recurring payment:', error);
      toast.error(t('common.somethingWentWrong'));
    }
  }

  function handleEdit(item: RecurringTransaction) {
    setEditingItem(item);
    setModalOpen(true);
  }

  function handleAddNew() {
    setEditingItem(null);
    setModalOpen(true);
  }

  // Calculate display amounts in user's preferred currency
  const displayExpenses = totals
    ? totals.monthlyExpensesUSD * totals.rates[globalCurrency]
    : 0;

  const displayIncome = totals
    ? totals.monthlyIncomeUSD * totals.rates[globalCurrency]
    : 0;

  const displayNet = totals
    ? totals.netMonthlyUSD * totals.rates[globalCurrency]
    : 0;

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('recurring.title')}</h1>
        </div>
        <Button onClick={handleAddNew} className="btn-premium rounded-2xl h-12">
          <Plus className="h-4 w-4 mr-2" />
          {t('recurring.addNew')}
        </Button>
      </div>

      {/* Burn Rate KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Monthly Fixed Costs */}
        <Card className="rounded-2xl">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="icon-container bg-red-500/10 flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('recurring.monthlyFixedCosts')}
                </p>
                <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                  -{formatAmount(displayExpenses, globalCurrency)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Income */}
        <Card className="rounded-2xl">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="icon-container bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('recurring.monthlyIncome')}
                </p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  +{formatAmount(displayIncome, globalCurrency)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Net Monthly */}
        <Card className={`rounded-2xl ${displayNet >= 0 ? 'bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20' : 'bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20'}`}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className={`icon-container flex items-center justify-center ${displayNet >= 0 ? 'bg-primary/20' : 'bg-red-500/20'}`}>
                <DollarSign className={`h-5 w-5 ${displayNet >= 0 ? 'text-primary' : 'text-red-500'}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('recurring.netMonthly')}
                </p>
                <p className={`text-2xl font-bold ${displayNet >= 0 ? 'text-primary' : 'text-red-500'}`}>
                  {displayNet >= 0 ? '+' : ''}{formatAmount(displayNet, globalCurrency)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recurring List */}
      {recurring.length > 0 ? (
        <RecurringList
          items={recurring}
          accounts={accounts}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggleActive={handleToggleActive}
        />
      ) : (
        <Card className="rounded-2xl">
          <CardContent className="py-16 text-center">
            <div className="flex justify-center mb-4">
              <div className="icon-container-lg bg-muted flex items-center justify-center">
                <Repeat className="h-7 w-7 text-muted-foreground" />
              </div>
            </div>
            <p className="text-lg font-medium mb-2">{t('recurring.noRecurring')}</p>
            <p className="text-muted-foreground mb-6">{t('recurring.noRecurringHint')}</p>
            <Button onClick={handleAddNew} className="btn-premium rounded-2xl h-12">
              <Plus className="h-4 w-4 mr-2" />
              {t('recurring.addNew')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Modal */}
      <RecurringModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingItem(null);
        }}
        onSubmit={handleSubmit}
        recurring={editingItem}
        accounts={accounts}
        categories={categories}
      />
    </div>
  );
}
