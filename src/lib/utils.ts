import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a date string or Date object to Czech format (DD. MM. YYYY)
 * @param dateString - The date to format (string or Date object)
 * @returns Formatted date string like "2. 1. 2026"
 */
export function formatDate(dateString: string | Date): string {
  if (!dateString) return '';
  try {
    return new Date(dateString).toLocaleDateString('cs-CZ', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric'
    });
  } catch {
    return String(dateString);
  }
}
