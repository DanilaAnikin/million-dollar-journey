'use client';

import { LucideIcon, CheckCircle2, Circle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useClientDate } from '@/lib/hooks/useClientDate';

export interface IntegrationCardProps {
  name: string;
  icon?: LucideIcon;
  logo?: React.ComponentType<{ className?: string; size?: number }>;
  description: string;
  status: 'connected' | 'disconnected';
  onConnect: () => void;
  onDisconnect?: () => void;
  disabled?: boolean;
  comingSoon?: boolean;
  badge?: 'official' | 'community';
  lastSynced?: string | null;
}

export function IntegrationCard({
  name,
  icon: Icon,
  logo: Logo,
  description,
  status,
  onConnect,
  onDisconnect,
  disabled = false,
  comingSoon = false,
  badge,
  lastSynced,
}: IntegrationCardProps) {
  const isConnected = status === 'connected';

  // Use client-side only date formatting to avoid hydration mismatch
  const lastSyncedStr = useClientDate(lastSynced, 'Never');

  return (
    <Card className={cn(
      'transition-all hover:shadow-md',
      disabled && 'opacity-60'
    )}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className={cn(
              'flex items-center justify-center shrink-0',
              Logo ? '' : 'rounded-xl p-2.5',
              !Logo && (isConnected ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground')
            )}>
              {Logo ? (
                <Logo size={32} className="rounded-lg" />
              ) : Icon ? (
                <Icon className="h-5 w-5" />
              ) : null}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-base">{name}</CardTitle>
                {badge === 'official' && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-500">
                    Official Partner
                  </span>
                )}
                {badge === 'community' && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-500">
                    Community
                  </span>
                )}
                {comingSoon && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                    Soon
                  </span>
                )}
              </div>
              <CardDescription className="mt-1.5">{description}</CardDescription>
            </div>
          </div>

          {/* Status Indicator */}
          <div className="shrink-0">
            {isConnected ? (
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-xs font-medium">Connected</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Circle className="h-4 w-4" />
                <span className="text-xs font-medium">Not Connected</span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isConnected ? (
          <div className="space-y-3">
            {/* Last synced info - client-side rendered to avoid hydration mismatch */}
            <p className="text-xs text-muted-foreground">
              Last synced: {lastSyncedStr}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onDisconnect}
                disabled={disabled}
                className="flex-1"
              >
                Disconnect
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onConnect}
                disabled={disabled}
              >
                Reconfigure
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="default"
            size="sm"
            onClick={onConnect}
            disabled={disabled || comingSoon}
            className="w-full"
          >
            {comingSoon ? 'Coming Soon' : 'Connect'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
