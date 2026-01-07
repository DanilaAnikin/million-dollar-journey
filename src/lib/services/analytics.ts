// Analytics Service - Historical Net Worth Calculations
// Uses the "Reverse Walk" algorithm to reconstruct past net worth from current state

import type { Transaction } from '@/types/database';

// Re-export the NetWorthDataPoint type for convenience
export interface NetWorthDataPoint {
  month: string;
  netWorth: number;
  date?: string; // ISO date string for more precise filtering
}

// Time range options for filtering data
export type TimeRange = '1W' | '1M' | '1Y' | '10Y' | 'ALL';

// Period change calculation result
export interface PeriodChange {
  absolute: number;
  percentage: number;
}

/**
 * Calculates historical net worth using the "Reverse Walk" algorithm.
 *
 * The algorithm works backwards from the current net worth, reversing
 * transaction effects to reconstruct what the net worth was in previous months.
 *
 * Logic:
 * - INCOME transactions: Subtract from balance (we didn't have it before receiving it)
 * - EXPENSE transactions: Add back to balance (we still had that money before spending it)
 * - TRANSFER transactions: Neutral (money moved between accounts, net worth unchanged)
 * - ADJUSTMENT transactions: Reverse the adjustment effect
 * - INTEREST transactions: Subtract (we hadn't earned it yet)
 *
 * Ghost Money Bug Fix:
 * - Finds the earliest transaction date across all transactions
 * - Forces net worth to $0 for any period BEFORE the first transaction
 * - Ensures the reverse walk reaches exactly $0 at the origin point
 *
 * Note: This function assumes transactions have already been converted to the
 * display currency by the caller, or that the currentNetWorth and transaction
 * amounts are all in the same currency (e.g., USD).
 *
 * @param currentNetWorth - The current net worth value (already calculated)
 * @param transactions - Array of transactions to analyze
 * @param months - Number of months to calculate (default: 12)
 * @returns Array of NetWorthDataPoint objects in chronological order (oldest first)
 */
export function calculateHistoricalNetWorth(
  currentNetWorth: number,
  transactions: Transaction[],
  months: number = 12
): NetWorthDataPoint[] {
  // Generate array of the last N months (in reverse chronological order initially)
  const monthsArray = generateLastNMonths(months);

  // Find the earliest transaction date to fix ghost money bug
  const earliestTransactionDate = findEarliestTransactionDate(transactions);
  const earliestMonthKey = earliestTransactionDate
    ? `${earliestTransactionDate.getFullYear()}-${String(earliestTransactionDate.getMonth() + 1).padStart(2, '0')}`
    : null;

  // Create a map to store net worth for each month
  const netWorthByMonth = new Map<string, number>();

  // Start with current balance
  let runningBalance = currentNetWorth;

  // Group transactions by month for efficient lookup
  const transactionsByMonth = groupTransactionsByMonth(transactions);

  // Walk backwards through each month
  for (const monthData of monthsArray) {
    const { key, label } = monthData;

    // Get all transactions for this month
    const monthTransactions = transactionsByMonth.get(key) || [];

    // Reverse the effect of each transaction
    for (const transaction of monthTransactions) {
      runningBalance = reverseTransactionEffect(runningBalance, transaction);
    }

    // Store the net worth snapshot for this month
    // This represents the net worth at the END of the previous month
    // (i.e., before these transactions occurred)
    netWorthByMonth.set(label, runningBalance);
  }

  // The current month should show the current net worth
  const currentMonthLabel = monthsArray[0].label;
  netWorthByMonth.set(currentMonthLabel, currentNetWorth);

  // Convert to array format and reverse to chronological order (oldest first)
  const result: NetWorthDataPoint[] = monthsArray
    .map(({ key, label }) => {
      // Ghost Money Bug Fix: Force $0 for months before the earliest transaction
      let netWorth = netWorthByMonth.get(label) || 0;

      if (earliestMonthKey && key < earliestMonthKey) {
        netWorth = 0;
      }

      return {
        month: label,
        netWorth: Math.round(netWorth * 100) / 100,
        date: key, // Store the full date key for filtering
      };
    })
    .reverse();

  return result;
}

/**
 * Finds the earliest transaction date from an array of transactions.
 * Used to fix the "ghost money" bug by ensuring net worth is $0 before first activity.
 *
 * @param transactions - Array of transactions to analyze
 * @returns The earliest transaction date, or null if no transactions
 */
