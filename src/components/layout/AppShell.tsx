'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { Header } from './Header';

interface AppShellProps {
  children: React.ReactNode;
}

// Routes that should NOT show the app shell (sidebar, header, bottom nav)
const PUBLIC_ROUTES = ['/login', '/auth/callback', '/auth/error'];

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();

  // Check if current route is public (no shell needed)
  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith('/auth/')
  );

  // For public routes, just render children without the shell
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // For protected routes, render full dashboard layout
  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="lg:pl-64">
        <Header />
        <main className="pb-20 lg:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <BottomNav />
    </div>
  );
}
