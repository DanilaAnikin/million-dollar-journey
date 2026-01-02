'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { AccountCategory, Currency } from '@/types/database';

/**
 * Updates user profile settings including currency preference
 */
export async function updateProfile(data: {
  targetAmountUsd?: number;
  targetDate?: string;
  preferredCurrency?: Currency;
}): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  // Try getUser first, fallback to getSession
  let userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) {
    const { data: { session } } = await supabase.auth.getSession();
    userId = session?.user?.id;
  }
  if (!userId) {
    console.error('updateProfile: Not authenticated');
    return { success: false, error: 'Not authenticated' };
  }

  const updates: Record<string, unknown> = {};
  if (data.targetAmountUsd !== undefined) updates.target_amount_usd = data.targetAmountUsd;
  if (data.targetDate !== undefined) {
    // Ensure target_date is properly formatted as YYYY-MM-DD string
    const formattedDate = data.targetDate instanceof Date
      ? data.targetDate.toISOString().split('T')[0]
      : data.targetDate;
    updates.target_date = formattedDate;
  }
  if (data.preferredCurrency !== undefined) updates.preferred_currency = data.preferredCurrency;

  const { data: updateResult, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select();

  if (error) {
    console.error('updateProfile: Error', error);
    return { success: false, error: error.message };
  }

  // AGGRESSIVE REVALIDATION - clear all cached data
  revalidatePath('/', 'layout');    // Root layout - CRITICAL for dashboard
  revalidatePath('/');               // Dashboard/home page
  revalidatePath('/dashboard');      // Explicit dashboard path if exists
  revalidatePath('/settings');       // Settings page
  revalidatePath('/accounts');       // Accounts page (uses profile for currency)
  revalidatePath('/transactions');   // Transactions page

  return { success: true, error: null };
}

export interface CreateCategoryInput {
  name: string;
  type: 'asset' | 'liability';
  icon?: string;
  color?: string;
}

/**
 * Creates a new account category
 */
export async function createCategory(input: CreateCategoryInput): Promise<{
  data: AccountCategory | null;
  error: string | null;
}> {
  const supabase = await createClient();

  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { data: null, error: 'Not authenticated' };
  }

  // Get the highest sort_order
  const { data: existing } = await supabase
    .from('account_categories')
    .select('sort_order')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: false })
    .limit(1);

  const nextSortOrder = (existing?.[0]?.sort_order || 0) + 1;

  const { data, error } = await supabase
    .from('account_categories')
    .insert({
      user_id: user.id,
      name: input.name,
      type: input.type,
      icon: input.icon || null,
      color: input.color || null,
      sort_order: nextSortOrder,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating category:', error);
    return { data: null, error: error.message };
  }

  revalidatePath('/settings');
  revalidatePath('/accounts');
  return { data, error: null };
}

/**
 * Deletes an account category
 */
export async function deleteCategory(categoryId: string): Promise<{
  success: boolean;
  error: string | null;
}> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Check if category has accounts
  const { data: accounts } = await supabase
    .from('accounts')
    .select('id')
    .eq('category_id', categoryId)
    .limit(1);

  if (accounts && accounts.length > 0) {
    return { success: false, error: 'Cannot delete category with existing accounts' };
  }

  const { error } = await supabase
    .from('account_categories')
    .delete()
    .eq('id', categoryId)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error deleting category:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/settings');
  revalidatePath('/accounts');
  return { success: true, error: null };
}

/**
 * Gets all categories for the current user
 */
export async function getCategories(): Promise<AccountCategory[]> {
  const supabase = await createClient();

  // Auth with fallback
  let userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) {
    const { data: { session } } = await supabase.auth.getSession();
    userId = session?.user?.id;
  }

  if (!userId) {
    console.error('getCategories: No authenticated user');
    return [];
  }

  const { data, error } = await supabase
    .from('account_categories')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }

  return data || [];
}

/**
 * Exports all user data for backup/download
 */
export async function exportUserData(): Promise<{
  success: boolean;
  data: { accounts: any[]; transactions: any[]; categories: any[]; profile: any } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    // Auth with fallback
    let userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) {
      const { data: { session } } = await supabase.auth.getSession();
      userId = session?.user?.id;
    }

    if (!userId) {
      return { success: false, data: null, error: 'Not authenticated' };
    }

    // Fetch all user data
    const [accountsRes, transactionsRes, categoriesRes, profileRes] = await Promise.all([
      supabase.from('accounts').select('*').eq('user_id', userId),
      supabase.from('transactions').select('*').eq('user_id', userId),
      supabase.from('account_categories').select('*').eq('user_id', userId),
      supabase.from('profiles').select('*').eq('id', userId).single(),
    ]);

    return {
      success: true,
      data: {
        accounts: accountsRes.data || [],
        transactions: transactionsRes.data || [],
        categories: categoriesRes.data || [],
        profile: profileRes.data || null,
      },
      error: null,
    };
  } catch (error) {
    console.error('exportUserData: Error', error);
    return { success: false, data: null, error: 'Export failed' };
  }
}