function findEarliestTransactionDate(transactions: Transaction[]): Date | null {
  if (transactions.length === 0) {
    return null;
  }

  let earliest: Date | null = null;

  for (const transaction of transactions) {
    const txDate = new Date(transaction.transaction_date);

    if (!earliest || txDate < earliest) {
      earliest = txDate;
    }
  }

  return earliest;
}

/**
 * Generates an array of the last N months with their keys and labels.
 * Returns in reverse chronological order (current month first).
 *
 * @param count - Number of months to generate
 * @returns Array of month data with key (YYYY-MM) and label (short month name)
 */
function generateLastNMonths(count: number): Array<{ key: string; label: string }> {
  const months: Array<{ key: string; label: string }> = [];
  const now = new Date();

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  for (let i = 0; i < count; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = monthNames[date.getMonth()];

    months.push({ key, label });
  }

  return months;
}

/**
 * Groups transactions by their month (YYYY-MM format).
 *
 * @param transactions - Array of transactions
 * @returns Map with month key -> array of transactions
 */
function groupTransactionsByMonth(
  transactions: Transaction[]
): Map<string, Transaction[]> {
  const grouped = new Map<string, Transaction[]>();

  for (const transaction of transactions) {
    // Parse the transaction date
    const date = new Date(transaction.transaction_date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    const existing = grouped.get(key) || [];
    existing.push(transaction);
    grouped.set(key, existing);
  }

  return grouped;
}

/**
 * Reverses the effect of a transaction on the balance.
 * This is the core of the "Reverse Walk" algorithm.
 *
 * The logic is inverted from normal transaction processing:
 * - INCOME: We subtract it (we didn't have this money before)
 * - EXPENSE: We add it back (we had this money before spending)
 * - TRANSFER: No effect on net worth (money just moved between accounts)
 * - ADJUSTMENT: Reverse the adjustment (subtract positive, add negative)
 * - INTEREST: We subtract it (we hadn't earned this interest yet)
 *
 * @param balance - Current running balance
 * @param transaction - Transaction to reverse
 * @returns New balance after reversing the transaction effect
 */
function reverseTransactionEffect(balance: number, transaction: Transaction): number {
  const amount = Math.abs(transaction.amount);

  switch (transaction.type) {
    case 'income':
      // We received this money, so before we didn't have it
      return balance - amount;

    case 'expense':
      // We spent this money, so before we still had it
      return balance + amount;

    case 'transfer':
      // Transfers don't affect net worth (money moves between accounts)
      // The net effect on total net worth is zero
      return balance;

    case 'adjustment':
      // Adjustments directly modify balance
      // If positive adjustment, we reverse by subtracting
      // If negative adjustment, we reverse by adding
      return balance - transaction.amount;

    case 'interest':
      // Interest earned - we reverse by subtracting
      return balance - amount;

    default:
      // Unknown transaction type - no change (defensive)
      return balance;
  }
}

/**
 * Filters transactions to only include those within a specified date range.
 * Useful for pre-filtering before calling calculateHistoricalNetWorth.
 *
 * @param transactions - Array of all transactions
 * @param startDate - Start of date range (inclusive)
 * @param endDate - End of date range (inclusive)
 * @returns Filtered array of transactions
 */
export function filterTransactionsByDateRange(
  transactions: Transaction[],
  startDate: Date,
  endDate: Date
): Transaction[] {
  return transactions.filter(transaction => {
    const txDate = new Date(transaction.transaction_date);
    return txDate >= startDate && txDate <= endDate;
  });
}

/**
 * Gets the date range for the last N months.
 * Useful for determining what date range to query transactions for.
 *
 * @param months - Number of months (default: 12)
 * @returns Object with startDate and endDate
 */
export function getDateRangeForLastNMonths(months: number = 12): {
  startDate: Date;
  endDate: Date;
} {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months + 1);
  startDate.setDate(1); // First day of the month
  startDate.setHours(0, 0, 0, 0);

  return { startDate, endDate };
}

