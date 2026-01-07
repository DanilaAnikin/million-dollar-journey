'use client';

import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import {
  NetWorthCard,
  MonthlyGoalCard,
  AccountsSummary,
  RecentTransactions,
  EmptyState,
  NetWorthChart,
  AllocationChart,
  BurnRateCard,
  AIAdvisorCard,
} from '@/components/dashboard';
import { TrendingUp } from 'lucide-react';
import { calculateMonthlyContribution, type CalculationResult } from '@/lib/services/calculator';
import {
  calculateHistoricalNetWorth,
  filterDataByRange,
  getPeriodChange,
  type NetWorthDataPoint,
  type TimeRange,
  type PeriodChange,
} from '@/lib/services/analytics';
import { getLiveRates } from '@/lib/services/currency';
import { createClient } from '@/lib/supabase/client';
import { TARGET_AMOUNT_USD, TARGET_DATE } from '@/lib/constants';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { useCurrency } from '@/lib/contexts/CurrencyContext';
import type { Account, AccountCategory, Transaction, Profile, RecurringTransaction } from '@/types/database';

export function DashboardContent() {
  // 1. ALL useContext calls
  const { t } = useLanguage();
  const { rates } = useCurrency();

  // 2. ALL useState declarations
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<AccountCategory[]>([]);
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [calculation, setCalculation] = useState<CalculationResult | null>(null);
  const [historicalNetWorth, setHistoricalNetWorth] = useState<NetWorthDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [targetAmount, setTargetAmount] = useState(TARGET_AMOUNT_USD);
  const [selectedRange, setSelectedRange] = useState<TimeRange>('ALL');

  const supabase = createClient();

  // 3. ALL useMemo calculations - MUST come before conditional returns
  // Filter historical data based on selected time range
  const filteredHistoricalData = useMemo(() => {
    if (!historicalNetWorth || historicalNetWorth.length === 0) {
      return [];
    }
    return filterDataByRange(historicalNetWorth, selectedRange);
  }, [historicalNetWorth, selectedRange]);

  // Calculate performance metrics for the selected period
  const performanceData = useMemo(() => {
    if (!filteredHistoricalData || filteredHistoricalData.length === 0) {
      return { absolute: 0, percentage: 0 };
    }
    return getPeriodChange(filteredHistoricalData);
  }, [filteredHistoricalData]);

  // Get net worth from calculation (in USD, will be converted by NetWorthCard using global currency)
  const netWorthUSD = calculation?.currentNetWorthUSD ?? 0;

  // 4. ALL useEffect calls
  useEffect(() => {
    loadData();
  }, []);

  // Helper functions
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

      // Fetch accounts, transactions, profile, categories, and recurring transactions in parallel
      const [accountsRes, recentTransactionsRes, allTransactionsRes, profileRes, categoriesRes, recurringRes] = await Promise.all([
        supabase
          .from('accounts')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('created_at'),
        // Recent transactions for the "Recent Transactions" section (limit 10)
        supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('transaction_date', { ascending: false })
          .limit(10),
        // All transactions for historical net worth calculation (no limit)
        supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('transaction_date', { ascending: false }),
        supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single(),
        supabase
          .from('account_categories')
          .select('*')
          .eq('user_id', user.id)
          .order('sort_order'),
        supabase
          .from('recurring_transactions')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true),
      ]);

      const fetchedAccounts = accountsRes.data || [];
      const fetchedCategories = (categoriesRes.data || []) as AccountCategory[];
      const profile = profileRes.data as Profile | null;
      const fetchedAllTransactions = allTransactionsRes.data || [];
      const fetchedRecurring = (recurringRes.data || []) as RecurringTransaction[];

      setAccounts(fetchedAccounts);
      setTransactions(recentTransactionsRes.data || []);
      setAllTransactions(fetchedAllTransactions);
      setCategories(fetchedCategories);
      setRecurringTransactions(fetchedRecurring);

      // Calculate projections using live rates, categories, and user's custom target settings
      if (fetchedAccounts.length > 0) {
        // Use profile settings if available, otherwise use defaults from constants
        const customTargetAmount = profile?.target_amount_usd;
        const customTargetDate = profile?.target_date ? new Date(profile.target_date) : undefined;

        // Update state with the target amount for use in NetWorthCard
        if (customTargetAmount) {
          setTargetAmount(customTargetAmount);
        }

        // Pass categories to use centralized portfolio calculator for accurate net worth
        const calc = await calculateMonthlyContribution(
          fetchedAccounts,
          customTargetAmount,
          customTargetDate,
          undefined,
          liveRates,
          fetchedCategories  // Now includes categories for proper asset/liability handling
        );
        setCalculation(calc);

        // Calculate historical net worth using the reverse walk algorithm
        // Only calculate if we have transactions, otherwise fall back to mock data
        if (fetchedAllTransactions.length > 0) {
          const historicalData = calculateHistoricalNetWorth(
            calc.currentNetWorthUSD,
            fetchedAllTransactions,
            12 // Show 12 months of history
          );
          setHistoricalNetWorth(historicalData);
        }
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error(t('dashboard.loadFailed'));
    } finally {
      setLoading(false);
    }
  }

  // ===== NO MORE HOOKS BELOW THIS LINE =====

  // 5. Conditional returns (loading states, error states, etc.)
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

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* AI Advisor Card - Prominent placement at top */}
      <AIAdvisorCard />

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

      {/* Net Worth History Chart - Full width */}
      <div className="rounded-2xl border bg-card p-4 md:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-xl bg-primary/10">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <span className="font-semibold">{t('dashboard.netWorthHistory')}</span>
        </div>
        <NetWorthChart
          className="h-[300px]"
          goalAmount={targetAmount}
          data={historicalNetWorth.length > 0 ? historicalNetWorth : undefined}
          selectedRange={selectedRange}
          onRangeChange={setSelectedRange}
        />
      </div>

      {/* Three-Column Grid for Accounts, Burn Rate, and Allocation */}
      <div className="grid gap-6 lg:grid-cols-3">
        <AccountsSummary
          accounts={accounts}
        />
        <BurnRateCard
          recurringTransactions={recurringTransactions}
        />
        <AllocationChart
          accounts={accounts}
          categories={categories}
        />
      </div>

      {/* Recent Transactions - Full width */}
      <RecentTransactions transactions={transactions} onTransactionDeleted={loadData} />
    </div>
  );
}
