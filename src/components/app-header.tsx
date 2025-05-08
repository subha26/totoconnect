
"use client";

import Link from 'next/link';
import { UserProfileDropdown } from '@/components/user-profile-dropdown';
import { APP_NAME } from '@/lib/constants';

export function AppHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-16 bg-card shadow-md flex items-center justify-between px-4 md:px-6">
      <Link href="/" className="text-xl font-bold text-primary hover:text-primary/90 transition-colors">
        {APP_NAME}
      </Link>
      <UserProfileDropdown />
    </header>
  );
}
