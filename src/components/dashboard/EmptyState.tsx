'use client';

import { TrendingUp, Plus, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/contexts/LanguageContext';

export function EmptyState() {
  const { t } = useLanguage();
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6">
          <div className="text-center space-y-6">
            {/* Icon */}
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>

            {/* Title & Description */}
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">{t('dashboard.welcomeTitle')}</h2>
              <p className="text-muted-foreground">
                {t('dashboard.welcomeSubtitle')}
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 py-4 border-y">
              <div>
                <p className="text-2xl font-bold text-primary">$1M</p>
                <p className="text-xs text-muted-foreground">{t('dashboard.target')}</p>
              </div>
              <div>
                <p className="text-2xl font-bold">2036</p>
                <p className="text-xs text-muted-foreground">{t('dashboard.targetYear')}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <Button asChild className="w-full">
                <Link href="/accounts" className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  {t('accounts.addFirstAccount')}
                </Link>
              </Button>
              <Button variant="outline" asChild className="w-full">
                <Link href="/settings" className="flex items-center gap-2">
                  {t('settings.configure')}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
