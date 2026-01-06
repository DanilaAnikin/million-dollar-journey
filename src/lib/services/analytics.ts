// Analytics Service - Historical Net Worth Calculations
// Uses the "Reverse Walk" algorithm to reconstruct past net worth from current state

import type { Transaction } from '@/types/database';

// Re-export the NetWorthDataPoint type for convenience
export interface NetWorthDataPoint {
  month: string;
  netWorth: number;
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
    .map(({ label }) => ({
      month: label,
      netWorth: Math.round((netWorthByMonth.get(label) || 0) * 100) / 100,
    }))
    .reverse();

  return result;
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
