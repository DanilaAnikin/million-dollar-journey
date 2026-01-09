import { useState, useEffect } from 'react';

/**
 * Hook for client-side only date formatting to avoid React hydration mismatches.
 *
 * Server-rendered dates can differ from client dates due to timezone differences,
 * causing hydration errors. This hook ensures dates are only formatted on the client.
 *
 * @param date - The date string or Date object to format (can be null/undefined)
 * @param fallback - The fallback text to show before client hydration or when date is null (default: "Never")
 * @param formatter - Optional custom formatter function (defaults to toLocaleString)
 * @returns The formatted date string, or the fallback if not yet mounted or date is null
 */
export function useClientDate(
  date: string | Date | null | undefined,
  fallback: string = 'Never',
  formatter?: (date: Date) => string
): string {
  const [dateStr, setDateStr] = useState<string | null>(null);

  useEffect(() => {
    if (date) {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      const formatted = formatter
        ? formatter(dateObj)
        : dateObj.toLocaleString();
      setDateStr(formatted);
    } else {
      setDateStr(null);
    }
  }, [date, formatter]);

  return dateStr || fallback;
}

/**
 * Hook for client-side only date formatting with Czech locale.
 * Uses the same format as the formatDate utility function.
 *
 * @param date - The date string or Date object to format (can be null/undefined)
 * @param fallback - The fallback text to show before client hydration or when date is null
 * @returns The formatted date string in Czech format (DD. MM. YYYY)
 */
export function useClientDateCZ(
  date: string | Date | null | undefined,
  fallback: string = 'Never'
): string {
  return useClientDate(date, fallback, (d) =>
    d.toLocaleDateString('cs-CZ', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    })
  );
}
