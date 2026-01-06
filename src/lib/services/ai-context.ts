/**
 * AI Context Aggregator Service
 *
 * Builds a privacy-safe summary of user's financial data for AI analysis.
 *
 * Privacy Protection:
 * - NO transaction descriptions included
 * - NO merchant names included
 * - NO specific dates included
 * - NO account names included
 * - ONLY aggregated numbers and category names (user-defined or generic like "Food", "Transport")
 */

import { createClient } from '@/lib/supabase/server';
import { toUSD, getLiveRates, formatCurrencyCompact, type ExchangeRates } from './currency';
import { calculatePortfolioTotals } from './portfolioCalculator';
import type {
  Account,
  AccountCategory,
  Currency,
  Profile,
  RecurringTransaction,
  Transaction
} from '@/types/database';

// ================================================
// TYPES
// ================================================

interface NetWorthResult {
  totalUSD: number;
  assetsUSD: number;
  liabilitiesUSD: number;
}

interface BurnRateResult {
  monthlyExpensesUSD: number;
  monthlyIncomeUSD: number;
}

interface CategorySpending {
  category: string;
  amountUSD: number;
}

interface SavingsRateResult {
  incomeUSD: number;
  expensesUSD: number;
  savingsRate: number; // percentage
}

interface GoalProgress {
  currentUSD: number;
  targetUSD: number;
  progressPercentage: number;
}

// ================================================
// HELPER FUNCTIONS
// ================================================

/**
 * Calculate total net worth from accounts
 * Converts all balances to USD and separates assets from liabilities
 */
async function getNetWorth(
  userId: string,
  supabase: Awaited<ReturnType<typeof createClient>>,
  rates: ExchangeRates
): Promise<NetWorthResult | null> {
  try {
    // Fetch accounts and categories in parallel
    const [accountsResult, categoriesResult] = await Promise.all([
      supabase
        .from('accounts')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true),
      supabase
        .from('account_categories')
        .select('*')
        .eq('user_id', userId),
    ]);

    if (accountsResult.error) {
      console.error('getNetWorth: Error fetching accounts', accountsResult.error);
      return null;
    }

    const accounts = (accountsResult.data || []) as Account[];
    const categories = (categoriesResult.data || []) as AccountCategory[];

    if (accounts.length === 0) {
      return { totalUSD: 0, assetsUSD: 0, liabilitiesUSD: 0 };
    }

    // Use the centralized portfolio calculator
    const totals = calculatePortfolioTotals(accounts, categories, rates);

    return {
      totalUSD: totals.netWorthUSD,
      assetsUSD: totals.totalAssetsUSD,
      liabilitiesUSD: totals.totalLiabilitiesUSD,
    };
  } catch (error) {
    console.error('getNetWorth: Unexpected error', error);
    return null;
  }
}

/**
 * Calculate monthly burn rate from recurring transactions
 * Converts all amounts to monthly equivalent in USD
 */
async function getBurnRate(
  userId: string,
  supabase: Awaited<ReturnType<typeof createClient>>,
  rates: ExchangeRates
): Promise<BurnRateResult | null> {
  try {
    const { data, error } = await supabase
      .from('recurring_transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) {
      console.error('getBurnRate: Error fetching recurring transactions', error);
      return null;
    }

    const recurring = (data || []) as RecurringTransaction[];

    let monthlyExpensesUSD = 0;
    let monthlyIncomeUSD = 0;

    for (const item of recurring) {
      // Convert amount to USD
      const amountUSD = toUSD(item.amount, item.currency as Currency, rates);

      // Convert to monthly equivalent based on frequency
      let monthlyAmountUSD = amountUSD;
      switch (item.frequency) {
        case 'weekly':
          monthlyAmountUSD = amountUSD * 4.33; // 52 weeks / 12 months
          break;
        case 'yearly':
          monthlyAmountUSD = amountUSD / 12;
          break;
        case 'monthly':
        default:
          // Already monthly
          break;
      }

      if (item.type === 'expense') {
        monthlyExpensesUSD += monthlyAmountUSD;
      } else {
        monthlyIncomeUSD += monthlyAmountUSD;
      }
    }

    return {
      monthlyExpensesUSD,
      monthlyIncomeUSD,
    };
  } catch (error) {
    console.error('getBurnRate: Unexpected error', error);
    return null;
  }
}

