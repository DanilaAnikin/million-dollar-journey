'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { Currency } from '@/types/database';

interface AmountInputProps {
  value: number;
  onChange: (value: number) => void;
  currency: Currency;
  isNegative?: boolean;
}

const currencySymbols: Record<Currency, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  CZK: 'Kč',
  JPY: '¥',
  CHF: 'Fr',
  CAD: 'C$',
  AUD: 'A$',
};

export function AmountInput({ value, onChange, currency, isNegative = false }: AmountInputProps) {
  const [displayValue, setDisplayValue] = useState(value.toString());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value === 0) {
      setDisplayValue('');
    } else {
      setDisplayValue(value.toString());
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9.]/g, '');
    setDisplayValue(raw);

    const num = parseFloat(raw) || 0;
    onChange(num);
  };

  const handleFocus = () => {
    inputRef.current?.select();
  };

  return (
    <div className="relative">
      <div
        className={cn(
          'text-5xl md:text-6xl font-bold text-center py-8 cursor-text',
          isNegative ? 'text-red-500' : 'text-foreground'
        )}
        onClick={() => inputRef.current?.focus()}
      >
        <span className="text-muted-foreground text-3xl mr-1">
          {isNegative && '-'}{currencySymbols[currency]}
        </span>
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          placeholder="0"
          className="bg-transparent border-none outline-none text-center w-full max-w-[200px]"
        />
      </div>
    </div>
  );
}
