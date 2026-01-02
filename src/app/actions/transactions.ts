'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Transaction, TransactionType, Currency } from '@/types/database';

export async function getTransactions(): Promise<Transaction[]> {
  const supabase = await createClient();

  // Auth with fallback
  let userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) {
    const { data: { session } } = await supabase.auth.getSession();
    userId = session?.user?.id;
  }

  if (!userId) {
    console.error('getTransactions: No authenticated user');
    return [];
  }

  const { data, error } = await supabase
    .from('transactions')
    .select(`
      *,
      account:accounts!account_id(id, name, currency),
      to_account:accounts!transfer_to_account_id(id, name, currency)
    `)
    .eq('user_id', userId)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('getTransactions: Query error', error);
    return [];
  }

  return data || [];
}

export async function getAccounts() {
  const supabase = await createClient();

  // Auth with fallback
  let userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) {
    const { data: { session } } = await supabase.auth.getSession();
    userId = session?.user?.id;
  }

  if (!userId) {
    console.error('getAccounts: No authenticated user');
    return [];
  }

  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (error) {
    console.error('getAccounts: Error', error);
    return [];
  }

  return data || [];
}

export interface AddTransactionInput {
  userId: string;
  accountId: string;
  amount: number;
  currency: Currency;
  transactionDate?: Date;
  description?: string;
  type: TransactionType;
  transferToAccountId?: string;
  category?: string;
}

export interface TransferInput {
  userId: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  currency: Currency;
  description?: string;
}

export interface CreateTransactionInput {
  accountId: string;
  type: TransactionType;
  amount: number;
  currency: Currency;
  description?: string;
  date: string;
  category?: string;
  toAccountId?: string;
}

export async function createTransaction(input: CreateTransactionInput): Promise<{
  data: Transaction | null;
  error: string | null;
}> {
  const supabase = await createClient();

  // Get authenticated user with fallback
  let userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) {
    const { data: { session } } = await supabase.auth.getSession();
    userId = session?.user?.id;
  }

  if (!userId) {
    return { data: null, error: 'You must be logged in' };
  }

  // Handle balance updates based on transaction type
  if (input.type === 'transfer' && input.toAccountId) {
    // For transfers - update both account balances
    // Get source account current balance
    const { data: sourceAcc } = await supabase
      .from('accounts')
      .select('balance')
      .eq('id', input.accountId)
      .single();

    // Get dest account current balance
    const { data: destAcc } = await supabase
      .from('accounts')
      .select('balance')
      .eq('id', input.toAccountId)
      .single();

    if (sourceAcc && destAcc) {
      // Decrement source
      await supabase
        .from('accounts')
        .update({ balance: sourceAcc.balance - input.amount })
        .eq('id', input.accountId);

      // Increment destination
      await supabase
        .from('accounts')
        .update({ balance: destAcc.balance + input.amount })
        .eq('id', input.toAccountId);
    }
  } else if (input.type === 'expense') {
    // For expense - decrement balance
    const { data: acc } = await supabase
      .from('accounts')
      .select('balance')
      .eq('id', input.accountId)
      .single();

    if (acc) {
      await supabase
        .from('accounts')
        .update({ balance: acc.balance - input.amount })
        .eq('id', input.accountId);
    }
  } else if (input.type === 'income') {
    // For income - increment balance
    const { data: acc } = await supabase
      .from('accounts')
      .select('balance')
      .eq('id', input.accountId)
      .single();

    if (acc) {
      await supabase
        .from('accounts')
        .update({ balance: acc.balance + input.amount })
        .eq('id', input.accountId);
    }
  }

  // Create transaction record - MUST include user_id
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,  // CRITICAL - must save this
      account_id: input.accountId,
      type: input.type,
      amount: input.amount,
      currency: input.currency,
      description: input.description || null,
      transaction_date: input.date,
      category: input.category || null,
      transfer_to_account_id: input.toAccountId || null,
    })
    .select()
    .single();

  if (error) {
    console.error('createTransaction: Insert error', error);
    return { data: null, error: error.message };
  }

  revalidatePath('/');
  revalidatePath('/transactions');
  revalidatePath('/accounts');

  return { data, error: null };
}

export async function addTransaction(input: AddTransactionInput): Promise<{
  data: Transaction | null;
  error: string | null
}> {
  const supabase = await createClient();

  // Validate user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { data: null, error: 'Not authenticated' };
  }

  // Create the transaction record (use authenticated user ID for security)
  const { data: transaction, error: txError } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      account_id: input.accountId,
      amount: input.amount,
      currency: input.currency,
      transaction_date: input.transactionDate?.toISOString() || new Date().toISOString(),
      description: input.description || null,
      type: input.type,
      transfer_to_account_id: input.transferToAccountId || null,
      category: input.category || null,
    })
    .select()
    .single();

  if (txError) {
    console.error('Error creating transaction:', txError);
    return { data: null, error: txError.message };
  }

  // Update account balance
  const { data: account, error: accError } = await supabase
    .from('accounts')
    .select('balance')
    .eq('id', input.accountId)
    .single();

  if (accError) {
    console.error('Error fetching account:', accError);
    return { data: transaction, error: 'Transaction created but balance update failed' };
  }

  const newBalance = account.balance + input.amount;

  const { error: updateError } = await supabase
    .from('accounts')
    .update({ balance: newBalance })
    .eq('id', input.accountId);

  if (updateError) {
    console.error('Error updating balance:', updateError);
    return { data: transaction, error: 'Transaction created but balance update failed' };
  }

  revalidatePath('/');
  revalidatePath('/accounts');
  revalidatePath('/transactions');
  return { data: transaction, error: null };
}

export async function addTransfer(input: TransferInput): Promise<{
  success: boolean;
  error: string | null;
}> {
  const supabase = await createClient();

  // Validate user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Create outgoing transaction
  const outgoing = await addTransaction({
    userId: input.userId,
    accountId: input.fromAccountId,
    amount: -Math.abs(input.amount),
    currency: input.currency,
    description: input.description || 'Transfer out',
    type: 'transfer',
    transferToAccountId: input.toAccountId,
  });

  if (outgoing.error) {
    return { success: false, error: outgoing.error };
  }

  // Create incoming transaction
  const incoming = await addTransaction({
    userId: input.userId,
    accountId: input.toAccountId,
    amount: Math.abs(input.amount),
    currency: input.currency,
    description: input.description || 'Transfer in',
    type: 'transfer',
    transferToAccountId: input.fromAccountId,
  });

  if (incoming.error) {
    return { success: false, error: incoming.error };
  }

  revalidatePath('/');
  revalidatePath('/accounts');
  revalidatePath('/transactions');
  return { success: true, error: null };
}

export async function addAdjustment(
  userId: string,
  accountId: string,
  newBalance: number,
  currency: Currency,
  description?: string
): Promise<{ data: Transaction | null; error: string | null }> {
  const supabase = await createClient();

  // Validate user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { data: null, error: 'Not authenticated' };
  }

  // Get current balance
  const { data: account, error } = await supabase
    .from('accounts')
    .select('balance')
    .eq('id', accountId)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  const adjustment = newBalance - account.balance;

  const result = await addTransaction({
    userId,
    accountId,
    amount: adjustment,
    currency,
    description: description || 'Balance adjustment',
    type: 'adjustment',
  });

  revalidatePath('/');
  revalidatePath('/accounts');
  revalidatePath('/transactions');
  return result;
}