/**
 * Get top spending categories from transactions in the last N days
 * Returns aggregated category totals, sorted by amount descending
 *
 * Note: Categories are user-defined or generic (e.g., "Food", "Transport")
 * and are considered safe for AI analysis.
 */
async function getTopCategories(
  userId: string,
  supabase: Awaited<ReturnType<typeof createClient>>,
  rates: ExchangeRates,
  days: number = 30
): Promise<CategorySpending[] | null> {
  try {
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('transactions')
      .select('type, amount, currency, category')
      .eq('user_id', userId)
      .eq('type', 'expense')
      .gte('transaction_date', startDateStr)
      .lte('transaction_date', endDateStr);

    if (error) {
      console.error('getTopCategories: Error fetching transactions', error);
      return null;
    }

    const transactions = data || [];

    if (transactions.length === 0) {
      return [];
    }

    // Group by category and sum amounts
    const categoryTotals = new Map<string, number>();

    for (const tx of transactions) {
      const categoryName = tx.category || 'Uncategorized';
      const amountUSD = Math.abs(toUSD(tx.amount, tx.currency as Currency, rates));

      const current = categoryTotals.get(categoryName) || 0;
      categoryTotals.set(categoryName, current + amountUSD);
    }

    // Convert to array and sort by amount descending
    const sortedCategories: CategorySpending[] = Array.from(categoryTotals.entries())
      .map(([category, amountUSD]) => ({ category, amountUSD }))
      .sort((a, b) => b.amountUSD - a.amountUSD);

    return sortedCategories;
  } catch (error) {
    console.error('getTopCategories: Unexpected error', error);
    return null;
  }
}

/**
 * Calculate savings rate from income and expenses in the last N days
 * Savings Rate = (Income - Expenses) / Income * 100
 */
async function getSavingsRate(
  userId: string,
  supabase: Awaited<ReturnType<typeof createClient>>,
  rates: ExchangeRates,
  days: number = 30
): Promise<SavingsRateResult | null> {
  try {
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('transactions')
      .select('type, amount, currency')
      .eq('user_id', userId)
      .in('type', ['income', 'expense'])
      .gte('transaction_date', startDateStr)
      .lte('transaction_date', endDateStr);

    if (error) {
      console.error('getSavingsRate: Error fetching transactions', error);
      return null;
    }

    const transactions = (data || []) as Pick<Transaction, 'type' | 'amount' | 'currency'>[];

    let incomeUSD = 0;
    let expensesUSD = 0;

    for (const tx of transactions) {
      const amountUSD = Math.abs(toUSD(tx.amount, tx.currency as Currency, rates));

      if (tx.type === 'income') {
        incomeUSD += amountUSD;
      } else if (tx.type === 'expense') {
        expensesUSD += amountUSD;
      }
    }

    // Calculate savings rate (avoid division by zero)
    const savingsRate = incomeUSD > 0
      ? ((incomeUSD - expensesUSD) / incomeUSD) * 100
      : 0;

    return {
      incomeUSD,
      expensesUSD,
      savingsRate,
    };
  } catch (error) {
    console.error('getSavingsRate: Unexpected error', error);
    return null;
  }
}

/**
 * Get goal progress from user profile
 */
async function getGoalProgress(
  userId: string,
  supabase: Awaited<ReturnType<typeof createClient>>,
  currentNetWorthUSD: number
): Promise<GoalProgress | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('target_amount_usd')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('getGoalProgress: Error fetching profile', error);
      return null;
    }

    const profile = data as Profile | null;

    if (!profile || !profile.target_amount_usd || profile.target_amount_usd <= 0) {
      return null;
    }

    const progressPercentage = (currentNetWorthUSD / profile.target_amount_usd) * 100;

    return {
      currentUSD: currentNetWorthUSD,
      targetUSD: profile.target_amount_usd,
      progressPercentage,
    };
  } catch (error) {
    console.error('getGoalProgress: Unexpected error', error);
    return null;
  }
}

// ================================================
// FORMATTING HELPERS
// ================================================

/**
 * Format a USD amount for display (e.g., "$45,230")
 */
function formatUSD(amount: number): string {
  return formatCurrencyCompact(Math.round(amount), 'USD');
}

/**
 * Format a percentage for display (e.g., "27%")
 * Rounds to one decimal place for precision
 */
function formatPercentage(value: number): string {
  // Handle edge cases
  if (!isFinite(value)) return 'N/A';
  return `${Math.round(value * 10) / 10}%`;
}

