// Seed utilities for Million Dollar Journey
// These can be called from API routes or scripts

import { supabase } from './supabase';
import type { AccountCategory, Account } from '@/types/database';

export const DEFAULT_CATEGORIES: Omit<AccountCategory, 'id' | 'user_id' | 'created_at' | 'updated_at'>[] = [
  { name: 'Stocks & ETFs', type: 'asset', icon: 'trending-up', color: '#10B981', sort_order: 1 },
  { name: 'Crypto', type: 'asset', icon: 'bitcoin', color: '#F59E0B', sort_order: 2 },
  { name: 'Savings Accounts', type: 'asset', icon: 'piggy-bank', color: '#3B82F6', sort_order: 3 },
  { name: 'Cash', type: 'asset', icon: 'wallet', color: '#6366F1', sort_order: 4 },
  { name: 'Real Estate', type: 'asset', icon: 'home', color: '#8B5CF6', sort_order: 5 },
  { name: 'Retirement', type: 'asset', icon: 'landmark', color: '#EC4899', sort_order: 6 },
  { name: 'Loans', type: 'liability', icon: 'credit-card', color: '#EF4444', sort_order: 10 },
  { name: 'Mortgage', type: 'liability', icon: 'home', color: '#DC2626', sort_order: 11 },
];

export const DEFAULT_MILESTONES = [
  { name: 'First $1,000', target_amount_usd: 1000 },
  { name: 'First $10,000', target_amount_usd: 10000 },
  { name: 'First $50,000', target_amount_usd: 50000 },
  { name: 'First $100,000', target_amount_usd: 100000 },
  { name: 'Quarter Million', target_amount_usd: 250000 },
  { name: 'Half Million', target_amount_usd: 500000 },
  { name: 'Three Quarters', target_amount_usd: 750000 },
  { name: 'MILLIONAIRE!', target_amount_usd: 1000000 },
];

/**
 * Seeds default categories for a new user
 */
export async function seedUserCategories(userId: string): Promise<void> {
  const categories = DEFAULT_CATEGORIES.map(cat => ({
    ...cat,
    user_id: userId,
  }));

  const { error } = await supabase
    .from('account_categories')
    .upsert(categories, { onConflict: 'user_id,name' });

  if (error) {
    console.error('Error seeding categories:', error);
    throw error;
  }
}

/**
 * Seeds default milestones for a new user
 */
export async function seedUserMilestones(userId: string): Promise<void> {
  const milestones = DEFAULT_MILESTONES.map(m => ({
    ...m,
    user_id: userId,
  }));

  const { error } = await supabase
    .from('milestones')
    .insert(milestones);

  if (error) {
    console.error('Error seeding milestones:', error);
    throw error;
  }
}

/**
 * Complete onboarding seed for new user
 */
export async function seedNewUser(userId: string): Promise<void> {
  await Promise.all([
    seedUserCategories(userId),
    seedUserMilestones(userId),
  ]);
}
