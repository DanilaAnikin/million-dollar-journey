import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { LanguageProvider } from '@/lib/contexts/LanguageContext';
import { CurrencyProvider } from '@/lib/contexts/CurrencyContext';
import { AppShell } from '@/components/layout/AppShell';
import { createClient } from '@/lib/supabase/server';
import type { Currency } from '@/types/database';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Million Dollar Journey',
  description: 'Track your journey to $1,000,000 by October 31, 2036',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fetch user's preferred currency on server
  let initialCurrency: Currency = 'CZK'; // Default to CZK

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (user) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('preferred_currency')
        .eq('id', user.id)
        .single();

      if (profile?.preferred_currency) {
        initialCurrency = profile.preferred_currency as Currency;
      }
    }
  } catch (error) {
    console.error('RootLayout: Error fetching currency preference:', error);
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <LanguageProvider defaultLanguage="en">
            <CurrencyProvider initialCurrency={initialCurrency}>
              <AppShell>
                {children}
              </AppShell>
              <Toaster richColors position="top-center" />
            </CurrencyProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
