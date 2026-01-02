// Currency Service - Jan 2026 FINAL
// Forces fresh API fetch with unique storage key

const STORAGE_KEY = 'rates_jan2026_FINAL_v3';
const API_URL = 'https://api.frankfurter.app/latest?from=USD';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

// 2026 fallback rates
const FALLBACK_RATES: Record<string, number> = {
  USD: 1,
  CZK: 20.63,
  EUR: 0.85,
  GBP: 0.79,
  JPY: 149.5,
  CHF: 0.88,
  CAD: 1.36,
  AUD: 1.53,
};

export type Currency = 'USD' | 'CZK' | 'EUR' | 'GBP' | 'JPY' | 'CHF' | 'CAD' | 'AUD';

export interface ExchangeRates {
  [key: string]: number;
}

interface CachedData {
  rates: ExchangeRates;
  timestamp: number;
}

/**
 * Get latest exchange rates (USD base)
 */
export async function getLatestRates(): Promise<ExchangeRates> {
  // Server-side: No localStorage, return fallbacks immediately
  if (typeof window === 'undefined') {
    return { ...FALLBACK_RATES };
  }

  // Check localStorage cache
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      const data: CachedData = JSON.parse(cached);
      const age = Date.now() - data.timestamp;

      if (age < CACHE_DURATION_MS) {
        return data.rates;
      }
    }
  } catch (e) {
    console.error('Currency service: Cache read error:', e);
  }

  // Fetch from API
  try {
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const rates: ExchangeRates = { USD: 1, ...data.rates };

    // Save to cache (we're always on client-side here due to early SSR return)
    const cacheData: CachedData = { rates, timestamp: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cacheData));

    return rates;
  } catch (error) {
    console.error('Currency service: API failed, using fallbacks:', error);
    return { ...FALLBACK_RATES };
  }
}

/**
 * Fetch live rates from API (for server-side use)
 * Waits for the API response instead of using cached/fallback values
 */
export async function getLiveRates(): Promise<ExchangeRates> {
  try {
    const res = await fetch('https://api.frankfurter.app/latest?from=USD', {
      next: { revalidate: 3600 } // Cache for 1 hour on server
    });

    if (!res.ok) {
      throw new Error(`API responded with status: ${res.status}`);
    }

    const data = await res.json();

    const rates: ExchangeRates = {
      USD: 1,
      CZK: data.rates.CZK,
      EUR: data.rates.EUR,
      GBP: data.rates.GBP,
      JPY: data.rates.JPY,
      CHF: data.rates.CHF,
      CAD: data.rates.CAD,
      AUD: data.rates.AUD,
    };

    return rates;
  } catch (error) {
    console.error('Currency service: getLiveRates API failed, using fallback:', error);
    return { ...FALLBACK_RATES };
  }
}

/**
 * Convert amount between currencies
 */
export function convertCurrency(
  amount: number,
  from: Currency,
  to: Currency,
  rates?: ExchangeRates
): number {
  if (from === to) return amount;

  // Guard against undefined rates during initial load
  const activeRates = rates || FALLBACK_RATES;

  if (!activeRates[from] || !activeRates[to]) {
    console.warn('🔧 SERVICE: Missing rate for', from, 'or', to, '- returning raw amount');
    return amount;
  }

  const amountInUSD = amount / activeRates[from];
  return amountInUSD * activeRates[to];
}

/**
 * Convert to USD
 */
export function toUSD(amount: number, from: Currency, rates?: ExchangeRates): number {
  const activeRates = rates || FALLBACK_RATES;
  return convertCurrency(amount, from, 'USD', activeRates);
}

/**
 * Get exchange rate between two currencies
 */
export function getExchangeRate(from: Currency, to: Currency, rates?: ExchangeRates): number {
  if (from === to) return 1;
  const activeRates = rates || FALLBACK_RATES;
  return activeRates[to] / activeRates[from];
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, currency: Currency): string {
  const locale = currency === 'CZK' ? 'cs-CZ' : currency === 'EUR' ? 'de-DE' : 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format currency compact (no decimals)
 */
export function formatCurrencyCompact(amount: number, currency: Currency): string {
  const locale = currency === 'CZK' ? 'cs-CZ' : currency === 'EUR' ? 'de-DE' : 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format as USD
 */
export function formatUSD(amount: number): string {
  return formatCurrency(amount, 'USD');
}

/**
 * Format as CZK
 */
export function formatCZK(amount: number): string {
  return formatCurrency(amount, 'CZK');
}

/**
 * Format as EUR
 */
export function formatEUR(amount: number): string {
  return formatCurrency(amount, 'EUR');
}
