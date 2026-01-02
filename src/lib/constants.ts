// Million Dollar Journey - Application Constants

// The ultimate goal!
export const TARGET_AMOUNT_USD = 1_000_000;

// Default target date (10 years from app creation)
export const TARGET_DATE = new Date('2035-01-01');

// Default investment return rate (historical S&P 500 average)
export const DEFAULT_INVESTMENT_INTEREST_RATE = 8;

// Supported currencies
export const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'CZK', 'JPY', 'CHF', 'CAD', 'AUD'] as const;

// Milestone amounts for progress tracking
export const MILESTONES = [
  10_000,
  25_000,
  50_000,
  100_000,
  250_000,
  500_000,
  750_000,
  1_000_000,
] as const;
