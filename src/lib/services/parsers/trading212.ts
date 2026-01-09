/**
 * Trading 212 CSV Parser
 *
 * Parses CSV exports from Trading 212 account history.
 *
 * Trading 212 CSV format (as of 2024):
 * - Action: Type of transaction (Deposit, Withdrawal, Dividend, etc.)
 * - Time: Date/time of transaction (ISO format or similar)
 * - ISIN: Security identifier (for trades)
 * - Ticker: Stock ticker symbol
 * - Name: Stock name
 * - No. of shares: Number of shares
 * - Price / share: Price per share
 * - Currency (Price / share): Currency of the price
 * - Exchange rate: Exchange rate used
 * - Result (GBP): Profit/loss in account currency
 * - Total (GBP): Total amount of transaction
 * - Withholding tax: Tax withheld
 * - Currency (Withholding tax): Currency of tax
 * - Notes: Additional notes
 * - ID: Transaction ID
 * - Currency conversion fee: Fee for currency conversion
 */

import type { ParserResult, ParsedTransaction } from './types';

// Known column names in Trading 212 exports
export const TRADING212_COLUMNS = {
  action: 'Action',
  time: 'Time',
  isin: 'ISIN',
  ticker: 'Ticker',
  name: 'Name',
  shares: 'No. of shares',
  pricePerShare: 'Price / share',
  priceCurrency: 'Currency (Price / share)',
  exchangeRate: 'Exchange rate',
  result: 'Result',
  total: 'Total',
  withholdingTax: 'Withholding tax',
  taxCurrency: 'Currency (Withholding tax)',
  notes: 'Notes',
  id: 'ID',
  conversionFee: 'Currency conversion fee',
} as const;

// Action types that represent money flow
const INCOME_ACTIONS = [
  'deposit',
  'dividend',
  'dividend (ordinary)',
  'dividend (return of capital)',
  'interest on cash',
];

const EXPENSE_ACTIONS = [
  'withdrawal',
  'withdrawal fee',
];

// Actions to skip (internal transfers, stock transactions that don't affect cash balance directly)
const SKIP_ACTIONS = [
  'market buy',
  'market sell',
  'limit buy',
  'limit sell',
  'stock split',
  'custody fee',
];

/**
 * Parse a Trading 212 CSV export
 */
