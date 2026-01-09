/**
 * Generic CSV Parser
 *
 * Parses any CSV file with user-defined column mappings.
 * Includes auto-detection of common column names.
 */

import type { ParserResult, ParsedTransaction, ColumnMapping } from './types';

// Common column name patterns for auto-detection
const DATE_PATTERNS = ['date', 'time', 'datum', 'data', 'transaction_date', 'trans_date', 'posted'];
const AMOUNT_PATTERNS = ['amount', 'value', 'sum', 'kwota', 'total', 'credit', 'debit', 'suma'];
const DESCRIPTION_PATTERNS = ['description', 'desc', 'note', 'notes', 'memo', 'comment', 'opis', 'name', 'merchant', 'payee'];
const CURRENCY_PATTERNS = ['currency', 'curr', 'waluta', 'ccy'];
const TYPE_PATTERNS = ['type', 'transaction_type', 'trans_type', 'category', 'direction'];

/**
 * Auto-detect column mappings from CSV headers
 */
export function detectColumnMappings(headers: string[]): Partial<ColumnMapping> {
  const mapping: Partial<ColumnMapping> = {};
  const headersLower = headers.map(h => h.toLowerCase().trim());

  // Find date column
  for (const pattern of DATE_PATTERNS) {
    const idx = headersLower.findIndex(h => h.includes(pattern));
    if (idx !== -1) {
      mapping.date = headers[idx];
      break;
    }
  }

  // Find amount column
  for (const pattern of AMOUNT_PATTERNS) {
    const idx = headersLower.findIndex(h => h.includes(pattern));
    if (idx !== -1) {
      mapping.amount = headers[idx];
      break;
    }
  }

  // Find description column
  for (const pattern of DESCRIPTION_PATTERNS) {
    const idx = headersLower.findIndex(h => h.includes(pattern));
    if (idx !== -1) {
      mapping.description = headers[idx];
      break;
    }
  }

  // Find currency column
  for (const pattern of CURRENCY_PATTERNS) {
    const idx = headersLower.findIndex(h => h.includes(pattern));
    if (idx !== -1) {
      mapping.currency = headers[idx];
      break;
    }
  }

  // Find type column
  for (const pattern of TYPE_PATTERNS) {
    const idx = headersLower.findIndex(h => h.includes(pattern));
    if (idx !== -1) {
      mapping.type = headers[idx];
      break;
    }
  }

  return mapping;
}

/**
 * Parse a generic CSV with explicit column mapping
 */