/**
 * Filters historical net worth data based on the selected time range with adaptive granularity.
 *
 * Adaptive Granularity Rules:
 * - 1W, 1M: Daily data points (all points shown within range)
 * - 1Y: Weekly/Monthly points (sample every ~1 month for monthly data)
 * - 10Y, ALL > 5 years: Quarterly points (sample every ~3 months)
 * - ALL < 1 year: Weekly/Monthly points (all points shown)
 *
 * @param data - Array of net worth data points (in chronological order)
 * @param range - Time range to filter by ('1W', '1M', '1Y', '10Y', 'ALL')
 * @returns Filtered array of data points with adaptive sampling
 */
export function filterDataByRange(
  data: NetWorthDataPoint[],
  range: TimeRange
): NetWorthDataPoint[] {
  if (!data || data.length === 0) {
    return [];
  }

  if (range === 'ALL') {
    // For ALL, apply adaptive granularity based on total data span
    const totalMonths = data.length;

    if (totalMonths > 60) {
      // More than 5 years: show quarterly data points (every 3 months)
      return sampleDataPointsByInterval(data, 3);
    } else if (totalMonths > 12) {
      // 1-5 years: show monthly data points (every month)
      return data;
    } else {
      // Less than 1 year: show all data points
      return data;
    }
  }

  // Filter by time range and apply appropriate granularity
  const dataPointsConfig: Record<TimeRange, { count: number; samplingInterval: number }> = {
    '1W': { count: 1, samplingInterval: 1 }, // Show 1 data point (latest month)
    '1M': { count: 1, samplingInterval: 1 }, // Show 1 month
    '1Y': { count: 12, samplingInterval: 1 }, // Show 12 months, all points
    '10Y': { count: Math.min(120, data.length), samplingInterval: 3 }, // 10 years, quarterly
    'ALL': { count: data.length, samplingInterval: 1 },
  };

  const config = dataPointsConfig[range];
  const filtered = data.slice(-config.count);

  // Apply sampling if needed
  if (config.samplingInterval > 1) {
    return sampleDataPointsByInterval(filtered, config.samplingInterval);
  }

  return filtered;
}

/**
 * Samples data points at a regular interval (e.g., every N months).
 * Always includes the first and last data points to preserve range boundaries.
 *
 * @param data - Array of data points to sample
 * @param interval - Sampling interval (e.g., 3 for quarterly)
 * @returns Sampled array of data points
 */
function sampleDataPointsByInterval(
  data: NetWorthDataPoint[],
  interval: number
): NetWorthDataPoint[] {
  if (data.length <= 2 || interval <= 1) {
    return data;
  }

  const sampled: NetWorthDataPoint[] = [data[0]]; // Always include first

  for (let i = interval; i < data.length - 1; i += interval) {
    sampled.push(data[i]);
  }

  // Always include last point
  if (data.length > 1) {
    sampled.push(data[data.length - 1]);
  }

  return sampled;
}

/**
 * Calculates the change in net worth over a period.
 *
 * Formula: percentage = (EndValue - StartValue) / |StartValue| * 100
 * Handles division by zero gracefully:
 * - If StartValue is 0 and EndValue is positive: returns 100%
 * - If StartValue is 0 and EndValue is negative: returns -100%
 * - If both are 0: returns 0%
 *
 * @param data - Array of net worth data points (should be filtered to desired range)
 * @returns Object with absolute change and percentage change
 */
export function getPeriodChange(data: NetWorthDataPoint[]): PeriodChange {
  if (!data || data.length === 0) {
    return { absolute: 0, percentage: 0 };
  }

  // If only one data point, show its value as absolute change
  if (data.length === 1) {
    return {
      absolute: Math.round(data[0].netWorth * 100) / 100,
      percentage: 0,
    };
  }

  const startValue = data[0].netWorth;
  const endValue = data[data.length - 1].netWorth;
  const absolute = endValue - startValue;

  // Handle division by zero edge cases
  let percentage = 0;

  if (startValue !== 0) {
    // Normal case: calculate percentage based on start value
    percentage = (absolute / Math.abs(startValue)) * 100;
  } else if (endValue !== 0) {
    // Edge case: starting from zero
    // If we gained money from 0, it's 100% gain
    // If we lost money from 0 (went negative), it's -100% loss
    percentage = endValue > 0 ? 100 : -100;
  }
  // If both start and end are 0, percentage remains 0

  return {
    absolute: Math.round(absolute * 100) / 100,
    percentage: Math.round(percentage * 100) / 100,
  };
}
