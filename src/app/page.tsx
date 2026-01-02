'use client';

import { Suspense } from 'react';
import { DashboardContent } from './DashboardContent';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/lib/contexts/LanguageContext';

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardLoading() {
  const { t } = useLanguage();

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{t('dashboard.loading')}</p>
      </div>
    </div>
  );
}