export function parseGenericCSV(
  data: Record<string, string>[],
  mapping: ColumnMapping,
  options: {
    /** Default currency */
    defaultCurrency?: string;
    /** Default transaction type */
    defaultType?: 'income' | 'expense';
    /** Whether to infer type from amount sign */
    inferTypeFromSign?: boolean;
  } = {}
): ParserResult {
  const {
    defaultCurrency = 'USD',
    defaultType = 'expense',
    inferTypeFromSign = true,
  } = options;

  const transactions: ParsedTransaction[] = [];
  const errors: Array<{ row: number; message: string }> = [];
  let skippedRows = 0;

  const currencies = new Set<string>();
  let earliestDate: string | null = null;
  let latestDate: string | null = null;
  let totalIncome = 0;
  let totalExpenses = 0;

  // Validate required mappings
  if (!mapping.date || !mapping.amount) {
    return {
      success: false,
      transactions: [],
      errors: [{ row: 0, message: 'Date and Amount column mappings are required' }],
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
      // Parse date
      const dateStr = row[mapping.date] || '';
      const date = parseGenericDate(dateStr);

      if (!date) {
        errors.push({ row: rowNum, message: `Invalid date: "${dateStr}"` });
        continue;
      }

      // Track date range
      if (!earliestDate || date < earliestDate) earliestDate = date;
      if (!latestDate || date > latestDate) latestDate = date;

      // Parse amount
      const amountStr = row[mapping.amount] || '';
      const rawAmount = parseGenericAmount(amountStr);

      if (rawAmount === null) {
        errors.push({ row: rowNum, message: `Invalid amount: "${amountStr}"` });
        continue;
      }

      // Skip zero amounts
      if (rawAmount === 0) {
        skippedRows++;
        continue;
      }

      // Determine transaction type
      let type: 'income' | 'expense';

      if (mapping.type) {
        // Use type column if mapped
        const typeValue = (row[mapping.type] || '').toLowerCase().trim();
        if (isIncomeType(typeValue)) {
          type = 'income';
        } else if (isExpenseType(typeValue)) {
          type = 'expense';
        } else if (inferTypeFromSign) {
          type = rawAmount > 0 ? 'income' : 'expense';
        } else {
          type = defaultType;
        }
      } else if (inferTypeFromSign) {
        // Infer from amount sign
        type = rawAmount > 0 ? 'income' : 'expense';
      } else {
        type = defaultType;
      }

      // Get description
      const description = mapping.description
        ? row[mapping.description] || 'Imported transaction'
        : 'Imported transaction';

      // Get currency
      let currency = defaultCurrency;
      if (mapping.currency) {
        const currValue = row[mapping.currency]?.toUpperCase().trim();
        if (currValue && isValidCurrency(currValue)) {
          currency = currValue;
        }
      }
      currencies.add(currency);

      // Generate hash for duplicate detection
      const hash = generateHash(`${date}-${rawAmount}-${description}`);

      const transaction: ParsedTransaction = {
        date,
        amount: Math.abs(rawAmount),
        description,
        currency,
        type,
        hash,
        originalRow: row,
      };

      transactions.push(transaction);

      // Track totals
      if (type === 'income') {
        totalIncome += Math.abs(rawAmount);
      } else {
        totalExpenses += Math.abs(rawAmount);
      }
    } catch (error) {
      errors.push({
        row: rowNum,
        message: error instanceof Error ? error.message : 'Unknown parsing error',
      });
    }
  }

  return {
    success: errors.length === 0 || transactions.length > 0,
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
 * Parse various date formats
 */
function parseGenericDate(dateStr: string): string | null {
  if (!dateStr) return null;

  const trimmed = dateStr.trim();

  // ISO format: YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // US format: MM/DD/YYYY
  const usMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (usMatch) {
    const [, month, day, year] = usMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // European with dots: DD.MM.YYYY
  const euDotMatch = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (euDotMatch) {
    const [, day, month, year] = euDotMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // European with dashes: DD-MM-YYYY
  const euDashMatch = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{4})/);
  if (euDashMatch) {
    const [, day, month, year] = euDashMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Try JavaScript Date parsing
  const date = new Date(trimmed);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }

  return null;
}

/**
 * Parse various amount formats
 */
function parseGenericAmount(amountStr: string): number | null {
  if (!amountStr) return null;

  // Remove currency symbols and spaces
  let cleaned = amountStr.replace(/[^0-9.,\s-+]/g, '').trim();

  if (!cleaned) return null;

  // Remove spaces
  cleaned = cleaned.replace(/\s/g, '');

  // Handle format detection
  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');

  if (hasComma && hasDot) {
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
    // Check if comma is decimal
    const commaPos = cleaned.lastIndexOf(',');
    const afterComma = cleaned.substring(commaPos + 1).replace(/[^0-9]/g, '');

    if (afterComma.length <= 2) {
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
 * Check if type value indicates income
 */
function isIncomeType(typeValue: string): boolean {
  const incomeKeywords = [
    'income', 'credit', 'deposit', 'salary', 'payment received',
    'refund', 'dividend', 'interest', 'transfer in', 'příjem', 'wpłata',
  ];
  return incomeKeywords.some(kw => typeValue.includes(kw));
}

/**
 * Check if type value indicates expense
 */
function isExpenseType(typeValue: string): boolean {
  const expenseKeywords = [
    'expense', 'debit', 'withdrawal', 'purchase', 'payment',
    'fee', 'charge', 'transfer out', 'výdaj', 'wypłata',
  ];
  return expenseKeywords.some(kw => typeValue.includes(kw));
}

/**
 * Validate currency code
 */
function isValidCurrency(code: string): boolean {
  const validCurrencies = [
    'USD', 'EUR', 'GBP', 'CZK', 'PLN', 'CHF', 'JPY', 'CAD', 'AUD', 'SEK', 'NOK', 'DKK',
  ];
  return validCurrencies.includes(code);
}

/**
 * Generate hash for duplicate detection
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
