'use client';

import { useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { User, LogOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { createClient } from '@/lib/supabase/client';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface UserMenuProps {
  user: SupabaseUser | null;
  avatarContent?: ReactNode;
}

export function UserMenu({ user, avatarContent }: UserMenuProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const { t } = useLanguage();

  const handleSignOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  if (!user) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={() => router.push('/login')}
        className="rounded-full hover:bg-muted/50 transition-colors"
      >
        {avatarContent || <User className="h-5 w-5" strokeWidth={1.5} />}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-full hover:bg-transparent p-0 h-auto w-auto"
        >
          {avatarContent || (
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted hover:bg-muted/80 transition-colors">
              <User className="h-4 w-4" strokeWidth={1.5} />
            </div>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-xl border-border/50">
        <DropdownMenuLabel className="px-3 py-2">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-semibold">{t('auth.account')}</p>
            <p className="text-xs text-muted-foreground truncate">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border/50" />
        <DropdownMenuItem
          onClick={handleSignOut}
          disabled={loading}
          className="text-destructive focus:text-destructive focus:bg-destructive/10 rounded-lg mx-1 mb-1 cursor-pointer"
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="mr-2 h-4 w-4" strokeWidth={1.5} />
          )}
          {t('auth.signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
