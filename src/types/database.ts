// Million Dollar Journey - Database Types

export type Currency = 'USD' | 'EUR' | 'GBP' | 'CZK' | 'JPY' | 'CHF' | 'CAD' | 'AUD';

export interface Profile {
  id: string;
  preferred_currency: Currency;
  target_date: string;
  target_amount_usd: number;
  birth_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Account {
  id: string;
  user_id: string;
  category_id: string | null;
  name: string;
  balance: number;
  currency: Currency;
  is_investment: boolean;
  interest_rate_pa: number;
  institution: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  target_amount: number;
  target_date: string;
  created_at: string;
  updated_at: string;
}

export type TransactionType = 'income' | 'expense' | 'transfer' | 'adjustment' | 'interest';

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  type: TransactionType;
  amount: number;
  currency: Currency;
  description: string | null;
  category: string | null;
  transaction_date: string;
  transfer_to_account_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined relations
  account?: {
    id: string;
    name: string;
    currency: string;
  } | null;
  to_account?: {
    id: string;
    name: string;
    currency: string;
  } | null;
}

export interface AccountCategory {
  id: string;
  user_id: string;
  name: string;
  type: 'asset' | 'liability';
  icon: string | null;
  color: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Milestone {
  id: string;
  user_id: string;
  name: string;
  target_amount_usd: number;
  achieved_at: string | null;
  created_at: string;
  updated_at: string;
}
