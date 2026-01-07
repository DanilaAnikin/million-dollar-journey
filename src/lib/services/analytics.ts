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
 * Calculates daily net worth history using reverse walk from current value.
 *
 * @param currentNetWorth - Current net worth value
 * @param transactions - All transactions
 * @param daysBack - Number of days to calculate
 * @returns Array of daily NetWorthDataPoint objects
 */
export function calculateDailyNetWorth(
  currentNetWorth: number,
  transactions: Transaction[],
  daysBack: number
): NetWorthDataPoint[] {
  // Generate array of the last N days (in reverse chronological order initially)
  const daysArray = generateLastNDays(daysBack);

  // Find the earliest transaction date to fix ghost money bug
  const earliestTransactionDate = findEarliestTransactionDate(transactions);
  const earliestDateKey = earliestTransactionDate
    ? formatDateKey(earliestTransactionDate)
    : null;

  // Create a map to store net worth for each day
  const netWorthByDay = new Map<string, number>();

  // Start with current balance
  let runningBalance = currentNetWorth;

  // Group transactions by day for efficient lookup
  const transactionsByDay = groupTransactionsByDay(transactions);

  // Walk backwards through each day
  for (const dayData of daysArray) {
    const { key, label } = dayData;

    // Get all transactions for this day
    const dayTransactions = transactionsByDay.get(key) || [];

    // Reverse the effect of each transaction
    for (const transaction of dayTransactions) {
      runningBalance = reverseTransactionEffect(runningBalance, transaction);
    }

    // Store the net worth snapshot for this day
    netWorthByDay.set(label, runningBalance);
  }

  // The current day should show the current net worth
  const currentDayLabel = daysArray[0].label;
  netWorthByDay.set(currentDayLabel, currentNetWorth);

  // Convert to array format and reverse to chronological order (oldest first)
  const result: NetWorthDataPoint[] = daysArray
    .map(({ key, label, displayLabel }) => {
      // Ghost Money Bug Fix: Force $0 for days before the earliest transaction
      let netWorth = netWorthByDay.get(label) || 0;

      if (earliestDateKey && key < earliestDateKey) {
        netWorth = 0;
      }

      return {
        month: displayLabel, // e.g., "Jan 15", "Jan 16"
        netWorth: Math.round(netWorth * 100) / 100,
        date: key, // Store the full date key (YYYY-MM-DD) for filtering
      };
    })
    .reverse();

  return result;
}

/**
 * Generates an array of the last N days with their keys and labels.
 * Returns in reverse chronological order (current day first).
 *
 * @param count - Number of days to generate
 * @returns Array of day data with key (YYYY-MM-DD), label (internal key), and displayLabel (formatted)
 */
function generateLastNDays(count: number): Array<{ key: string; label: string; displayLabel: string }> {
  const days: Array<{ key: string; label: string; displayLabel: string }> = [];
  const now = new Date();

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  for (let i = 0; i < count; i++) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const key = formatDateKey(date);
    const label = key; // Use the key as the label for consistency
    const displayLabel = `${monthNames[date.getMonth()]} ${date.getDate()}`;

    days.push({ key, label, displayLabel });
  }

  return days;
}

/**
 * Formats a date as YYYY-MM-DD.
 */
function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * Groups transactions by their day (YYYY-MM-DD format).
 *
 * @param transactions - Array of transactions
 * @returns Map with day key -> array of transactions
 */
function groupTransactionsByDay(
  transactions: Transaction[]
): Map<string, Transaction[]> {
  const grouped = new Map<string, Transaction[]>();

  for (const transaction of transactions) {
    // Parse the transaction date
    const date = new Date(transaction.transaction_date);
    const key = formatDateKey(date);

    const existing = grouped.get(key) || [];
    existing.push(transaction);
    grouped.set(key, existing);
  }

  return grouped;
}

/**
 * Aggregates monthly data into yearly data points (uses December value for each year)
 */
