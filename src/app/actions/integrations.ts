'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Integration, IntegrationMapping, Currency } from '@/types/database';

/**
 * Validates API key and fetches external accounts (for Step 1 of wizard)
 */
export async function validateAndFetchAccounts(provider: string, apiKey: string): Promise<{
  success: boolean;
  error?: string;
  accounts?: Array<{
    id: string;
    name: string;
    balance: number;
    currency: string;
  }>;
}> {
  try {
    switch (provider) {
      case 'trading212': {
        const { fetchTrading212Accounts } = await import('@/lib/services/integrations/trading212');
        const accounts = await fetchTrading212Accounts(apiKey);
        return { success: true, accounts };
      }
      // Add other providers here
      case 'xtb':
        return { success: false, error: 'XTB integration not yet implemented' };
      case 'gocardless':
        return { success: false, error: 'GoCardless uses OAuth, not API key' };
      default:
        return { success: false, error: 'Unknown provider' };
    }
  } catch (error) {
    console.error('Validate API key error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to validate API key',
    };
  }
}

/**
 * Sync integration - fetch fresh data from external API and update mapped accounts
 */
export async function syncIntegration(integrationId: string): Promise<{
  success: boolean;
  error?: string;
  syncedAccounts?: number
}> {
  try {
    const supabase = await createClient();

    // 1. Get user session
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    // 2. Fetch the integration with its credentials
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('*')
      .eq('id', integrationId)
      .eq('user_id', user.id)
      .single();

    if (integrationError || !integration) {
      console.error('Integration fetch error:', integrationError);
      return { success: false, error: 'Integration not found' };
    }

    // 3. Fetch all mappings for this integration
    const { data: mappings, error: mappingsError } = await supabase
      .from('integration_mappings')
      .select('*')
      .eq('integration_id', integrationId);

    if (mappingsError) {
      console.error('Mappings fetch error:', mappingsError);
      return { success: false, error: 'Failed to fetch integration mappings' };
    }

    // 4. Fetch fresh data from external API based on provider
    let externalAccounts;
    try {
      switch (integration.provider) {
        case 'trading212': {
          const { fetchTrading212Accounts } = await import('@/lib/services/integrations/trading212');
          externalAccounts = await fetchTrading212Accounts(integration.api_key);
          break;
        }
        // Add other providers here
        default:
          return { success: false, error: `Unknown provider: ${integration.provider}` };
      }
    } catch (apiError) {
      console.error('External API error:', apiError);
      // Update integration status to error
      await supabase
        .from('integrations')
        .update({
          status: 'error',
          updated_at: new Date().toISOString()
        })
        .eq('id', integrationId);

      return { success: false, error: 'Failed to fetch data from external API' };
    }

    // 5. Update each mapped internal account with fresh balance
    let successCount = 0;
    for (const mapping of mappings || []) {
      const externalAccount = externalAccounts.find((e: { id: string }) => e.id === mapping.external_account_id);
      if (externalAccount) {
        const { error: updateError } = await supabase
          .from('accounts')
          .update({
            balance: externalAccount.balance,
            updated_at: new Date().toISOString()
          })
          .eq('id', mapping.internal_account_id)
          .eq('user_id', user.id);

        if (!updateError) {
          successCount++;
        } else {
          console.error('Account update error:', updateError);
        }
      }
    }

    // 6. Update last_synced_at on integration
    await supabase
      .from('integrations')
      .update({
        last_synced_at: new Date().toISOString(),
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', integrationId);

    // Revalidate relevant paths
    revalidatePath('/');
    revalidatePath('/accounts');
    revalidatePath('/automation');

    return { success: true, syncedAccounts: successCount };
  } catch (error) {
    console.error('syncIntegration: Unexpected error', error);
    return { success: false, error: 'An unexpected error occurred during sync' };
  }
}

/**
 * Create integration with account mappings
 */
export async function createIntegrationWithMappings(data: {
  provider: string;
  name: string;
  apiKey: string;
  mappings: Array<{
    externalAccountId: string;
    externalAccountName: string;
    internalAccountId: string | null;
    newAccountDetails?: {
      name: string;
      categoryId: string | null;
      currency: Currency;
    };
  }>;
}): Promise<{ success: boolean; integrationId?: string; error?: string }> {
  try {
    const supabase = await createClient();

    // 1. Get user session
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    // 2. Create the integration record
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .insert({
        user_id: user.id,
        provider: data.provider,
        name: data.name,
        api_key: data.apiKey,
        status: 'active',
      })
      .select()
      .single();

    if (integrationError || !integration) {
      console.error('Integration creation error:', integrationError);
      return { success: false, error: 'Failed to create integration' };
    }

    // 3. Process each mapping
    const mappingsToCreate = [];

    for (const mapping of data.mappings) {
      let internalAccountId = mapping.internalAccountId;

      // If no internal account ID provided, create new account
      if (!internalAccountId && mapping.newAccountDetails) {
        const { data: newAccount, error: accountError } = await supabase
          .from('accounts')
          .insert({
            user_id: user.id,
            name: mapping.newAccountDetails.name,
            category_id: mapping.newAccountDetails.categoryId,
            currency: mapping.newAccountDetails.currency,
            balance: 0, // Will be synced
            is_investment: true, // Assume integrations are for investment accounts
            interest_rate_pa: 0,
            is_active: true,
          })
          .select()
          .single();

        if (accountError || !newAccount) {
          console.error('Account creation error:', accountError);
          // Continue with other mappings instead of failing completely
          continue;
        }

        internalAccountId = newAccount.id;
      }

      if (internalAccountId) {
        mappingsToCreate.push({
          integration_id: integration.id,
          external_account_id: mapping.externalAccountId,
          external_account_name: mapping.externalAccountName,
          internal_account_id: internalAccountId,
        });
      }
    }

    // 4. Create all mappings
    if (mappingsToCreate.length > 0) {
      const { error: mappingsError } = await supabase
        .from('integration_mappings')
        .insert(mappingsToCreate);

      if (mappingsError) {
        console.error('Mappings creation error:', mappingsError);
        // Integration was created but mappings failed
        // Could clean up the integration here, but leaving it allows retry
        return { success: false, error: 'Failed to create account mappings', integrationId: integration.id };
      }
    }

    // 5. Perform initial sync
    const syncResult = await syncIntegration(integration.id);

    if (!syncResult.success) {
      console.warn('Initial sync failed, but integration was created');
    }

    // Revalidate relevant paths
    revalidatePath('/');
    revalidatePath('/accounts');
    revalidatePath('/automation');

    return { success: true, integrationId: integration.id };
  } catch (error) {
    console.error('createIntegrationWithMappings: Unexpected error', error);
    return { success: false, error: 'An unexpected error occurred while creating integration' };
  }
}

/**
 * Delete integration (mappings cascade delete via FK)
 */
export async function deleteIntegration(integrationId: string): Promise<{
  success: boolean;
  error?: string
}> {
  try {
    const supabase = await createClient();

    // Get user session
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Delete the integration (mappings will cascade delete due to FK constraint)
    const { error: deleteError } = await supabase
      .from('integrations')
      .delete()
      .eq('id', integrationId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Integration deletion error:', deleteError);
      return { success: false, error: 'Failed to delete integration' };
    }

    // Revalidate relevant paths
    revalidatePath('/');
    revalidatePath('/accounts');
    revalidatePath('/automation');

    return { success: true };
  } catch (error) {
    console.error('deleteIntegration: Unexpected error', error);
    return { success: false, error: 'An unexpected error occurred while deleting integration' };
  }
}

/**
 * Get all integrations for the current user
 */
export async function getIntegrations(): Promise<{
  integrations: Integration[];
  error?: string;
}> {
  try {
    const supabase = await createClient();

    // Get user session
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { integrations: [], error: 'Unauthorized' };
    }

    const { data: integrations, error } = await supabase
      .from('integrations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Integrations fetch error:', error);
      return { integrations: [], error: 'Failed to fetch integrations' };
    }

    return { integrations: integrations || [] };
  } catch (error) {
    console.error('getIntegrations: Unexpected error', error);
    return { integrations: [], error: 'An unexpected error occurred' };
  }
}

