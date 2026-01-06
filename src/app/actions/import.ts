'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Currency } from '@/types/database';

// ============================================================================
// Types
// ============================================================================

/**
 * Represents a single row of import data from a CSV file
 */
export interface ImportRow {
  date: string;
  amount: string | number;
  description?: string;
  currency?: string;
  type?: 'income' | 'expense';
}

/**
 * Result of an import operation
 */
export interface ImportResult {
  success: boolean;
  imported: number;
  errors: Array<{ row: number; message: string }>;
}

/**
 * Result of a validation operation
 */
export interface ValidationResult {
  valid: boolean;
  errors: Array<{ row: number; message: string }>;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get authenticated user ID with fallback to session
 */
async function getAuthenticatedUserId(): Promise<string | null> {
  const supabase = await createClient();

  // Try getUser first (recommended, verifies with DB)
  let userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) {
    // Fallback to getSession (JWT only, no DB verification)
    const { data: { session } } = await supabase.auth.getSession();
    userId = session?.user?.id;
  }

  return userId || null;
}

/**
 * Parse a date string in various formats and return an ISO date string (YYYY-MM-DD)
 * Handles common formats: YYYY-MM-DD, MM/DD/YYYY, DD.MM.YYYY, DD/MM/YYYY
 */
function parseDate(dateStr: string): string | null {
  if (!dateStr || typeof dateStr !== 'string') {
    return null;
  }

  const trimmed = dateStr.trim();

  // Try ISO format first: YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (isValidDate(date)) {
      return formatDateISO(date);
    }
  }

  // Try US format: MM/DD/YYYY or M/D/YYYY
  const usMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) {
    const [, month, day, year] = usMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (isValidDate(date)) {
      return formatDateISO(date);
    }
  }

  // Try European format with dots: DD.MM.YYYY
  const euDotMatch = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (euDotMatch) {
    const [, day, month, year] = euDotMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (isValidDate(date)) {
      return formatDateISO(date);
    }
  }

  // Try European format with slashes: DD/MM/YYYY (if day > 12, we can assume this format)
  const euSlashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (euSlashMatch) {
    const [, first, second, year] = euSlashMatch;
    const firstNum = parseInt(first);
    const secondNum = parseInt(second);

    // If first number > 12, it must be a day (DD/MM/YYYY format)
    if (firstNum > 12) {
      const date = new Date(parseInt(year), secondNum - 1, firstNum);
      if (isValidDate(date)) {
        return formatDateISO(date);
      }
    }
  }

  // Try parsing as a date string (fallback)
  const fallbackDate = new Date(trimmed);
  if (isValidDate(fallbackDate)) {
    return formatDateISO(fallbackDate);
  }

  return null;
}

/**
 * Check if a Date object is valid
 */
function isValidDate(date: Date): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Format a Date object as ISO date string (YYYY-MM-DD)
 */
function formatDateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse an amount string or number and return a proper number
 * Handles comma vs dot decimal separators
 */
function parseAmount(amountInput: string | number, type: 'income' | 'expense'): number | null {
  let numValue: number;

  if (typeof amountInput === 'number') {
    numValue = amountInput;
  } else if (typeof amountInput === 'string') {
    let cleaned = amountInput.trim();

    // Remove currency symbols and whitespace
    cleaned = cleaned.replace(/[$\u20AC\u00A3\u00A5\u20A3\u20BD]/g, '').trim();

    // Handle European format: 1.234,56 -> 1234.56
    // If there's both comma and dot, determine which is the decimal separator
    const hasComma = cleaned.includes(',');
    const hasDot = cleaned.includes('.');

    if (hasComma && hasDot) {
      // Determine format based on position (last separator is decimal)
      const lastCommaPos = cleaned.lastIndexOf(',');
      const lastDotPos = cleaned.lastIndexOf('.');

      if (lastCommaPos > lastDotPos) {
        // European format: 1.234,56
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
      } else {
        // US format: 1,234.56
        cleaned = cleaned.replace(/,/g, '');
      }
    } else if (hasComma && !hasDot) {
      // Could be European decimal or US thousands separator
      // Check if comma position suggests decimal (e.g., ,XX at end)
      const commaPos = cleaned.lastIndexOf(',');
      const afterComma = cleaned.substring(commaPos + 1);

      if (afterComma.length <= 2 && /^\d+$/.test(afterComma)) {
        // Likely European decimal: 123,45
        cleaned = cleaned.replace(',', '.');
      } else {
        // Likely US thousands: 1,234
        cleaned = cleaned.replace(/,/g, '');
      }
    }
    // If only dot, it's either US decimal or thousands - parseFloat handles it

    numValue = parseFloat(cleaned);
  } else {
    return null;
  }

  if (isNaN(numValue)) {
    return null;
  }

  // Apply sign based on type
  // If type is 'expense' and amount is positive, make it negative
  // If type is 'income' and amount is negative, make it positive
  if (type === 'expense') {
    return -Math.abs(numValue);
  } else {
    return Math.abs(numValue);
  }
}

