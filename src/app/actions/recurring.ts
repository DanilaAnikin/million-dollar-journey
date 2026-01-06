'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getLiveRates } from '@/lib/services/currency';
import type { RecurringTransaction, RecurringFrequency, Currency, Account, AccountCategory } from '@/types/database';

// Helper function to calculate next due date based on frequency
function calculateNextDueDate(currentDate: string, frequency: RecurringFrequency): string {
  const date = new Date(currentDate);
  switch (frequency) {
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
  }
  return date.toISOString().split('T')[0];
}

// Helper function to get authenticated user ID
async function getAuthenticatedUserId(): Promise<string | null> {
  const supabase = await createClient();

  // Try getUser first (recommended, verifies with DB)
  let userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) {
    // Fallback to getSession (JWT only, no DB verification)
    const { data: { session } } = await supabase.auth.getSession();
    userId = session?.user?.id;
  }

  return userId || null;
}

// Input type for creating a recurring transaction
export interface CreateRecurringTransactionInput {
  name: string;
  amount: number;
  currency: Currency;
  frequency: RecurringFrequency;
  next_due_date: string;
  category_id?: string | null;
  account_id: string;
  type: 'expense' | 'income';
  description?: string | null;
}

// Input type for updating a recurring transaction
export interface UpdateRecurringTransactionInput {
  id: string;
  name?: string;
  amount?: number;
  currency?: Currency;
  frequency?: RecurringFrequency;
  next_due_date?: string;
  category_id?: string | null;
  account_id?: string;
  type?: 'expense' | 'income';
  description?: string | null;
  is_active?: boolean;
}

/**
 * Get all recurring transactions for the current user
 */
export async function getRecurringTransactions(): Promise<RecurringTransaction[]> {
  const supabase = await createClient();

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    console.error('getRecurringTransactions: No authenticated user');
    return [];
  }

  const { data, error } = await supabase
    .from('recurring_transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('next_due_date', { ascending: true });

  if (error) {
    console.error('getRecurringTransactions: Query error', error);
    return [];
  }

  return (data || []) as RecurringTransaction[];
}

/**
 * Get all recurring transactions with related data for the recurring page
 * Includes accounts, categories, and monthly totals calculation
 */