/**
 * Get integration mappings for a specific integration
 */
export async function getIntegrationMappings(integrationId: string): Promise<{
  mappings: (IntegrationMapping & { account?: { name: string; balance: number; currency: string } })[];
  error?: string;
}> {
  try {
    const supabase = await createClient();

    // Get user session
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { mappings: [], error: 'Unauthorized' };
    }

    // Verify integration ownership
    const { data: integration } = await supabase
      .from('integrations')
      .select('id')
      .eq('id', integrationId)
      .eq('user_id', user.id)
      .single();

    if (!integration) {
      return { mappings: [], error: 'Integration not found' };
    }

    // Fetch mappings with account details
    const { data: mappings, error } = await supabase
      .from('integration_mappings')
      .select(`
        *,
        account:accounts (
          name,
          balance,
          currency
        )
      `)
      .eq('integration_id', integrationId);

    if (error) {
      console.error('Mappings fetch error:', error);
      return { mappings: [], error: 'Failed to fetch mappings' };
    }

    return { mappings: mappings || [] };
  } catch (error) {
    console.error('getIntegrationMappings: Unexpected error', error);
    return { mappings: [], error: 'An unexpected error occurred' };
  }
}

/**
 * Update integration status
 */
export async function updateIntegrationStatus(
  integrationId: string,
  status: 'active' | 'error' | 'expired'
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Get user session
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const { error: updateError } = await supabase
      .from('integrations')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', integrationId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Integration status update error:', updateError);
      return { success: false, error: 'Failed to update integration status' };
    }

    revalidatePath('/automation');

    return { success: true };
  } catch (error) {
    console.error('updateIntegrationStatus: Unexpected error', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