/**
 * Validate a single import row
 */
function validateRow(row: ImportRow, rowIndex: number): { valid: boolean; error?: string } {
  // Validate date
  const parsedDate = parseDate(row.date);
  if (!parsedDate) {
    return { valid: false, error: `Invalid date format: "${row.date}"` };
  }

  // Validate amount
  const tempType = row.type || 'expense'; // Use for parsing, actual sign doesn't matter for validation
  const parsedAmount = parseAmount(row.amount, tempType);
  if (parsedAmount === null) {
    return { valid: false, error: `Invalid amount: "${row.amount}"` };
  }

  // Validate type if provided
  if (row.type && !['income', 'expense'].includes(row.type)) {
    return { valid: false, error: `Invalid type: "${row.type}". Must be "income" or "expense"` };
  }

  return { valid: true };
}

// ============================================================================
// Exported Server Actions
// ============================================================================

/**
 * Pre-validate import data before actual import
 * Returns detailed errors for UI display
 */
export async function validateImportData(
  rows: ImportRow[]
): Promise<ValidationResult> {
  const errors: Array<{ row: number; message: string }> = [];

  if (!rows || rows.length === 0) {
    return { valid: false, errors: [{ row: 0, message: 'No data provided' }] };
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const validation = validateRow(row, i);

    if (!validation.valid && validation.error) {
      errors.push({ row: i + 1, message: validation.error }); // 1-based row numbers for user display
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Import transactions from CSV data
 *
 * @param rows - Array of import rows from parsed CSV
 * @param accountId - Target account ID for the transactions
 * @param defaultType - Default transaction type if not specified in row
 * @param categoryId - Optional category ID to apply to all transactions
 * @returns ImportResult with success status, count, and any errors
 */
export async function importTransactions(
  rows: ImportRow[],
  accountId: string,
  defaultType: 'income' | 'expense',
  categoryId?: string
): Promise<ImportResult> {
  const errors: Array<{ row: number; message: string }> = [];

  try {
    // Get authenticated user
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return {
        success: false,
        imported: 0,
        errors: [{ row: 0, message: 'You must be logged in to import transactions' }],
      };
    }

    const supabase = await createClient();

    // Verify account belongs to user
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('id, currency, balance')
      .eq('id', accountId)
      .eq('user_id', userId)
      .single();

    if (accountError || !account) {
      return {
        success: false,
        imported: 0,
        errors: [{ row: 0, message: 'Account not found or access denied' }],
      };
    }

    // Validate and transform rows
    const validTransactions: Array<{
      user_id: string;
      account_id: string;
      amount: number;
      currency: string;
      transaction_date: string;
      description: string | null;
      type: 'income' | 'expense';
      category: string | null;
    }> = [];

    let totalBalanceChange = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1; // 1-based for user display

      // Validate row
      const validation = validateRow(row, i);
      if (!validation.valid) {
        errors.push({ row: rowNum, message: validation.error || 'Invalid row' });
        continue; // Skip invalid rows but continue processing
      }

      // Parse date
      const parsedDate = parseDate(row.date);
      if (!parsedDate) {
        errors.push({ row: rowNum, message: `Invalid date format: "${row.date}"` });
        continue;
      }

      // Determine type
      const type = row.type || defaultType;

      // Parse amount with correct sign based on type
      const parsedAmount = parseAmount(row.amount, type);
      if (parsedAmount === null) {
        errors.push({ row: rowNum, message: `Invalid amount: "${row.amount}"` });
        continue;
      }

      // Determine currency (use row currency if provided, otherwise account currency)
      const currency = row.currency || account.currency;

      // Build transaction object
      validTransactions.push({
        user_id: userId,
        account_id: accountId,
        amount: parsedAmount,
        currency: currency,
        transaction_date: parsedDate,
        description: row.description || 'Imported transaction',
        type: type,
        category: categoryId || null,
      });

      // Track balance change
      totalBalanceChange += parsedAmount;
    }

    // If no valid transactions, return early
    if (validTransactions.length === 0) {
      return {
        success: false,
        imported: 0,
        errors: errors.length > 0
          ? errors
          : [{ row: 0, message: 'No valid transactions to import' }],
      };
    }

    // Bulk insert transactions
    const { data: insertedData, error: insertError } = await supabase
      .from('transactions')
      .insert(validTransactions)
      .select();

    if (insertError) {
      console.error('importTransactions: Insert error', insertError);
      return {
        success: false,
        imported: 0,
        errors: [{ row: 0, message: `Database error: ${insertError.message}` }],
      };
    }

    const importedCount = insertedData?.length || 0;

    // Update account balance
    const newBalance = account.balance + totalBalanceChange;
    const { error: updateError } = await supabase
      .from('accounts')
      .update({ balance: newBalance })
      .eq('id', accountId);

    if (updateError) {
      console.error('importTransactions: Balance update error', updateError);
      // Transactions were inserted, but balance update failed
      // This is a partial success - transactions exist but balance may be incorrect
      errors.push({
        row: 0,
        message: 'Transactions imported but account balance update failed. Please adjust manually.'
      });
    }

    // Revalidate relevant paths
    revalidatePath('/');
    revalidatePath('/transactions');
    revalidatePath('/accounts');

    return {
      success: true,
      imported: importedCount,
      errors,
    };

  } catch (error) {
    console.error('importTransactions: Unexpected error', error);
    return {
      success: false,
      imported: 0,
      errors: [{
        row: 0,
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      }],
    };
  }
}

/**
 * Get a sample of parsed data for preview
 * Useful for showing users what will be imported before committing
 */
export async function previewImportData(
  rows: ImportRow[],
  accountId: string,
  defaultType: 'income' | 'expense'
): Promise<{
  valid: boolean;
  preview: Array<{
    row: number;
    date: string;
    amount: number;
    description: string;
    type: 'income' | 'expense';
    currency: string;
  }>;
  errors: Array<{ row: number; message: string }>;
  summary: {
    totalRows: number;
    validRows: number;
    totalIncome: number;
    totalExpenses: number;
    netChange: number;
  };
}> {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return {
      valid: false,
      preview: [],
      errors: [{ row: 0, message: 'You must be logged in' }],
      summary: { totalRows: 0, validRows: 0, totalIncome: 0, totalExpenses: 0, netChange: 0 },
    };
  }

  const supabase = await createClient();

  // Get account currency
  const { data: account } = await supabase
    .from('accounts')
    .select('currency')
    .eq('id', accountId)
    .eq('user_id', userId)
    .single();

  const accountCurrency = account?.currency || 'USD';

  const preview: Array<{
    row: number;
    date: string;
    amount: number;
    description: string;
    type: 'income' | 'expense';
    currency: string;
  }> = [];
  const errors: Array<{ row: number; message: string }> = [];

  let totalIncome = 0;
  let totalExpenses = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;

    // Validate
    const validation = validateRow(row, i);
    if (!validation.valid) {
      errors.push({ row: rowNum, message: validation.error || 'Invalid row' });
      continue;
    }

    const parsedDate = parseDate(row.date);
    const type = row.type || defaultType;
    const parsedAmount = parseAmount(row.amount, type);
    const currency = row.currency || accountCurrency;

    if (parsedDate && parsedAmount !== null) {
      preview.push({
        row: rowNum,
        date: parsedDate,
        amount: parsedAmount,
        description: row.description || 'Imported transaction',
        type,
        currency,
      });

      if (type === 'income') {
        totalIncome += Math.abs(parsedAmount);
      } else {
        totalExpenses += Math.abs(parsedAmount);
      }
    }
  }

  return {
    valid: errors.length === 0,
    preview,
    errors,
    summary: {
      totalRows: rows.length,
      validRows: preview.length,
      totalIncome,
      totalExpenses,
      netChange: totalIncome - totalExpenses,
    },
  };
}
