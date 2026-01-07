import { NextRequest, NextResponse } from 'next/server';
import { syncAllActiveIntegrations } from '@/lib/services/integrations/sync-manager';

/**
 * Daily Sync Cron Job
 * Triggered by Vercel Cron at 02:00 AM daily
 *
 * Security: Requires CRON_SECRET in Authorization header
 */
export async function GET(request: NextRequest) {
  // Security: Verify the request is from Vercel Cron
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // Check if CRON_SECRET is configured
  if (!cronSecret) {
    console.error('[Cron] CRON_SECRET environment variable not set');
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }

  // Verify authorization
  if (authHeader !== `Bearer ${cronSecret}`) {
    console.warn('[Cron] Unauthorized cron attempt');
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  console.log('[Cron] Starting daily sync job...');
  const startTime = Date.now();

  try {
    // Execute sync for all active integrations
    const summary = await syncAllActiveIntegrations();

    const duration = Date.now() - startTime;

    console.log(`[Cron] Daily sync completed in ${duration}ms`, {
      total: summary.total,
      success: summary.success,
      failed: summary.failed
    });

    // Return detailed summary
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      summary: {
        total: summary.total,
        success: summary.success,
        failed: summary.failed
      },
      details: summary.results.map(r => ({
        integration: r.integrationName,
        provider: r.provider,
        success: r.success,
        syncedAccounts: r.syncedAccounts,
        error: r.error || null
      }))
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[Cron] Daily sync failed:', error);

    return NextResponse.json({
      success: false,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Vercel Cron configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max for Pro plan
