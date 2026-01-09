/**
 * XTB CSV Parser
 *
 * Parses CSV exports from XTB xStation (Cash Operations).
 *
 * XTB CSV format varies by export type. Common formats:
 *
 * Cash Operations:
 * - Type: Operation type
 * - Time: Date/time of transaction
 * - Comment: Description
 * - Amount: Transaction amount
 * - Currency: Transaction currency (may also be in the Amount column header)
 *
 * Account Statement:
 * - Date: Transaction date
 * - Operation: Type of operation
 * - Amount: Amount
 * - Balance: Running balance
 */

import type { ParserResult, ParsedTransaction } from './types';

// Known column names in XTB exports (varies by language/version)
export const XTB_COLUMNS = {
  // Cash Operations format
  type: ['Type', 'Typ', 'Operation'],
  time: ['Time', 'Date', 'Data', 'Datum'],
  comment: ['Comment', 'Komentarz', 'Note', 'Description', 'Opis'],
  amount: ['Amount', 'Kwota', 'Value', 'Suma'],
  // Account Statement format
  balance: ['Balance', 'Saldo', 'Stan'],
  symbol: ['Symbol', 'Instrument'],
} as const;

// Operation types that represent income (deposits, profits)
const INCOME_TYPES = [
  'deposit',
  'wpłata',
  'profit',
  'zysk',
  'dividend',
  'dywidenda',
  'interest',
  'odsetki',
  'bonus',
  'credit',
  'refund',
];

// Operation types that represent expenses (withdrawals, fees)
const EXPENSE_TYPES = [
  'withdrawal',
  'wypłata',
  'commission',
  'prowizja',
  'fee',
  'opłata',
  'swap',
  'loss',
  'strata',
  'tax',
  'podatek',
];

/**
 * Parse an XTB CSV export
 */