// ================================================
// MAIN FUNCTION
// ================================================

/**
 * Build a privacy-safe financial context summary for AI analysis.
 *
 * Returns a text summary containing:
 * - Total Net Worth
 * - Monthly Fixed Costs (Burn Rate)
 * - Top Spending Categories (Last 30 Days)
 * - Monthly Income & Expenses
 * - Savings Rate
 * - Goal Progress (if available)
 *
 * Privacy Protection:
 * - NO transaction descriptions
 * - NO merchant names
 * - NO specific dates
 * - NO account names
 * - ONLY aggregated numbers and category names
 *
 * @param userId - The user's ID
 * @returns A formatted text summary of the user's financial data
 */
export async function getFinancialContext(userId: string): Promise<string> {
  const supabase = await createClient();

  // Get live exchange rates for currency conversion
  const rates = await getLiveRates();

  // Collect all metrics in parallel for performance
  const [netWorth, burnRate, topCategories, savingsRate] = await Promise.all([
    getNetWorth(userId, supabase, rates),
    getBurnRate(userId, supabase, rates),
    getTopCategories(userId, supabase, rates, 30),
    getSavingsRate(userId, supabase, rates, 30),
  ]);

  // Build the summary lines
  const summaryLines: string[] = ['Financial Summary:'];

  // 1. Net Worth
  if (netWorth !== null) {
    summaryLines.push(`- Total Net Worth: ${formatUSD(netWorth.totalUSD)}`);

    // Show assets vs liabilities breakdown if there are liabilities
    if (netWorth.liabilitiesUSD > 0) {
      summaryLines.push(`  (Assets: ${formatUSD(netWorth.assetsUSD)}, Liabilities: ${formatUSD(netWorth.liabilitiesUSD)})`);
    }
  } else {
    summaryLines.push('- Total Net Worth: Unable to calculate');
  }

  // 2. Burn Rate (Monthly Fixed Costs from recurring transactions)
  if (burnRate !== null) {
    summaryLines.push(`- Monthly Fixed Costs (Burn Rate): ${formatUSD(burnRate.monthlyExpensesUSD)}`);

    // Also show recurring income if available
    if (burnRate.monthlyIncomeUSD > 0) {
      summaryLines.push(`- Monthly Recurring Income: ${formatUSD(burnRate.monthlyIncomeUSD)}`);
    }
  } else {
    summaryLines.push('- Monthly Fixed Costs: No recurring transactions found');
  }

  // 3. Top Spending Categories (Last 30 Days)
  if (topCategories !== null && topCategories.length > 0) {
    const top3 = topCategories.slice(0, 3);
    const formattedCategories = top3
      .map((cat, idx) => `${idx + 1}. ${cat.category} (${formatUSD(cat.amountUSD)})`)
      .join(', ');
    summaryLines.push(`- Top Spending (Last 30 Days): ${formattedCategories}`);
  } else if (topCategories !== null && topCategories.length === 0) {
    summaryLines.push('- Top Spending (Last 30 Days): No expenses recorded');
  } else {
    summaryLines.push('- Top Spending: Unable to calculate');
  }

  // 4. Income, Expenses, and Savings Rate
  if (savingsRate !== null) {
    summaryLines.push(`- Monthly Income: ${formatUSD(savingsRate.incomeUSD)}`);
    summaryLines.push(`- Monthly Expenses: ${formatUSD(savingsRate.expensesUSD)}`);
    summaryLines.push(`- Savings Rate: ${formatPercentage(savingsRate.savingsRate)}`);
  } else {
    summaryLines.push('- Savings Rate: Unable to calculate');
  }

  // 5. Goal Progress (only if we have net worth data)
  if (netWorth !== null) {
    const goalProgress = await getGoalProgress(userId, supabase, netWorth.totalUSD);

    if (goalProgress !== null) {
      summaryLines.push(
        `- Goal: ${formatPercentage(goalProgress.progressPercentage)} progress toward ${formatUSD(goalProgress.targetUSD)} target`
      );
    }
  }

  return summaryLines.join('\n');
}

// ================================================
// EXPORTED HELPER FUNCTIONS (for testing/reuse)
// ================================================

export {
  getNetWorth,
  getBurnRate,
  getTopCategories,
  getSavingsRate,
  getGoalProgress,
};

export type {
  NetWorthResult,
  BurnRateResult,
  CategorySpending,
  SavingsRateResult,
  GoalProgress,
};
