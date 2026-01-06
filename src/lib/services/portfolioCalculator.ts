// Portfolio Calculator - Single Source of Truth for Net Worth Calculations
// This module centralizes all portfolio/net worth calculations to ensure consistency
// between Desktop and Mobile views.

import { toUSD, type ExchangeRates } from './currency';
import type { Account, AccountCategory, Currency } from '@/types/database';

// ================================================
// TYPES
// ================================================

export interface PortfolioTotals {
  // All values in USD (base currency for calculations)
  netWorthUSD: number;           // Total assets minus total liabilities
  totalAssetsUSD: number;        // Sum of all asset accounts
  totalLiabilitiesUSD: number;   // Sum of all liability accounts (as positive number)
  totalInvestmentsUSD: number;   // Sum of accounts marked as investments
  totalCashUSD: number;          // Sum of non-investment accounts (excluding liabilities)

  // The rates used for calculation (for display conversion)
  rates: ExchangeRates;
}

export interface AccountWithCategory extends Account {
  categoryType?: 'asset' | 'liability';
}

// ================================================
// CORE CALCULATION FUNCTION
// ================================================

/**
 * Calculate portfolio totals from accounts and categories.
 * This is the SINGLE SOURCE OF TRUTH for all net worth calculations.
 *
 * @param accounts - Array of user's accounts
 * @param categories - Array of account categories (to determine asset vs liability)
 * @param rates - Exchange rates with USD as base
 * @returns PortfolioTotals object with all calculated values
 */
export function calculatePortfolioTotals(
  accounts: Account[],
  categories: AccountCategory[],
  rates: ExchangeRates
): PortfolioTotals {
  let totalAssetsUSD = 0;
  let totalLiabilitiesUSD = 0;
  let totalInvestmentsUSD = 0;
  let totalCashUSD = 0;

  for (const account of accounts) {
    // Convert balance to USD using provided rates
    const balanceUSD = toUSD(account.balance, account.currency as Currency, rates);

    // Find the category to determine if this is an asset or liability
    const category = categories.find(c => c.id === account.category_id);
    const isLiability = category?.type === 'liability';

    if (isLiability) {
      // Liabilities are stored as positive numbers but represent debt
      totalLiabilitiesUSD += Math.abs(balanceUSD);
    } else {
      // Asset accounts
      totalAssetsUSD += balanceUSD;

      // Further categorize into investments vs cash
      if (account.is_investment) {
        totalInvestmentsUSD += balanceUSD;
      } else {
        totalCashUSD += balanceUSD;
      }
    }
  }

  // Net worth = Assets - Liabilities
  const netWorthUSD = totalAssetsUSD - totalLiabilitiesUSD;

  return {
    netWorthUSD,
    totalAssetsUSD,
    totalLiabilitiesUSD,
    totalInvestmentsUSD,
    totalCashUSD,
    rates,
  };
}

/**
 * Helper to convert portfolio totals to a display currency
 *
 * @param totals - Portfolio totals in USD
 * @param targetCurrency - Currency to convert to
 * @returns Object with all values converted to target currency
 */
export function convertTotalsToDisplayCurrency(
  totals: PortfolioTotals,
  targetCurrency: Currency
): {
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  totalInvestments: number;
  totalCash: number;
} {
  const rate = totals.rates[targetCurrency] || 1;

  return {
    netWorth: totals.netWorthUSD * rate,
    totalAssets: totals.totalAssetsUSD * rate,
    totalLiabilities: totals.totalLiabilitiesUSD * rate,
    totalInvestments: totals.totalInvestmentsUSD * rate,
    totalCash: totals.totalCashUSD * rate,
  };
}

/**
 * Categorize accounts by type for display purposes
 *
 * @param accounts - Array of accounts
 * @param categories - Array of categories
 * @returns Object with accounts grouped by asset/liability
 */
export function categorizeAccounts(
  accounts: Account[],
  categories: AccountCategory[]
): {
  assetAccounts: Account[];
  liabilityAccounts: Account[];
} {
  const assetAccounts: Account[] = [];
  const liabilityAccounts: Account[] = [];

  for (const account of accounts) {
    const category = categories.find(c => c.id === account.category_id);
    if (category?.type === 'liability') {
      liabilityAccounts.push(account);
    } else {
      assetAccounts.push(account);
    }
  }

  return { assetAccounts, liabilityAccounts };
}
