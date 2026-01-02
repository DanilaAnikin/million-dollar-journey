// Million Dollar Journey - Financial Math Engine
// Calculates required monthly contributions to reach $1,000,000

import { TARGET_AMOUNT_USD, TARGET_DATE, DEFAULT_INVESTMENT_INTEREST_RATE } from '@/lib/constants';
import { toUSD } from './currency';
import type { Account, Currency } from '@/types/database';

// ================================================
// TYPES
// ================================================

export interface CalculationResult {
  // Current state
  currentNetWorthUSD: number;
  currentInvestmentsUSD: number;
  currentCashUSD: number;

  // Projections
  projectedNetWorthUSD: number;
  futureValueOfCurrentHoldings: number;

  // The Gap
  gapToTarget: number;

  // Required action
  monthlyContributionNeeded: number;

  // Timeline
  monthsRemaining: number;
  yearsRemaining: number;
  targetDate: Date;
  targetAmount: number;

  // Progress
  progressPercentage: number;
  onTrack: boolean;
}

export interface AccountWithUSD extends Account {
  balanceUSD: number;
}

// ================================================
// CORE MATH FUNCTIONS
// ================================================

/**
 * Calculates the future value of a present amount with compound interest
 *
 * Formula: FV = PV * (1 + r/n)^(n*t)
 * Where:
 *   PV = Present Value
 *   r  = Annual interest rate (decimal)
 *   n  = Number of times interest compounds per year (12 for monthly)
 *   t  = Time in years
 */
export function calculateFutureValue(
  presentValue: number,
  annualRate: number,
  years: number,
  compoundingPerYear: number = 12
): number {
  if (presentValue <= 0) return 0;
  if (annualRate <= 0) return presentValue; // No growth
  if (years <= 0) return presentValue;

  const r = annualRate / 100; // Convert percentage to decimal
  const n = compoundingPerYear;
  const t = years;

  return presentValue * Math.pow(1 + r / n, n * t);
}

/**
 * Calculates the required monthly payment to reach a future value
 * Uses the Future Value of Annuity formula, solved for PMT
 *
 * Formula: PMT = FV * (r/n) / ((1 + r/n)^(n*t) - 1)
 * Where:
 *   FV = Future Value needed
 *   r  = Annual interest rate (decimal)
 *   n  = Number of payments per year (12 for monthly)
 *   t  = Time in years
 */
export function calculateRequiredMonthlyPayment(
  futureValueNeeded: number,
  annualRate: number,
  years: number
): number {
  if (futureValueNeeded <= 0) return 0;
  if (years <= 0) return futureValueNeeded; // Need it all now!

  const r = annualRate / 100; // Convert percentage to decimal
  const n = 12; // Monthly payments
  const t = years;
  const totalPeriods = n * t;

  // If no interest, simple division
  if (annualRate <= 0) {
    return futureValueNeeded / totalPeriods;
  }

  const monthlyRate = r / n;
  const growthFactor = Math.pow(1 + monthlyRate, totalPeriods) - 1;

  return (futureValueNeeded * monthlyRate) / growthFactor;
}

/**
 * Calculates the future value of regular monthly contributions
 *
 * Formula: FV = PMT * (((1 + r/n)^(n*t) - 1) / (r/n))
 */
export function calculateFutureValueOfPayments(
  monthlyPayment: number,
  annualRate: number,
  years: number
): number {
  if (monthlyPayment <= 0) return 0;
  if (years <= 0) return 0;

  const r = annualRate / 100;
  const n = 12;
  const t = years;

  if (annualRate <= 0) {
    return monthlyPayment * n * t;
  }

  const monthlyRate = r / n;
  const growthFactor = Math.pow(1 + monthlyRate, n * t) - 1;

  return monthlyPayment * (growthFactor / monthlyRate);
}

/**
 * Gets the number of months and years until target date
 */
export function getTimeRemaining(targetDate: Date = TARGET_DATE): { months: number; years: number } {
  const now = new Date();

  const diffMs = targetDate.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  const years = diffDays / 365.25;
  const months = years * 12;

  return {
    months: Math.max(0, Math.floor(months)),
    years: Math.max(0, years),
  };
}

// ================================================
// MAIN CALCULATION ENGINE
// ================================================

/**
 * The main calculation function that computes everything needed for the dashboard
 *
 * Logic:
 * 1. Sum up all current holdings converted to USD
 * 2. Calculate future value of current holdings (investments grow, cash doesn't)
 * 3. Calculate the gap between target and projected future value
 * 4. Calculate required monthly contribution to bridge the gap
 */
