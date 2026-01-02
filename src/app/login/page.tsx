'use client';

import { TrendingUp } from 'lucide-react';
import { AuthForm } from '@/components/auth';
import { useLanguage } from '@/lib/contexts/LanguageContext';

export default function LoginPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-background to-muted/20">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-8">
        <TrendingUp className="h-10 w-10 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">{t('auth.appTitle')}</h1>
          <p className="text-sm text-muted-foreground">{t('auth.appSubtitle')}</p>
        </div>
      </div>

      {/* Auth Form */}
      <AuthForm />

      {/* Footer */}
      <p className="mt-8 text-sm text-muted-foreground text-center">
        {t('auth.targetInfo')}
      </p>
    </div>
  );
}
