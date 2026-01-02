'use client';

import { useEffect, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from '@/components/auth/UserMenu';
import { createClient } from '@/lib/supabase/client';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { useCurrency } from '@/lib/contexts/CurrencyContext';
import { updateProfile } from '@/app/actions/settings';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { User } from '@supabase/supabase-js';
import type { Currency } from '@/types/database';

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  const { t, language, setLanguage } = useLanguage();
  const { currency, setCurrency } = useCurrency();
  const [user, setUser] = useState<User | null>(null);
  const displayTitle = title || t('nav.dashboard');
  const supabase = createClient();

  async function handleCurrencyChange(newCurrency: string) {
    setCurrency(newCurrency as Currency);
    await updateProfile({ preferredCurrency: newCurrency as Currency });
  }

  useEffect(() => {
    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user?.email) return '?';
    return user.email.charAt(0).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="flex items-center justify-between h-14 px-4 lg:px-6">
        {/* Mobile Logo */}
        <div className="flex items-center gap-2.5 lg:hidden">
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-primary/10">
            <TrendingUp className="h-5 w-5 text-primary" strokeWidth={1.5} />
          </div>
          <span className="font-semibold text-foreground tracking-tight">MDJ</span>
        </div>

        {/* Page Title (Desktop) */}
        <h1 className="hidden lg:block text-lg font-semibold tracking-tight text-foreground">
          {displayTitle}
        </h1>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          {/* Language Switcher */}
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="min-w-[60px] w-auto h-8 text-xs font-medium rounded-xl border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="min-w-[140px] rounded-xl">
              <SelectItem value="en" className="rounded-lg whitespace-nowrap">EN - English</SelectItem>
              <SelectItem value="cs" className="rounded-lg whitespace-nowrap">CS - Cestina</SelectItem>
            </SelectContent>
          </Select>

          {/* Currency Switcher */}
          <Select value={currency} onValueChange={handleCurrencyChange}>
            <SelectTrigger className="min-w-[70px] w-auto h-8 text-xs font-medium rounded-xl border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="min-w-[140px] rounded-xl">
              <SelectItem value="CZK" className="rounded-lg whitespace-nowrap">CZK - Czech Koruna</SelectItem>
              <SelectItem value="USD" className="rounded-lg whitespace-nowrap">USD - US Dollar</SelectItem>
              <SelectItem value="EUR" className="rounded-lg whitespace-nowrap">EUR - Euro</SelectItem>
            </SelectContent>
          </Select>

          <ThemeToggle />

          {/* User Avatar Menu */}
          <UserMenu
            user={user}
            avatarContent={
              user ? (
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-xs font-semibold transition-transform hover:scale-105 cursor-pointer">
                  {getUserInitials()}
                </div>
              ) : undefined
            }
          />
        </div>
      </div>
    </header>
  );
}