export async function calculateMonthlyContribution(
  accounts: Account[],
  targetAmount: number = TARGET_AMOUNT_USD,
  targetDate: Date = TARGET_DATE,
  defaultInvestmentRate: number = DEFAULT_INVESTMENT_INTEREST_RATE,
  rates?: import('./currency').ExchangeRates
): Promise<CalculationResult> {
  const { months: monthsRemaining, years: yearsRemaining } = getTimeRemaining(targetDate);

  // Edge case: target date has passed
  if (yearsRemaining <= 0) {
    const currentTotal = await calculateTotalInUSD(accounts, rates);
    return {
      currentNetWorthUSD: currentTotal.total,
      currentInvestmentsUSD: currentTotal.investments,
      currentCashUSD: currentTotal.cash,
      projectedNetWorthUSD: currentTotal.total,
      futureValueOfCurrentHoldings: currentTotal.total,
      gapToTarget: Math.max(0, targetAmount - currentTotal.total),
      monthlyContributionNeeded: 0,
      monthsRemaining: 0,
      yearsRemaining: 0,
      targetDate,
      targetAmount,
      progressPercentage: (currentTotal.total / targetAmount) * 100,
      onTrack: currentTotal.total >= targetAmount,
    };
  }

  // Step 1: Calculate current holdings in USD
  const currentHoldings = await calculateTotalInUSD(accounts, rates);

  // Step 2: Calculate future value of current holdings
  let futureValueOfCurrentHoldings = 0;

  for (const account of accounts) {
    const balanceUSD = toUSD(account.balance, account.currency as Currency, rates);

    if (account.is_investment) {
      // Investment accounts grow at their interest rate (or default 8%)
      const rate = account.interest_rate_pa || defaultInvestmentRate;
      futureValueOfCurrentHoldings += calculateFutureValue(balanceUSD, rate, yearsRemaining);
    } else if (account.interest_rate_pa > 0) {
      // Non-investment accounts with interest (like savings accounts)
      futureValueOfCurrentHoldings += calculateFutureValue(
        balanceUSD,
        account.interest_rate_pa,
        yearsRemaining
      );
    } else {
      // Cash accounts - no growth
      futureValueOfCurrentHoldings += balanceUSD;
    }
  }

  // Step 3: Calculate the gap
  const gapToTarget = Math.max(0, targetAmount - futureValueOfCurrentHoldings);

  // Step 4: Calculate required monthly contribution
  // Assuming new contributions are invested at the default rate
  const monthlyContributionNeeded = gapToTarget > 0
    ? calculateRequiredMonthlyPayment(gapToTarget, defaultInvestmentRate, yearsRemaining)
    : 0;

  // Step 5: Calculate projected net worth (current FV + future contributions FV)
  const futureValueOfContributions = calculateFutureValueOfPayments(
    monthlyContributionNeeded,
    defaultInvestmentRate,
    yearsRemaining
  );
  const projectedNetWorthUSD = futureValueOfCurrentHoldings + futureValueOfContributions;

  // Step 6: Determine if on track
  const progressPercentage = (currentHoldings.total / targetAmount) * 100;
  const onTrack = monthlyContributionNeeded <= 0 ||
    (currentHoldings.total > 0 && monthlyContributionNeeded < currentHoldings.total * 0.1);

  return {
    currentNetWorthUSD: currentHoldings.total,
    currentInvestmentsUSD: currentHoldings.investments,
    currentCashUSD: currentHoldings.cash,
    projectedNetWorthUSD,
    futureValueOfCurrentHoldings,
    gapToTarget,
    monthlyContributionNeeded,
    monthsRemaining,
    yearsRemaining,
    targetDate,
    targetAmount,
    progressPercentage,
    onTrack,
  };
}

/**
 * Helper: Calculate total holdings in USD
 */
async function calculateTotalInUSD(
  accounts: Account[],
  rates?: import('./currency').ExchangeRates
): Promise<{
  total: number;
  investments: number;
  cash: number;
}> {
  let investments = 0;
  let cash = 0;

  for (const account of accounts) {
    const balanceUSD = toUSD(account.balance, account.currency as Currency, rates);

    if (account.is_investment) {
      investments += balanceUSD;
    } else {
      cash += balanceUSD;
    }
  }

  return {
    total: investments + cash,
    investments,
    cash,
  };
}

// ================================================
// UTILITY FUNCTIONS
// ================================================

/**
 * Calculates the progress towards a milestone
 */
export function calculateMilestoneProgress(
  currentAmount: number,
  milestoneAmount: number
): { percentage: number; remaining: number; achieved: boolean } {
  const percentage = Math.min(100, (currentAmount / milestoneAmount) * 100);
  const remaining = Math.max(0, milestoneAmount - currentAmount);
  const achieved = currentAmount >= milestoneAmount;

  return { percentage, remaining, achieved };
}

/**
 * Generates a projection timeline showing net worth growth over time
 */
export async function generateProjectionTimeline(
  accounts: Account[],
  monthlyContribution: number,
  years: number = 10,
  investmentRate: number = DEFAULT_INVESTMENT_INTEREST_RATE,
  rates?: import('./currency').ExchangeRates
): Promise<Array<{ year: number; date: Date; projectedValue: number }>> {
  const timeline: Array<{ year: number; date: Date; projectedValue: number }> = [];
  const currentHoldings = await calculateTotalInUSD(accounts, rates);
  const now = new Date();

  for (let year = 0; year <= years; year++) {
    const futureDate = new Date(now);
    futureDate.setFullYear(now.getFullYear() + year);

    // FV of current holdings
    const fvHoldings = calculateFutureValue(
      currentHoldings.investments,
      investmentRate,
      year
    ) + currentHoldings.cash;

    // FV of contributions
    const fvContributions = calculateFutureValueOfPayments(
      monthlyContribution,
      investmentRate,
      year
    );

    timeline.push({
      year,
      date: futureDate,
      projectedValue: fvHoldings + fvContributions,
    });
  }

  return timeline;
}

/**
 * Calculates how many years until reaching a target with current trajectory
 */
export function calculateYearsToTarget(
  currentAmount: number,
  monthlyContribution: number,
  targetAmount: number,
  annualRate: number = DEFAULT_INVESTMENT_INTEREST_RATE
): number | null {
  if (currentAmount >= targetAmount) return 0;
  if (monthlyContribution <= 0 && annualRate <= 0) return null; // Will never reach

  // Binary search for the year when target is reached
  let low = 0;
  let high = 100; // Max 100 years

  while (high - low > 0.01) {
    const mid = (low + high) / 2;
    const fvHoldings = calculateFutureValue(currentAmount, annualRate, mid);
    const fvContributions = calculateFutureValueOfPayments(monthlyContribution, annualRate, mid);
    const total = fvHoldings + fvContributions;

    if (total < targetAmount) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return Math.ceil(high * 10) / 10; // Round to 1 decimal
}
