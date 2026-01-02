'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getLiveRates, toUSD } from '@/lib/services/currency';
import type { Account, AccountCategory, Currency } from '@/types/database';

export interface CreateAccountInput {
  userId?: string; // Optional - server action gets user ID from auth, not from client
  categoryId: string | null;
  name: string;
  currency: Currency;
  balance: number;
  isInvestment: boolean;
  interestRatePa: number;
  institution?: string;
  notes?: string;
}

export interface UpdateAccountInput {
  id: string;
  name?: string;
  categoryId?: string | null;
  balance?: number;
  isInvestment?: boolean;
  interestRatePa?: number;
  institution?: string;
  notes?: string;
  isActive?: boolean;
}

export async function createAccount(input: CreateAccountInput): Promise<{ data: Account | null; error: string | null }> {
  const supabase = await createClient();

  // Try getUser first (recommended, verifies with DB)
  let userId: string | undefined;
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (user) {
    userId = user.id;
  } else {
    // Fallback to getSession (JWT only, no DB verification)
    const { data: { session } } = await supabase.auth.getSession();
    userId = session?.user?.id;
  }

  // Final check
  if (!userId) {
    console.error('createAccount: AUTH FAILED - No user from getUser or getSession');
    return { data: null, error: 'You must be logged in' };
  }

  // Continue with account creation using userId
  const { data, error } = await supabase
    .from('accounts')
    .insert({
      user_id: userId,
      category_id: input.categoryId || null,
      name: input.name,
      currency: input.currency,
      balance: input.balance,
      is_investment: input.isInvestment ?? false,
      interest_rate_pa: input.interestRatePa ?? 0,
      institution: input.institution || null,
      notes: input.notes || null,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error('Insert error:', error);
    return { data: null, error: error.message };
  }

  revalidatePath('/');
  revalidatePath('/accounts');
  return { data, error: null };
}

export async function updateAccount(input: UpdateAccountInput): Promise<{ data: Account | null; error: string | null }> {
  const supabase = await createClient();

  // Try getUser first (recommended, verifies with DB)
  let userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) {
    // Fallback to getSession (JWT only, no DB verification)
    const { data: { session } } = await supabase.auth.getSession();
    userId = session?.user?.id;
  }

  // Final check
  if (!userId) {
    console.error('updateAccount: AUTH FAILED - No user from getUser or getSession');
    return { data: null, error: 'You must be logged in' };
  }

  const updates: Record<string, unknown> = {};

  if (input.name !== undefined) updates.name = input.name;
  if (input.categoryId !== undefined) updates.category_id = input.categoryId;
  if (input.balance !== undefined) updates.balance = input.balance;
  if (input.isInvestment !== undefined) updates.is_investment = input.isInvestment;
  if (input.interestRatePa !== undefined) updates.interest_rate_pa = input.interestRatePa;
  if (input.institution !== undefined) updates.institution = input.institution;
  if (input.notes !== undefined) updates.notes = input.notes;
  if (input.isActive !== undefined) updates.is_active = input.isActive;

  const { data, error } = await supabase
    .from('accounts')
    .update(updates)
    .eq('id', input.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating account:', error);
    return { data: null, error: error.message };
  }

  revalidatePath('/');
  revalidatePath('/accounts');
  return { data, error: null };
}

export async function deleteAccount(accountId: string): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  // Try getUser first (recommended, verifies with DB)
  let userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) {
    // Fallback to getSession (JWT only, no DB verification)
    const { data: { session } } = await supabase.auth.getSession();
    userId = session?.user?.id;
  }

  // Final check
  if (!userId) {
    console.error('deleteAccount: AUTH FAILED - No user from getUser or getSession');
    return { success: false, error: 'You must be logged in' };
  }

  const { error } = await supabase
    .from('accounts')
    .update({ is_active: false })
    .eq('id', accountId);

  if (error) {
    console.error('Error deleting account:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/');
  revalidatePath('/accounts');
  return { success: true, error: null };
}

export async function getAccounts(includeInactive: boolean = false): Promise<{
  accounts: Account[];
  categories: AccountCategory[];
  totals: {
    totalUSD: number;
    assetsUSD: number;
    liabilitiesUSD: number;
    rates: {
      USD: number;
      CZK: number;
      EUR: number;
    };
  };
}> {
  const supabase = await createClient();

  // Try getUser first (recommended, verifies with DB)
  let userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) {
    // Fallback to getSession (JWT only, no DB verification)
    const { data: { session } } = await supabase.auth.getSession();
    userId = session?.user?.id;
  }

  // Final check
  if (!userId) {
    console.error('getAccounts: AUTH FAILED - No user from getUser or getSession');
    return {
      accounts: [],
      categories: [],
      totals: {
        totalUSD: 0,
        assetsUSD: 0,
        liabilitiesUSD: 0,
        rates: {
          USD: 1,
          CZK: 1,
          EUR: 1,
        }
      }
    };
  }

  let accountsQuery = supabase
    .from('accounts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at');

  if (!includeInactive) {
    accountsQuery = accountsQuery.eq('is_active', true);
  }

  // Fetch both accounts and categories
  const [accountsResult, categoriesResult] = await Promise.all([
    accountsQuery,
    supabase.from('account_categories').select('*').eq('user_id', userId).order('sort_order')
  ]);

  if (accountsResult.error) {
    console.error('Error fetching accounts:', accountsResult.error);
    return {
      accounts: [],
      categories: [],
      totals: {
        totalUSD: 0,
        assetsUSD: 0,
        liabilitiesUSD: 0,
        rates: {
          USD: 1,
          CZK: 1,
          EUR: 1,
        }
      }
    };
  }

  const accounts = accountsResult.data || [];
  const categories = categoriesResult.data || [];

  // Calculate totals using live rates (same as dashboard)
  const rates = await getLiveRates();

  let totalUSD = 0;
  let assetsUSD = 0;
  let liabilitiesUSD = 0;

  for (const account of accounts) {
    const amountInUSD = toUSD(account.balance, account.currency as Currency, rates);
    totalUSD += amountInUSD;

    // Check if liability based on category
    const category = categories.find(c => c.id === account.category_id);
    if (category?.type === 'liability') {
      liabilitiesUSD += Math.abs(amountInUSD);
    } else {
      assetsUSD += amountInUSD;
    }
  }

  return {
    accounts,
    categories,
    totals: {
      totalUSD,
      assetsUSD,
      liabilitiesUSD,
      rates: {
        USD: 1,
        CZK: rates.CZK,
        EUR: rates.EUR,
      }
    }
  };
}
