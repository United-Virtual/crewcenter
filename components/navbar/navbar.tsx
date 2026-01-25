'use client';

import { ArrowLeft, Menu } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { useAirlineLogo } from '@/components/providers/airline-logo-provider';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useSession } from '@/lib/auth-client';

import { useActiveIndex, useNavItems } from './hooks';
import { MobileMenu } from './mobile-menu';
import { NavTabs } from './nav-tabs';
import { NavbarUser } from './navbar-user';
import type { NavbarProps } from './types';

export default function Navbar({ basePath = '' }: NavbarProps) {
  const pathname = usePathname() || '/';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: session } = useSession();

  const isAdminRoute = pathname.startsWith('/admin');
  const userRoles =
    (session?.user as { role?: string[] | string | null })?.role || null;
  const navItems = useNavItems(basePath, userRoles, isAdminRoute);
  const activeIndex = useActiveIndex(navItems, pathname, basePath);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/75 backdrop-blur supports-backdrop-filter:bg-background/80">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden -ml-2"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-[280px] sm:w-[320px] p-0 border-r-0 [&>button]:hidden"
          >
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <MobileMenu
              items={navItems}
              pathname={pathname}
              onClose={() => setMobileMenuOpen(false)}
              isAdminRoute={isAdminRoute}
            />
          </SheetContent>
        </Sheet>

        <Link
          href="/"
          aria-label="Home"
          className="flex items-center gap-3 rounded-md pr-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <img
            src={useAirlineLogo('light')}
            alt="Airline Logo (light)"
            width="auto"
            height={32}
            className="h-8 object-contain block dark:hidden shrink-0"
          />
          <img
            src={useAirlineLogo('dark')}
            alt="Airline Logo (dark)"
            width="auto"
            height={32}
            className="h-8 object-contain hidden dark:block shrink-0"
          />
        </Link>

        {isAdminRoute && (
          <Button variant="ghost" size="sm" asChild className="lg:hidden">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Pilot
            </Link>
          </Button>
        )}

        <div className="relative hidden flex-1 lg:block">
          <NavTabs
            items={navItems}
            pathname={pathname}
            activeIndex={activeIndex}
            isAdminRoute={isAdminRoute}
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <NavbarUser />
        </div>
      </div>
    </header>
  );
}
