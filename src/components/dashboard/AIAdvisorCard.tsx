'use client';

import { useState } from 'react';
import { Sparkles, RefreshCw, Loader2, Copy, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { generateFinancialAdvice } from '@/app/actions/ai';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface AIAdvisorCardProps {
  className?: string;
}

type CardState = 'idle' | 'loading' | 'result' | 'error';

const STORAGE_KEY = 'ai-advisor-last-advice';

interface StoredAdvice {
  advice: string;
  timestamp: number;
}

// Helper to safely get stored advice from localStorage
function getStoredAdvice(): { advice: string; timestamp: Date } | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed: StoredAdvice = JSON.parse(stored);
      // Only use if less than 24 hours old
      const hoursSinceGenerated = (Date.now() - parsed.timestamp) / (1000 * 60 * 60);
      if (hoursSinceGenerated < 24) {
        return { advice: parsed.advice, timestamp: new Date(parsed.timestamp) };
      }
    }
  } catch {
    // Ignore localStorage errors
  }
  return null;
}

export function AIAdvisorCard({ className }: AIAdvisorCardProps) {
  const { t } = useLanguage();

  // Use lazy initialization to load from localStorage
  const [state, setState] = useState<CardState>(() => {
    const stored = getStoredAdvice();
    return stored ? 'result' : 'idle';
  });
  const [advice, setAdvice] = useState<string | null>(() => {
    const stored = getStoredAdvice();
    return stored?.advice ?? null;
  });
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [timestamp, setTimestamp] = useState<Date | null>(() => {
    const stored = getStoredAdvice();
    return stored?.timestamp ?? null;
  });

  const handleAskAI = async () => {
    setState('loading');
    setError(null);

    try {
      const result = await generateFinancialAdvice();

      if (result.success && result.advice) {
        setAdvice(result.advice);
        setTimestamp(new Date());
        setState('result');

        // Save to localStorage
        try {
          const stored: StoredAdvice = {
            advice: result.advice,
            timestamp: Date.now(),
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
        } catch {
          // Ignore localStorage errors
        }
      } else {
        setError(result.error || t('dashboard.aiError'));
        setState('error');
      }
    } catch {
      setError(t('dashboard.aiError'));
      setState('error');
    }
  };

  const handleCopy = async () => {
    if (advice) {
      try {
        await navigator.clipboard.writeText(advice);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Ignore clipboard errors
      }
    }
  };

  const formatTimestamp = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffMins < 1) return t('dashboard.generatedJustNow');
    if (diffMins < 60) return t('dashboard.generatedMinsAgo').replace('{mins}', String(diffMins));
    if (diffHours < 24) return t('dashboard.generatedHoursAgo').replace('{hours}', String(diffHours));
    return t('dashboard.generatedYesterday');
  };

  return (
    <div
      className={cn(
        'rounded-2xl border bg-gradient-to-br from-violet-500/5 via-purple-500/5 to-fuchsia-500/5 dark:from-violet-500/10 dark:via-purple-500/10 dark:to-fuchsia-500/10 border-violet-200/50 dark:border-violet-500/20 overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-6 pb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            'p-3 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/25',
            state === 'loading' && 'animate-pulse'
          )}>
            <Sparkles className={cn(
              'h-5 w-5 text-white',
              state === 'loading' && 'animate-spin'
            )} />
          </div>
          <div>
            <span className="font-semibold block">{t('dashboard.aiAdvisor')}</span>
            <span className="text-sm text-muted-foreground">{t('dashboard.aiDescription')}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 pb-6">
        {/* Idle State */}
        {state === 'idle' && (
          <div className="text-center py-6">
            <p className="text-muted-foreground mb-4 text-sm">
              {t('dashboard.aiIdleMessage')}
            </p>
            <Button
              onClick={handleAskAI}
              className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-violet-500/25"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {t('dashboard.askAI')}
            </Button>
          </div>
        )}

        {/* Loading State */}
        {state === 'loading' && (
          <div className="py-6">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Loader2 className="h-5 w-5 animate-spin text-violet-500" />
              <span className="text-muted-foreground">{t('dashboard.analyzing')}</span>
            </div>
            {/* Skeleton loader for advice */}
            <div className="space-y-2">
              <div className="h-4 bg-violet-200/50 dark:bg-violet-500/20 rounded-full animate-pulse w-full" />
              <div className="h-4 bg-violet-200/50 dark:bg-violet-500/20 rounded-full animate-pulse w-5/6" />
              <div className="h-4 bg-violet-200/50 dark:bg-violet-500/20 rounded-full animate-pulse w-4/6" />
            </div>
          </div>
        )}

        {/* Result State */}
        {state === 'result' && advice && (
          <div className="space-y-4">
            {/* Advice Quote Block */}
            <div className="relative">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-violet-500 to-purple-600 rounded-full" />
              <div className="pl-4 py-1">
                <p className="text-foreground leading-relaxed animate-in fade-in duration-500">
                  {advice}
                </p>
              </div>
            </div>

            {/* Footer with timestamp and actions */}
            <div className="flex items-center justify-between pt-2 border-t border-border/30">
              <span className="text-xs text-muted-foreground">
                {timestamp && formatTimestamp(timestamp)}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="h-8 px-2 text-muted-foreground hover:text-foreground"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAskAI}
                  className="h-8"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  {t('dashboard.regenerate')}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {state === 'error' && (
          <div className="py-6">
            <div className="flex items-center gap-2 text-destructive mb-4">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
            <Button
              onClick={handleAskAI}
              variant="outline"
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('dashboard.tryAgain')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
