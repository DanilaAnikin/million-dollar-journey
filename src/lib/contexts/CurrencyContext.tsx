'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getLatestRates } from '@/lib/services/currency';
import type { Currency } from '@/types/database';

interface ExchangeRates {
  USD: number;
  EUR: number;
  GBP: number;
  CZK: number;
  JPY: number;
  CHF: number;
  CAD: number;
  AUD: number;
}

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  rates: ExchangeRates | null;
  convert: (amount: number, from: Currency, to: Currency) => number;
  formatAmount: (amount: number, currency: Currency) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const DEFAULT_RATES: ExchangeRates = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  CZK: 23.5,
  JPY: 149.5,
  CHF: 0.88,
  CAD: 1.36,
  AUD: 1.53,
};

export function CurrencyProvider({
  children,
  initialCurrency = 'CZK'
}: {
  children: ReactNode;
  initialCurrency?: Currency;
}) {
  const [currency, setCurrencyState] = useState<Currency>(initialCurrency);
  const [rates, setRates] = useState<ExchangeRates | null>(null);

  // Fetch exchange rates on mount
  useEffect(() => {
    async function fetchRates() {
      try {
        const fetchedRates = await getLatestRates();
        const rates: ExchangeRates = {
          USD: 1,
          EUR: fetchedRates.EUR || DEFAULT_RATES.EUR,
          GBP: fetchedRates.GBP || DEFAULT_RATES.GBP,
          CZK: fetchedRates.CZK || DEFAULT_RATES.CZK,
          JPY: fetchedRates.JPY || DEFAULT_RATES.JPY,
          CHF: fetchedRates.CHF || DEFAULT_RATES.CHF,
          CAD: fetchedRates.CAD || DEFAULT_RATES.CAD,
          AUD: fetchedRates.AUD || DEFAULT_RATES.AUD,
        };
        setRates(rates);
      } catch (error) {
        console.error('CurrencyContext: Failed to fetch rates, using defaults', error);
        setRates(DEFAULT_RATES);
      }
    }
    fetchRates();
  }, []);

  // Convert amount from one currency to another
  const convert = useCallback((amount: number, from: Currency, to: Currency): number => {
    if (from === to) return amount;
    if (!rates) return amount; // No rates yet, return as-is

    // Convert to USD first (base currency), then to target
    const amountInUSD = amount / rates[from];
    const convertedAmount = amountInUSD * rates[to];

    return convertedAmount;
  }, [rates]);

  // Format amount with proper locale and currency symbol
  const formatAmount = useCallback((amount: number, curr: Currency): string => {
    const locale = curr === 'CZK' ? 'cs-CZ' : curr === 'EUR' ? 'de-DE' : 'en-US';

    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: curr,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }, []);

  const setCurrency = async (newCurrency: Currency) => {
    setCurrencyState(newCurrency);

    // Persist to database in the background
    try {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user?.id) {
        const profilesTable = supabase.from('profiles');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (profilesTable as any)
          .update({ preferred_currency: newCurrency })
          .eq('id', userData.user.id);
      }
    } catch (error) {
      console.error('Error saving currency preference:', error);
    }
  };

  return (
    <CurrencyContext.Provider value={{
      currency,
      setCurrency,
      rates,
      convert,
      formatAmount
    }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within CurrencyProvider');
  }
  return context;
}