export function parseXTBCSV(
  data: Record<string, string>[],
  options: {
    /** Default currency if not detected */
    defaultCurrency?: string;
    /** Include trading P/L (default: false - only cash operations) */
    includeTrades?: boolean;
  } = {}
): ParserResult {
  const { defaultCurrency = 'EUR', includeTrades = false } = options;

  const transactions: ParsedTransaction[] = [];
  const errors: Array<{ row: number; message: string }> = [];
  let skippedRows = 0;

  const currencies = new Set<string>();
  let earliestDate: string | null = null;
  let latestDate: string | null = null;
  let totalIncome = 0;
  let totalExpenses = 0;

  // Auto-detect column names from first row
  const headers = Object.keys(data[0] || {});
  const columnMap = detectXTBColumns(headers);

  if (!columnMap.time || !columnMap.amount) {
    return {
      success: false,
      transactions: [],
      errors: [{ row: 0, message: 'Could not detect required columns (date and amount)' }],
      summary: {
        totalRows: data.length,
        parsedRows: 0,
        skippedRows: data.length,
        totalIncome: 0,
        totalExpenses: 0,
        netChange: 0,
        currencies: [],
        dateRange: { earliest: null, latest: null },
      },
    };
  }

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowNum = i + 1;

    try {
      // Get operation type
      const operationType = columnMap.type
        ? (row[columnMap.type] || '').toLowerCase().trim()
        : '';

      // Skip certain operations if not including trades
      if (!includeTrades && isTradeOperation(operationType)) {
        skippedRows++;
        continue;
      }

      // Parse amount
      const amountStr = row[columnMap.amount] || '';
      const amount = parseXTBAmount(amountStr);

      if (amount === null) {
        errors.push({ row: rowNum, message: `Invalid amount: "${amountStr}"` });
        continue;
      }

      // Skip zero amounts
      if (amount === 0) {
        skippedRows++;
        continue;
      }

      // Parse date
      const dateStr = row[columnMap.time] || '';
      const date = parseXTBDate(dateStr);

      if (!date) {
        errors.push({ row: rowNum, message: `Invalid date: "${dateStr}"` });
        continue;
      }

      // Track date range
      if (!earliestDate || date < earliestDate) earliestDate = date;
      if (!latestDate || date > latestDate) latestDate = date;

      // Determine transaction type
      const type = determineXTBTransactionType(operationType, amount);

      // Get description
      const comment = columnMap.comment ? (row[columnMap.comment] || '') : '';
      const symbol = columnMap.symbol ? (row[columnMap.symbol] || '') : '';
      let description = operationType
        ? operationType.charAt(0).toUpperCase() + operationType.slice(1)
        : 'XTB Transaction';

      if (symbol) description += ` - ${symbol}`;
      if (comment && comment !== operationType) description += ` - ${comment}`;

      // Detect currency from amount column header or use default
      const currency = detectCurrencyFromHeader(columnMap.amount, headers) || defaultCurrency;
      currencies.add(currency);

      // Generate hash for duplicate detection
      const hash = generateHash(`${date}-${operationType}-${amount}-${comment}`);

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
 * Auto-detect XTB column names from headers
 */
function detectXTBColumns(headers: string[]): {
  type?: string;
  time?: string;
  amount?: string;
  comment?: string;
  symbol?: string;
  balance?: string;
} {
  const result: {
    type?: string;
    time?: string;
    amount?: string;
    comment?: string;
    symbol?: string;
    balance?: string;
  } = {};

  const headerLower = headers.map(h => h.toLowerCase());

  // Find type column
  for (const possibleName of XTB_COLUMNS.type) {
    const idx = headerLower.findIndex(h => h.includes(possibleName.toLowerCase()));
    if (idx !== -1) {
      result.type = headers[idx];
      break;
    }
  }

  // Find time/date column
  for (const possibleName of XTB_COLUMNS.time) {
    const idx = headerLower.findIndex(h => h.includes(possibleName.toLowerCase()));
    if (idx !== -1) {
      result.time = headers[idx];
      break;
    }
  }

  // Find amount column
  for (const possibleName of XTB_COLUMNS.amount) {
    const idx = headerLower.findIndex(h => h.includes(possibleName.toLowerCase()));
    if (idx !== -1) {
      result.amount = headers[idx];
      break;
    }
  }

  // Find comment/description column
  for (const possibleName of XTB_COLUMNS.comment) {
    const idx = headerLower.findIndex(h => h.includes(possibleName.toLowerCase()));
    if (idx !== -1) {
      result.comment = headers[idx];
      break;
    }
  }

  // Find symbol column
  for (const possibleName of XTB_COLUMNS.symbol) {
    const idx = headerLower.findIndex(h => h.includes(possibleName.toLowerCase()));
    if (idx !== -1) {
      result.symbol = headers[idx];
      break;
    }
  }

  // Find balance column
  for (const possibleName of XTB_COLUMNS.balance) {
    const idx = headerLower.findIndex(h => h.includes(possibleName.toLowerCase()));
    if (idx !== -1) {
      result.balance = headers[idx];
      break;
    }
  }

  return result;
}

/**
 * Check if operation is a trade (not a cash operation)
 */
function isTradeOperation(operationType: string): boolean {
  const tradeKeywords = ['buy', 'sell', 'open', 'close', 'position', 'order'];
  return tradeKeywords.some(kw => operationType.toLowerCase().includes(kw));
}

/**
 * Determine transaction type from operation and amount
 */
function determineXTBTransactionType(
  operationType: string,
  amount: number
): 'income' | 'expense' {
  const opLower = operationType.toLowerCase();

  // Check explicit income types
  if (INCOME_TYPES.some(t => opLower.includes(t))) {
    return 'income';
  }

  // Check explicit expense types
  if (EXPENSE_TYPES.some(t => opLower.includes(t))) {
    return 'expense';
  }

  // Fall back to amount sign
  return amount > 0 ? 'income' : 'expense';
}

/**
 * Parse XTB date formats
 * Handles: "2024-01-15 10:30:45", "15.01.2024", "2024.01.15"
 */
function parseXTBDate(dateStr: string): string | null {
  if (!dateStr) return null;

  const trimmed = dateStr.trim();

  // ISO format: 2024-01-15 or 2024-01-15 10:30:45
  const isoMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) {
    return isoMatch[1];
  }

  // European with dots: DD.MM.YYYY
  const euDotMatch = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (euDotMatch) {
    const [, day, month, year] = euDotMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // YYYY.MM.DD format
  const ymdDotMatch = trimmed.match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})/);
  if (ymdDotMatch) {
    const [, year, month, day] = ymdDotMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // European with slashes: DD/MM/YYYY
  const euSlashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (euSlashMatch) {
    const [, day, month, year] = euSlashMatch;
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
 * Parse XTB amount format
 * Handles European format (1 234,56) and US format (1,234.56)
 */
function parseXTBAmount(amountStr: string): number | null {
  if (!amountStr) return null;

  // Remove currency symbols and whitespace
  let cleaned = amountStr.replace(/[^0-9.,\s-]/g, '').trim();

  // Handle empty after cleaning
  if (!cleaned) return null;

  // Remove spaces (European thousands separator)
  cleaned = cleaned.replace(/\s/g, '');

  // Detect format and convert
  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');

  if (hasComma && hasDot) {
    // Determine based on position
    const lastCommaPos = cleaned.lastIndexOf(',');
    const lastDotPos = cleaned.lastIndexOf('.');

    if (lastCommaPos > lastDotPos) {
      // European: 1.234,56
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // US: 1,234.56
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (hasComma && !hasDot) {
    // Check if comma is decimal separator
    const commaPos = cleaned.lastIndexOf(',');
    const afterComma = cleaned.substring(commaPos + 1);

    if (afterComma.length <= 2 && /^\d+$/.test(afterComma)) {
      // European decimal: 123,45
      cleaned = cleaned.replace(',', '.');
    } else {
      // Thousands separator
      cleaned = cleaned.replace(/,/g, '');
    }
  }

  const amount = parseFloat(cleaned);
  return isNaN(amount) ? null : amount;
}

/**
 * Try to detect currency from column header
 * Headers like "Amount (EUR)" or "Kwota EUR"
 */
function detectCurrencyFromHeader(
  amountColumn: string,
  headers: string[]
): string | null {
  // Try to find currency in amount column header
  const currencyMatch = amountColumn.match(/([A-Z]{3})/);
  if (currencyMatch) {
    return currencyMatch[1];
  }

  // Look for a currency column
  const currencyCol = headers.find(h =>
    h.toLowerCase().includes('currency') ||
    h.toLowerCase().includes('waluta')
  );
  if (currencyCol) {
    const match = currencyCol.match(/([A-Z]{3})/);
    if (match) return match[1];
  }

  return null;
}

/**
 * Generate a simple hash for duplicate detection
 */
function generateHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}