export function parseTrading212CSV(
  data: Record<string, string>[],
  options: {
    /** Include stock buy/sell transactions (default: false - only cash movements) */
    includeStockTrades?: boolean;
    /** Account currency for filtering total columns */
    accountCurrency?: string;
  } = {}
): ParserResult {
  const { includeStockTrades = false, accountCurrency } = options;

  const transactions: ParsedTransaction[] = [];
  const errors: Array<{ row: number; message: string }> = [];
  let skippedRows = 0;

  const currencies = new Set<string>();
  let earliestDate: string | null = null;
  let latestDate: string | null = null;
  let totalIncome = 0;
  let totalExpenses = 0;

  // Detect the total column name (it includes the account currency like "Total (GBP)")
  const headers = Object.keys(data[0] || {});
  const totalColumn = headers.find(h => h.toLowerCase().startsWith('total')) || 'Total';
  const resultColumn = headers.find(h => h.toLowerCase().startsWith('result')) || 'Result';

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowNum = i + 1;

    try {
      const action = (row[TRADING212_COLUMNS.action] || row['Action'] || '').toLowerCase().trim();

      // Skip empty rows
      if (!action) {
        skippedRows++;
        continue;
      }

      // Determine if we should process this action
      const isIncome = INCOME_ACTIONS.some(a => action.includes(a));
      const isExpense = EXPENSE_ACTIONS.some(a => action.includes(a));
      const isSkip = SKIP_ACTIONS.some(a => action.includes(a));

      // If it's a stock trade and we're not including them, skip
      if (isSkip && !includeStockTrades) {
        skippedRows++;
        continue;
      }

      // For stock trades, use the result column; for deposits/withdrawals, use total
      let amountStr: string;
      if (action.includes('buy') || action.includes('sell')) {
        if (!includeStockTrades) {
          skippedRows++;
          continue;
        }
        amountStr = row[resultColumn] || row['Result'] || '0';
      } else {
        amountStr = row[totalColumn] || row['Total'] || row[resultColumn] || row['Result'] || '0';
      }

      // Parse amount
      const amount = parseTrading212Amount(amountStr);
      if (amount === null || amount === 0) {
        // Zero amount transactions can be skipped
        skippedRows++;
        continue;
      }

      // Parse date
      const timeStr = row[TRADING212_COLUMNS.time] || row['Time'] || '';
      const date = parseTrading212Date(timeStr);
      if (!date) {
        errors.push({ row: rowNum, message: `Invalid date: "${timeStr}"` });
        continue;
      }

      // Track date range
      if (!earliestDate || date < earliestDate) earliestDate = date;
      if (!latestDate || date > latestDate) latestDate = date;

      // Determine transaction type
      let type: 'income' | 'expense';
      if (isIncome) {
        type = 'income';
      } else if (isExpense) {
        type = 'expense';
      } else {
        // For stock trades, positive result = income, negative = expense
        type = amount > 0 ? 'income' : 'expense';
      }

      // Build description
      const ticker = row[TRADING212_COLUMNS.ticker] || row['Ticker'] || '';
      const name = row[TRADING212_COLUMNS.name] || row['Name'] || '';
      const notes = row[TRADING212_COLUMNS.notes] || row['Notes'] || '';
      const actionCapitalized = action.charAt(0).toUpperCase() + action.slice(1);

      let description = actionCapitalized;
      if (ticker) {
        description += ` - ${ticker}`;
        if (name) description += ` (${name})`;
      }
      if (notes) {
        description += ` - ${notes}`;
      }

      // Get currency from the total column header or default
      const currencyMatch = totalColumn.match(/\(([A-Z]{3})\)/);
      const currency = currencyMatch ? currencyMatch[1] : accountCurrency || 'GBP';
      currencies.add(currency);

      // Calculate hash for duplicate detection
      const id = row[TRADING212_COLUMNS.id] || row['ID'] || '';
      const hash = generateHash(id || `${date}-${action}-${amount}`);

      const transaction: ParsedTransaction = {
        date,
        amount: Math.abs(amount),
        description,
        currency,
        type,
        hash,
        originalRow: row,
      };

      transactions.push(transaction);

      // Track totals
      if (type === 'income') {
        totalIncome += Math.abs(amount);
      } else {
        totalExpenses += Math.abs(amount);
      }
    } catch (error) {
      errors.push({
        row: rowNum,
        message: error instanceof Error ? error.message : 'Unknown parsing error',
      });
    }
  }

  return {
    success: errors.length === 0,
    transactions,
    errors,
    summary: {
      totalRows: data.length,
      parsedRows: transactions.length,
      skippedRows,
      totalIncome,
      totalExpenses,
      netChange: totalIncome - totalExpenses,
      currencies: Array.from(currencies),
      dateRange: {
        earliest: earliestDate,
        latest: latestDate,
      },
    },
  };
}

/**
 * Parse Trading 212 date format
 * Handles: "2024-01-15 10:30:45" and ISO formats
 */
function parseTrading212Date(dateStr: string): string | null {
  if (!dateStr) return null;

  const trimmed = dateStr.trim();

  // Try ISO format first
  const isoMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) {
    return isoMatch[1];
  }

  // Try "DD/MM/YYYY HH:MM:SS" format
  const euMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (euMatch) {
    const [, day, month, year] = euMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Try parsing as Date object
  const date = new Date(trimmed);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }

  return null;
}

/**
 * Parse Trading 212 amount format
 * Handles: "1,234.56", "-123.45", etc.
 */
function parseTrading212Amount(amountStr: string): number | null {
  if (!amountStr) return null;

  // Remove currency symbols and whitespace
  let cleaned = amountStr.replace(/[^0-9.,-]/g, '').trim();

  // Handle empty after cleaning
  if (!cleaned) return null;

  // Trading 212 uses standard US format (1,234.56)
  cleaned = cleaned.replace(/,/g, '');

  const amount = parseFloat(cleaned);
  return isNaN(amount) ? null : amount;
}

/**
 * Generate a simple hash for duplicate detection
 */
function generateHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}