function aggregateToYearly(monthlyData: NetWorthDataPoint[]): NetWorthDataPoint[] {
  if (!monthlyData || monthlyData.length === 0) {
    return [];
  }

  // Group data by year
  const yearlyMap = new Map<number, NetWorthDataPoint>();

  for (const dataPoint of monthlyData) {
    // Extract year from the date field (YYYY-MM format)
    const year = dataPoint.date ? parseInt(dataPoint.date.split('-')[0]) : new Date().getFullYear();

    // Keep the latest data point for each year (December or the last available month)
    const existing = yearlyMap.get(year);
    if (!existing || (dataPoint.date && (!existing.date || dataPoint.date > existing.date))) {
      yearlyMap.set(year, {
        month: year.toString(), // Display label is just the year
        netWorth: dataPoint.netWorth,
        date: `${year}-12`, // Store as year-month for consistency
      });
    }
  }

  // Convert to array and sort by year
  return Array.from(yearlyMap.values()).sort((a, b) => {
    const yearA = parseInt(a.month);
    const yearB = parseInt(b.month);
    return yearA - yearB;
  });
}

/**
 * Calculates the number of days between two dates.
 */
function calculateDaysDifference(date1: Date, date2: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const diff = Math.abs(date2.getTime() - date1.getTime());
  return Math.floor(diff / msPerDay);
}

/**
 * Finds the earliest date from the data array.
 */
function findEarliestDate(data: NetWorthDataPoint[]): Date {
  if (!data || data.length === 0) {
    return new Date();
  }

  const firstPoint = data[0];
  if (firstPoint.date) {
    return new Date(firstPoint.date);
  }

  return new Date();
}

/**
 * Filters historical net worth data based on the selected time range with adaptive granularity.
 *
 * Adaptive Granularity Rules:
 * - 1W: Daily data points for last 7 days
 * - 1M: Daily data points for last 30 days
 * - 1Y: Monthly data points for last 12 months
 * - 10Y: Yearly data points for last 10 years
 * - ALL: Adaptive based on duration (daily < 1 year, monthly 1-3 years, yearly > 3 years)
 *
 * @param data - Array of net worth data points (in chronological order)
 * @param range - Time range to filter by ('1W', '1M', '1Y', '10Y', 'ALL')
 * @param currentNetWorth - Current net worth value (needed for daily calculations)
 * @param transactions - All transactions (needed for daily calculations)
 * @returns Filtered array of data points with adaptive sampling
 */
export function filterDataByRange(
  data: NetWorthDataPoint[],
  range: TimeRange,
  currentNetWorth?: number,
  transactions?: Transaction[]
): NetWorthDataPoint[] {
  if (!data || data.length === 0) {
    return [];
  }

  // For 1W: Need daily data for last 7 days
  if (range === '1W') {
    if (currentNetWorth !== undefined && transactions) {
      return calculateDailyNetWorth(currentNetWorth, transactions, 7);
    }
    return data.slice(-1); // fallback
  }

  // For 1M: Need daily data for last 30 days
  if (range === '1M') {
    if (currentNetWorth !== undefined && transactions) {
      return calculateDailyNetWorth(currentNetWorth, transactions, 30);
    }
    return data.slice(-1);
  }

  // For 1Y: Monthly data (existing)
  if (range === '1Y') {
    return data.slice(-12);
  }

  // For 10Y: Yearly data
  if (range === '10Y') {
    const filtered = data.slice(-120); // Last 10 years of monthly data
    return aggregateToYearly(filtered);
  }

  // For ALL: Adaptive
  if (range === 'ALL') {
    const firstDate = findEarliestDate(data);
    const now = new Date();
    const daysDiff = calculateDaysDifference(firstDate, now);

    if (daysDiff < 365) {
      // Less than 1 year: Daily
      if (currentNetWorth !== undefined && transactions) {
        // Ensure we show at least 7 days for meaningful chart
        const daysToShow = Math.max(daysDiff, 7);
        return calculateDailyNetWorth(currentNetWorth, transactions, daysToShow);
      }
      return data; // fallback to monthly
    } else if (daysDiff < 365 * 3) {
      // 1-3 years: Monthly
      return data;
    } else {
      // More than 3 years: Yearly
      return aggregateToYearly(data);
    }
  }

  return data;
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