export async function getRecurringPageData(): Promise<{
  recurring: RecurringTransaction[];
  accounts: Account[];
  categories: AccountCategory[];
  totals: {
    monthlyExpensesUSD: number;
    monthlyIncomeUSD: number;
    netMonthlyUSD: number;
    rates: Record<Currency, number>;
  };
}> {
  const supabase = await createClient();
  const userId = await getAuthenticatedUserId();

  const defaultRates: Record<Currency, number> = {
    USD: 1,
    EUR: 1,
    GBP: 1,
    CZK: 1,
    JPY: 1,
    CHF: 1,
    CAD: 1,
    AUD: 1,
  };

  if (!userId) {
    console.error('getRecurringPageData: AUTH FAILED');
    return {
      recurring: [],
      accounts: [],
      categories: [],
      totals: {
        monthlyExpensesUSD: 0,
        monthlyIncomeUSD: 0,
        netMonthlyUSD: 0,
        rates: defaultRates,
      },
    };
  }

  // Fetch recurring transactions, accounts, and categories in parallel
  const [recurringResult, accountsResult, categoriesResult] = await Promise.all([
    supabase
      .from('recurring_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('next_due_date'),
    supabase
      .from('accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('account_categories')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order'),
  ]);

  if (recurringResult.error) {
    console.error('Error fetching recurring transactions:', recurringResult.error);
  }

  const recurring = (recurringResult.data || []) as RecurringTransaction[];
  const accounts = (accountsResult.data || []) as Account[];
  const categories = (categoriesResult.data || []) as AccountCategory[];

  // Get live rates
  const rates = await getLiveRates();

  // Calculate monthly totals (convert all to USD, then to monthly equivalent)
  let monthlyExpensesUSD = 0;
  let monthlyIncomeUSD = 0;

  for (const item of recurring) {
    if (!item.is_active) continue;

    // Convert amount to USD
    const rateToUSD = 1 / (rates[item.currency as keyof typeof rates] || 1);
    const amountUSD = item.amount * rateToUSD;

    // Convert to monthly equivalent
    let monthlyAmountUSD = amountUSD;
    if (item.frequency === 'weekly') {
      monthlyAmountUSD = amountUSD * 4.33; // 52 weeks / 12 months
    } else if (item.frequency === 'yearly') {
      monthlyAmountUSD = amountUSD / 12;
    }

    if (item.type === 'expense') {
      monthlyExpensesUSD += monthlyAmountUSD;
    } else {
      monthlyIncomeUSD += monthlyAmountUSD;
    }
  }

  return {
    recurring,
    accounts,
    categories,
    totals: {
      monthlyExpensesUSD,
      monthlyIncomeUSD,
      netMonthlyUSD: monthlyIncomeUSD - monthlyExpensesUSD,
      rates: {
        USD: 1,
        EUR: rates.EUR,
        GBP: rates.GBP,
        CZK: rates.CZK,
        JPY: rates.JPY,
        CHF: rates.CHF,
        CAD: rates.CAD,
        AUD: rates.AUD,
      },
    },
  };
}

/**
 * Get recurring transactions that are due (next_due_date <= today AND is_active = true)
 */
export async function getDueRecurringTransactions(): Promise<RecurringTransaction[]> {
  const supabase = await createClient();

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    console.error('getDueRecurringTransactions: No authenticated user');
    return [];
  }

  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('recurring_transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .lte('next_due_date', today)
    .order('next_due_date', { ascending: true });

  if (error) {
    console.error('getDueRecurringTransactions: Query error', error);
    return [];
  }

  return (data || []) as RecurringTransaction[];
}

/**
 * Process a single recurring transaction:
 * - Creates a new transaction in the transactions table
 * - Updates the account balance
 * - Updates the next_due_date of the recurring transaction
 */
export async function processRecurringTransaction(id: string): Promise<{
  success: boolean;
  error: string | null;
}> {
  const supabase = await createClient();

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return { success: false, error: 'You must be logged in' };
  }

  // Fetch the recurring transaction
  const { data: recurringTx, error: fetchError } = await supabase
    .from('recurring_transactions')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (fetchError || !recurringTx) {
    console.error('processRecurringTransaction: Fetch error', fetchError);
    return { success: false, error: 'Recurring transaction not found' };
  }

  const recurring = recurringTx as RecurringTransaction;

  // Determine the amount sign based on transaction type
  const transactionAmount = recurring.type === 'expense'
    ? -Math.abs(recurring.amount)
    : Math.abs(recurring.amount);

  // Create a new transaction in the transactions table
  const { error: insertError } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      account_id: recurring.account_id,
      type: recurring.type,
      amount: transactionAmount,
      currency: recurring.currency,
      description: `${recurring.name} (Auto-generated)`,
      category: recurring.category_id,
      transaction_date: recurring.next_due_date,
    });

  if (insertError) {
    console.error('processRecurringTransaction: Insert error', insertError);
    return { success: false, error: insertError.message };
  }

  // Update the account balance
  const { data: account, error: accError } = await supabase
    .from('accounts')
    .select('balance')
    .eq('id', recurring.account_id)
    .single();

  if (accError) {
    console.error('processRecurringTransaction: Account fetch error', accError);
    return { success: false, error: 'Transaction created but balance update failed' };
  }

  const newBalance = account.balance + transactionAmount;

  const { error: updateAccError } = await supabase
    .from('accounts')
    .update({ balance: newBalance })
    .eq('id', recurring.account_id);

  if (updateAccError) {
    console.error('processRecurringTransaction: Balance update error', updateAccError);
    return { success: false, error: 'Transaction created but balance update failed' };
  }

  // Calculate and update the next due date
  const nextDueDate = calculateNextDueDate(recurring.next_due_date, recurring.frequency);

  const { error: updateError } = await supabase
    .from('recurring_transactions')
    .update({ next_due_date: nextDueDate })
    .eq('id', id);

  if (updateError) {
    console.error('processRecurringTransaction: Update next_due_date error', updateError);
    return { success: false, error: 'Transaction created but failed to update next due date' };
  }

  revalidatePath('/');
  revalidatePath('/transactions');
  revalidatePath('/accounts');

  return { success: true, error: null };
}

