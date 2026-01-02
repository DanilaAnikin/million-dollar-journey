'use server';

// Dashboard Server Actions for Million Dollar Journey

import { createClient } from '@/lib/supabase/server';
import { calculateMonthlyContribution, type CalculationResult } from '@/lib/services/calculator';
import { toUSD, getLatestRates, formatCurrency, getLiveRates } from '@/lib/services/currency';
import type { Account, AccountCategory, Profile, Transaction, Milestone, Currency } from '@/types/database';

// ================================================
// TYPES
// ================================================

export interface DashboardData {
  profile: Profile | null;
  accounts: Account[];
  categories: AccountCategory[];
  recentTransactions: Transaction[];
  milestones: Milestone[];
  calculation: CalculationResult;
  exchangeRates: {
    USD: number;
    CZK: number;
    EUR: number;
  };
}

export interface AccountWithCategory extends Account {
  category: AccountCategory | null;
}

// ================================================
// DASHBOARD DATA
// ================================================

/**
 * Fetches all data needed for the dashboard
 */
export async function getDashboardData(userId: string): Promise<DashboardData> {
  const supabase = await createClient();

  // Await live rates from API
  const rates = await getLiveRates();

  // Fetch all data in parallel
  const [
    profileResult,
    accountsResult,
    categoriesResult,
    transactionsResult,
    milestonesResult,
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('accounts').select('*').eq('user_id', userId).eq('is_active', true).order('created_at'),
    supabase.from('account_categories').select('*').eq('user_id', userId).order('sort_order'),
    supabase.from('transactions').select('*').eq('user_id', userId).order('transaction_date', { ascending: false }).limit(10),
    supabase.from('milestones').select('*').eq('user_id', userId).order('target_amount_usd'),
  ]);

  const accounts = accountsResult.data || [];
  const profile = profileResult.data;

  // Calculate the financial projection using profile's target settings
  const targetAmount = profile?.target_amount_usd;
  const targetDate = profile?.target_date ? new Date(profile.target_date) : undefined;

  const calculation = await calculateMonthlyContribution(
    accounts,
    targetAmount,
    targetDate,
    undefined,
    rates
  );

  // Update milestone achievements
  const milestones = (milestonesResult.data || []).map(milestone => ({
    ...milestone,
    achieved_at: calculation.currentNetWorthUSD >= milestone.target_amount_usd
      ? milestone.achieved_at || new Date().toISOString()
      : null,
  }));

  return {
    profile: profileResult.data,
    accounts,
    categories: categoriesResult.data || [],
    recentTransactions: transactionsResult.data || [],
    milestones,
    calculation,
    exchangeRates: {
      USD: rates.USD,
      CZK: rates.CZK,
      EUR: rates.EUR,
    },
  };
}

/**
 * Gets accounts grouped by category
 */
export async function getAccountsByCategory(userId: string): Promise<Map<string, AccountWithCategory[]>> {
  const supabase = await createClient();

  const { data: accounts } = await supabase
    .from('accounts')
    .select(`
      *,
      category:account_categories!category_id(*)
    `)
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at');

  const grouped = new Map<string, AccountWithCategory[]>();

  for (const account of accounts || []) {
    const categoryName = account.category?.name || 'Uncategorized';
    if (!grouped.has(categoryName)) {
      grouped.set(categoryName, []);
    }
    grouped.get(categoryName)!.push(account as AccountWithCategory);
  }

  return grouped;
}

/**
 * Gets the total net worth in all supported currencies
 */
export async function getNetWorthInAllCurrencies(userId: string): Promise<{
  USD: number;
  CZK: number;
  EUR: number;
}> {
  const supabase = await createClient();

  const { data: accounts } = await supabase
    .from('accounts')
    .select('balance, currency')
    .eq('user_id', userId)
    .eq('is_active', true);

  let totalUSD = 0;

  for (const account of accounts || []) {
    totalUSD += await toUSD(account.balance, account.currency as Currency);
  }

  const rates = await getLatestRates();

  return {
    USD: totalUSD,
    CZK: totalUSD * (rates?.CZK ?? 23),
    EUR: totalUSD * (rates?.EUR ?? 0.92),
  };
}
