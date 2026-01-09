/**
 * Common types for CSV parsers
 */

export type ParserType = 'generic' | 'trading212' | 'xtb';

/**
 * A parsed transaction ready for import
 */
export interface ParsedTransaction {
  date: string;
  amount: number;
  description: string;
  currency: string;
  type: 'income' | 'expense';
  /** Original row data for debugging/reference */
  originalRow?: Record<string, string>;
  /** Unique identifier for duplicate detection (hash of key fields) */
  hash?: string;
}

/**
 * Result of parsing a CSV file
 */
export interface ParserResult {
  success: boolean;
  transactions: ParsedTransaction[];
  errors: Array<{ row: number; message: string }>;
  /** Summary statistics */
  summary: {
    totalRows: number;
    parsedRows: number;
    skippedRows: number;
    totalIncome: number;
    totalExpenses: number;
    netChange: number;
    currencies: string[];
    dateRange: {
      earliest: string | null;
      latest: string | null;
    };
  };
  /** Duplicate transactions found (if any) */
  duplicates?: ParsedTransaction[];
}

/**
 * Column mapping configuration
 */
export interface ColumnMapping {
  date: string;
  amount: string;
  description?: string;
  currency?: string;
  type?: string;
}
