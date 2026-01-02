'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  NetWorthCard,
  MonthlyGoalCard,
  AccountsSummary,
  RecentTransactions,
  EmptyState,
} from '@/components/dashboard';
import { calculateMonthlyContribution, type CalculationResult } from '@/lib/services/calculator';
import { getLiveRates } from '@/lib/services/currency';
import { createClient } from '@/lib/supabase/client';
import { TARGET_AMOUNT_USD, TARGET_DATE } from '@/lib/constants';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { useCurrency } from '@/lib/contexts/CurrencyContext';
import type { Account, Transaction } from '@/types/database';

export function DashboardContent() {
  const { t } = useLanguage();
  const { rates } = useCurrency();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [calculation, setCalculation] = useState<CalculationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [targetAmount, setTargetAmount] = useState(TARGET_AMOUNT_USD);

  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch live rates first (same as getAccounts does)
      const liveRates = await getLiveRates();
      console.log('DashboardContent: Using live rates from API', { CZK: liveRates.CZK, EUR: liveRates.EUR });

      // Fetch accounts, transactions, and profile in parallel
      const [accountsRes, transactionsRes, profileRes] = await Promise.all([
        supabase
          .from('accounts')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('created_at'),
        supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('transaction_date', { ascending: false })
          .limit(10),
        supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single(),
      ]);

      const fetchedAccounts = accountsRes.data || [];
      const profile = profileRes.data;

      setAccounts(fetchedAccounts);
      setTransactions(transactionsRes.data || []);

      // Calculate projections using live rates and user's custom target settings
      if (fetchedAccounts.length > 0) {
        // Use profile settings if available, otherwise use defaults from constants
        const customTargetAmount = profile?.target_amount_usd;
        const customTargetDate = profile?.target_date ? new Date(profile.target_date) : undefined;

        // Update state with the target amount for use in NetWorthCard
        if (customTargetAmount) {
          setTargetAmount(customTargetAmount);
        }

        console.log('=== DASHBOARD CALCULATION START ===');
        console.log('Profile data:', {
          target_amount_usd: profile?.target_amount_usd,
          target_date: profile?.target_date,
          target_date_type: typeof profile?.target_date,
        });
        console.log('Using target settings:', {
          targetAmount: customTargetAmount || TARGET_AMOUNT_USD,
          targetDate: customTargetDate || TARGET_DATE,
          targetDateISO: (customTargetDate || TARGET_DATE).toISOString(),
          source: customTargetAmount && customTargetDate ? 'user profile' : 'defaults'
        });

        const calc = await calculateMonthlyContribution(
          fetchedAccounts,
          customTargetAmount,
          customTargetDate,
          undefined,
          liveRates
        );
        console.log('Calculation results:', {
          currentNetWorthUSD: calc.currentNetWorthUSD,
          monthlyContributionNeeded: calc.monthlyContributionNeeded,
          monthsRemaining: calc.monthsRemaining,
          yearsRemaining: calc.yearsRemaining,
          targetDate: calc.targetDate,
          targetAmount: calc.targetAmount,
        });
        console.log('=== DASHBOARD CALCULATION END ===');
        setCalculation(calc);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error(t('dashboard.loadFailed'));
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-4 lg:p-6 flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-2">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="text-muted-foreground">{t('dashboard.loading')}</p>
        </div>
      </div>
    );
  }

  if (accounts.length === 0) {
    return <EmptyState />;
  }

  // Get net worth from calculation (in USD, will be converted by NetWorthCard using global currency)
  const netWorthUSD = calculation?.currentNetWorthUSD ?? 0;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Hero Cards - Side by side on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <NetWorthCard
          amount={netWorthUSD}
          sourceCurrency="USD"
          targetAmount={targetAmount}
        />

        {calculation && (
          <MonthlyGoalCard
            monthlyContributionUSD={calculation.monthlyContributionNeeded}
            monthsRemaining={calculation.monthsRemaining}
            yearsRemaining={calculation.yearsRemaining}
            onTrack={calculation.onTrack}
            calculation={calculation}
          />
        )}
      </div>

      {/* Two-Column Grid for Accounts and Transactions */}
      <div className="grid gap-6 lg:grid-cols-2">
        <AccountsSummary
          accounts={accounts}
        />
        <RecentTransactions transactions={transactions} />
      </div>
    </div>
  );
}
