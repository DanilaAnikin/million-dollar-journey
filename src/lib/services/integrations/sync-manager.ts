// Sync Manager Service - Core integration sync logic
// Can be called from Server Actions, API Routes, or Cron Jobs

import { createClient } from '@/lib/supabase/server';
import { fetchTrading212Accounts } from './trading212';

export interface SyncResult {
  success: boolean;
  integrationId: string;
  integrationName: string;
  provider: string;
  syncedAccounts: number;
  error?: string;
}

/**
 * Core sync logic - can be called from Server Actions or API Routes
 * This function handles the actual sync process for a single integration
 */
export async function executeIntegrationSync(
  integrationId: string,
  userId?: string // Optional - if not provided, will fetch from session
): Promise<SyncResult> {
  const supabase = await createClient();

  // Get user if not provided
  let effectiveUserId = userId;
  if (!effectiveUserId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }
    effectiveUserId = user.id;
  }

  // Fetch integration
  const { data: integration, error: integrationError } = await supabase
    .from('integrations')
    .select('*')
    .eq('id', integrationId)
    .eq('user_id', effectiveUserId)
    .single();

  if (integrationError || !integration) {
    console.error('Integration fetch error:', integrationError);
    return {
      success: false,
      integrationId,
      integrationName: 'Unknown',
      provider: 'unknown',
      syncedAccounts: 0,
      error: 'Integration not found'
    };
  }

  // Fetch mappings
  const { data: mappings, error: mappingsError } = await supabase
    .from('integration_mappings')
    .select('*')
    .eq('integration_id', integrationId);

  if (mappingsError) {
    console.error('Mappings fetch error:', mappingsError);
    return {
      success: false,
      integrationId,
      integrationName: integration.name,
      provider: integration.provider,
      syncedAccounts: 0,
      error: 'Failed to fetch integration mappings'
    };
  }

  // Fetch external data based on provider
  let externalAccounts;
  try {
    switch (integration.provider) {
      case 'trading212':
        externalAccounts = await fetchTrading212Accounts(integration.api_key, integration.is_demo);
        break;
      // Add other providers here
      default:
        return {
          success: false,
          integrationId,
          integrationName: integration.name,
          provider: integration.provider,
          syncedAccounts: 0,
          error: `Unknown provider: ${integration.provider}`
        };
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

    return {
      success: false,
      integrationId,
      integrationName: integration.name,
      provider: integration.provider,
      syncedAccounts: 0,
      error: apiError instanceof Error ? apiError.message : 'Failed to fetch data from external API'
    };
  }

  // Update each mapped account with fresh balance
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
        .eq('user_id', effectiveUserId);

      if (!updateError) {
        successCount++;
      } else {
        console.error('Account update error:', updateError);
      }
    }
  }

  // Update last_synced_at on integration
  await supabase
    .from('integrations')
    .update({
      last_synced_at: new Date().toISOString(),
      status: 'active',
      updated_at: new Date().toISOString()
    })
    .eq('id', integrationId);

  return {
    success: true,
    integrationId,
    integrationName: integration.name,
    provider: integration.provider,
    syncedAccounts: successCount
  };
}

/**
 * Sync all active integrations (for cron jobs)
 * Returns summary of all sync operations
 */
export async function syncAllActiveIntegrations(): Promise<{
  total: number;
  success: number;
  failed: number;
  results: SyncResult[];
}> {
  const supabase = await createClient();

  // Fetch all active integrations (no user filter - admin/cron context)
  const { data: integrations } = await supabase
    .from('integrations')
    .select('id, user_id')
    .eq('status', 'active');

  const results: SyncResult[] = [];

  // Process sequentially to avoid rate limits
  for (const integration of integrations || []) {
    try {
      // Pass userId explicitly for cron context
      const result = await executeIntegrationSync(integration.id, integration.user_id);
      results.push(result);
    } catch (error) {
      console.error(`Failed to sync integration ${integration.id}:`, error);
      results.push({
        success: false,
        integrationId: integration.id,
        integrationName: 'Unknown',
        provider: 'unknown',
        syncedAccounts: 0,
        error: error instanceof Error ? error.message : 'Unexpected error'
      });
    }

    // Small delay between syncs to be nice to external APIs
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return {
    total: results.length,
    success: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results
  };
}
