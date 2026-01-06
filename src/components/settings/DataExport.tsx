'use client';

import { useState } from 'react';
import { Download, Upload, FileSpreadsheet, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import Papa from 'papaparse';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { createClient } from '@/lib/supabase/client';
import type { Transaction, Account, AccountCategory } from '@/types/database';

interface TransactionExport {
  Date: string;
  Amount: number;
  Currency: string;
  Type: string;
  Description: string;
  Account: string;
  Category: string;
}

interface AccountExport {
  Name: string;
  Currency: string;
  Balance: number;
  Institution: string;
  Category: string;
  Type: string;
  IsInvestment: boolean;
  InterestRate: number;
  Notes: string;
  CreatedAt: string;
}

export function DataExport() {
  const { t } = useLanguage();
  const [exportingTransactions, setExportingTransactions] = useState(false);
  const [exportingAccounts, setExportingAccounts] = useState(false);

  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  async function exportTransactions() {
    setExportingTransactions(true);
    try {
      const supabase = createClient();

      // Fetch all transactions
      const { data: transactionsData, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .order('transaction_date', { ascending: false });

      if (txError) {
        console.error('Error fetching transactions:', txError);
        toast.error(t('settings.exportError'));
        return;
      }

      const transactions = transactionsData as Transaction[] | null;

      if (!transactions || transactions.length === 0) {
        toast.error(t('transactions.noTransactions'));
        return;
      }

      // Fetch accounts to map names
      const { data: accountsData } = await supabase
        .from('accounts')
        .select('id, name, category_id');

      const accounts = accountsData as Pick<Account, 'id' | 'name' | 'category_id'>[] | null;

      // Fetch categories to map names
      const { data: categoriesData } = await supabase
        .from('account_categories')
        .select('id, name');

      const categories = categoriesData as Pick<AccountCategory, 'id' | 'name'>[] | null;

      const categoryMap = new Map<string, string>();
      if (categories) {
        for (const cat of categories) {
          categoryMap.set(cat.id, cat.name);
        }
      }

      const accountMap = new Map<string, { name: string; category: string }>();
      if (accounts) {
        for (const acc of accounts) {
          accountMap.set(acc.id, {
            name: acc.name,
            category: acc.category_id ? (categoryMap.get(acc.category_id) || '') : '',
          });
        }
      }

      // Transform to export format
      const exportData: TransactionExport[] = transactions.map((tx) => {
        const accountInfo = accountMap.get(tx.account_id) || { name: '', category: '' };
        return {
          Date: tx.transaction_date,
          Amount: tx.amount,
          Currency: tx.currency,
          Type: tx.type,
          Description: tx.description || '',
          Account: accountInfo.name,
          Category: accountInfo.category,
        };
      });

      // Convert to CSV
      const csv = Papa.unparse(exportData);

      // Trigger download
      const dateStr = new Date().toISOString().split('T')[0];
      downloadCSV(csv, `money-app-transactions-${dateStr}.csv`);

      toast.success(t('settings.exportSuccess'));
    } catch (error) {
      console.error('Export error:', error);
      toast.error(t('settings.exportError'));
    } finally {
      setExportingTransactions(false);
    }
  }

  async function exportAccounts() {
    setExportingAccounts(true);
    try {
      const supabase = createClient();

      // Fetch all accounts
      const { data: accountsData, error } = await supabase
        .from('accounts')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching accounts:', error);
        toast.error(t('settings.exportError'));
        return;
      }

      const accounts = accountsData as Account[] | null;

      if (!accounts || accounts.length === 0) {
        toast.error(t('settings.noAccountsFound'));
        return;
      }

      // Fetch categories to map names
      const { data: categoriesData } = await supabase
        .from('account_categories')
        .select('id, name, type');

      const categories = categoriesData as Pick<AccountCategory, 'id' | 'name' | 'type'>[] | null;

      const categoryMap = new Map<string, { name: string; type: string }>();
      if (categories) {
        for (const cat of categories) {
          categoryMap.set(cat.id, { name: cat.name, type: cat.type });
        }
      }

      // Transform to export format
      const exportData: AccountExport[] = accounts.map((acc) => {
        const categoryInfo = acc.category_id ? categoryMap.get(acc.category_id) : null;
        return {
          Name: acc.name,
          Currency: acc.currency,
          Balance: acc.balance,
          Institution: acc.institution || '',
          Category: categoryInfo?.name || '',
          Type: categoryInfo?.type || '',
          IsInvestment: acc.is_investment || false,
          InterestRate: acc.interest_rate_pa || 0,
          Notes: acc.notes || '',
          CreatedAt: acc.created_at,
        };
      });

      // Convert to CSV
      const csv = Papa.unparse(exportData);

      // Trigger download
      const dateStr = new Date().toISOString().split('T')[0];
      downloadCSV(csv, `money-app-accounts-${dateStr}.csv`);

      toast.success(t('settings.exportSuccess'));
    } catch (error) {
      console.error('Export error:', error);
      toast.error(t('settings.exportError'));
    } finally {
      setExportingAccounts(false);
    }
  }

  return (
    <div className="space-y-2">
      <p className="section-header">{t('settings.dataManagement')}</p>
      <div className="settings-group">
        <div className="p-5 space-y-4">
          {/* Section Header with Icon */}
          <div className="flex items-center gap-3">
            <div className="icon-container-sm bg-emerald-500/10">
              <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
            </div>
            <div>
              <p className="font-medium text-sm">{t('settings.exportDescription')}</p>
            </div>
          </div>

          {/* Export Buttons */}
          <div className="space-y-3">
            <Button
              onClick={exportTransactions}
              disabled={exportingTransactions}
              variant="outline"
              className="w-full h-12 rounded-xl"
            >
              {exportingTransactions ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {exportingTransactions ? t('settings.exporting') : t('settings.exportTransactions')}
            </Button>

            <Button
              onClick={exportAccounts}
              disabled={exportingAccounts}
              variant="outline"
              className="w-full h-12 rounded-xl"
            >
              {exportingAccounts ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {exportingAccounts ? t('settings.exporting') : t('settings.exportAccounts')}
            </Button>
          </div>
        </div>

        {/* Import Link */}
        <div className="border-t border-border/30">
          <Link
            href="/import"
            className="settings-item hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="icon-container-sm bg-blue-500/10">
                <Upload className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <p className="font-medium text-sm">{t('settings.importData')}</p>
                <p className="text-xs text-muted-foreground">{t('settings.importDescription')}</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
