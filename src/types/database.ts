// Million Dollar Journey - Database Types

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      accounts: {
        Row: {
          id: string
          user_id: string
          category_id: string | null
          name: string
          balance: number
          currency: string
          is_investment: boolean
          interest_rate_pa: number
          institution: string | null
          notes: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          category_id?: string | null
          name: string
          balance?: number
          currency: string
          is_investment?: boolean
          interest_rate_pa?: number
          institution?: string | null
          notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          category_id?: string | null
          name?: string
          balance?: number
          currency?: string
          is_investment?: boolean
          interest_rate_pa?: number
          institution?: string | null
          notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      account_categories: {
        Row: {
          id: string
          user_id: string
          name: string
          type: 'asset' | 'liability'
          icon: string | null
          color: string | null
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          name: string
          type: 'asset' | 'liability'
          icon?: string | null
          color?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          type?: 'asset' | 'liability'
          icon?: string | null
          color?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          preferred_currency: string
          target_date: string
          target_amount_usd: number
          birth_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          preferred_currency?: string
          target_date: string
          target_amount_usd?: number
          birth_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          preferred_currency?: string
          target_date?: string
          target_amount_usd?: number
          birth_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          account_id: string
          type: 'income' | 'expense' | 'transfer' | 'adjustment' | 'interest'
          amount: number
          currency: string
          description: string | null
          category: string | null
          transaction_date: string
          transfer_to_account_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          account_id: string
          type: 'income' | 'expense' | 'transfer' | 'adjustment' | 'interest'
          amount: number
          currency: string
          description?: string | null
          category?: string | null
          transaction_date: string
          transfer_to_account_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          account_id?: string
          type?: 'income' | 'expense' | 'transfer' | 'adjustment' | 'interest'
          amount?: number
          currency?: string
          description?: string | null
          category?: string | null
          transaction_date?: string
          transfer_to_account_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      milestones: {
        Row: {
          id: string
          user_id: string
          name: string
          target_amount_usd: number
          achieved_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          name: string
          target_amount_usd: number
          achieved_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          target_amount_usd?: number
          achieved_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      recurring_transactions: {
        Row: {
          id: string
          user_id: string
          name: string
          amount: number
          currency: string
          frequency: 'weekly' | 'monthly' | 'yearly'
          next_due_date: string
          category_id: string | null
          account_id: string
          type: 'expense' | 'income'
          description: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          name: string
          amount: number
          currency: string
          frequency: 'weekly' | 'monthly' | 'yearly'
          next_due_date: string
          category_id?: string | null
          account_id: string
          type: 'expense' | 'income'
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          amount?: number
          currency?: string
          frequency?: 'weekly' | 'monthly' | 'yearly'
          next_due_date?: string
          category_id?: string | null
          account_id?: string
          type?: 'expense' | 'income'
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      integrations: {
        Row: {
          id: string
          user_id: string
          provider: string
          name: string
          api_key: string
          status: 'active' | 'error' | 'expired'
          last_synced_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          provider: string
          name: string
          api_key: string
          status?: 'active' | 'error' | 'expired'
          last_synced_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          provider?: string
          name?: string
          api_key?: string
          status?: 'active' | 'error' | 'expired'
          last_synced_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      integration_mappings: {
        Row: {
          id: string
          integration_id: string
          external_account_id: string
          external_account_name: string
          internal_account_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          integration_id: string
          external_account_id: string
          external_account_name: string
          internal_account_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          integration_id?: string
          external_account_id?: string
          external_account_name?: string
          internal_account_id?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Convenience types
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

// Recurring transaction frequency options
export type RecurringFrequency = 'weekly' | 'monthly' | 'yearly';

// Recurring transaction record
export interface RecurringTransaction {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  currency: Currency;
  frequency: RecurringFrequency;
  next_due_date: string; // ISO date string
  category_id: string | null;
  account_id: string;
  type: 'expense' | 'income';
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Integration status type
export type IntegrationStatus = 'active' | 'error' | 'expired';

// Integration provider type
export type IntegrationProvider = 'gocardless' | 'trading212' | 'xtb';

// Integration record
export interface Integration {
  id: string;
  user_id: string;
  provider: IntegrationProvider;
  name: string;
  api_key: string;
  status: IntegrationStatus;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

// Integration mapping record (1:N relationship - one integration can map to multiple accounts)
export interface IntegrationMapping {
  id: string;
  integration_id: string;
  external_account_id: string;  // ID from external API (e.g., "ACC-123", "default")
  external_account_name: string; // Name from external API (e.g., "Trading 212 Portfolio")
  internal_account_id: string;   // FK to accounts table
  created_at: string;
  updated_at: string;
}