/**
 * Process all due recurring transactions
 * Returns the count of successfully processed transactions
 */
export async function processAllDueTransactions(): Promise<{
  processedCount: number;
  errors: string[];
}> {
  const dueTransactions = await getDueRecurringTransactions();

  let processedCount = 0;
  const errors: string[] = [];

  for (const tx of dueTransactions) {
    const result = await processRecurringTransaction(tx.id);
    if (result.success) {
      processedCount++;
    } else if (result.error) {
      errors.push(`${tx.name}: ${result.error}`);
    }
  }

  return { processedCount, errors };
}

/**
 * Create a new recurring transaction
 */
export async function createRecurringTransaction(
  input: CreateRecurringTransactionInput
): Promise<{ data: RecurringTransaction | null; error: string | null }> {
  const supabase = await createClient();

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return { data: null, error: 'You must be logged in' };
  }

  const { data, error } = await supabase
    .from('recurring_transactions')
    .insert({
      user_id: userId,
      name: input.name,
      amount: input.amount,
      currency: input.currency,
      frequency: input.frequency,
      next_due_date: input.next_due_date,
      category_id: input.category_id || null,
      account_id: input.account_id,
      type: input.type,
      description: input.description || null,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error('createRecurringTransaction: Insert error', error);
    return { data: null, error: error.message };
  }

  revalidatePath('/');

  return { data: data as RecurringTransaction, error: null };
}

/**
 * Update an existing recurring transaction
 */
export async function updateRecurringTransaction(
  input: UpdateRecurringTransactionInput
): Promise<{ data: RecurringTransaction | null; error: string | null }> {
  const supabase = await createClient();

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return { data: null, error: 'You must be logged in' };
  }

  const updates: Record<string, unknown> = {};

  if (input.name !== undefined) updates.name = input.name;
  if (input.amount !== undefined) updates.amount = input.amount;
  if (input.currency !== undefined) updates.currency = input.currency;
  if (input.frequency !== undefined) updates.frequency = input.frequency;
  if (input.next_due_date !== undefined) updates.next_due_date = input.next_due_date;
  if (input.category_id !== undefined) updates.category_id = input.category_id;
  if (input.account_id !== undefined) updates.account_id = input.account_id;
  if (input.type !== undefined) updates.type = input.type;
  if (input.description !== undefined) updates.description = input.description;
  if (input.is_active !== undefined) updates.is_active = input.is_active;

  const { data, error } = await supabase
    .from('recurring_transactions')
    .update(updates)
    .eq('id', input.id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('updateRecurringTransaction: Update error', error);
    return { data: null, error: error.message };
  }

  revalidatePath('/');

  return { data: data as RecurringTransaction, error: null };
}

/**
 * Delete (soft delete) a recurring transaction by setting is_active = false
 */
export async function deleteRecurringTransaction(id: string): Promise<{
  success: boolean;
  error: string | null;
}> {
  const supabase = await createClient();

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return { success: false, error: 'You must be logged in' };
  }

  const { error } = await supabase
    .from('recurring_transactions')
    .update({ is_active: false })
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    console.error('deleteRecurringTransaction: Delete error', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/');

  return { success: true, error: null };
}
