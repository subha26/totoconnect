"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ListCollapse, Car, Bell, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  role?: 'passenger' | 'driver';
}

// Common nav items are removed as Emergency and Profile are no longer in bottom nav
const commonNavItems: NavItem[] = [];

const passengerNavItems: NavItem[] = [
  { href: '/passenger/home', label: 'Home', icon: Home, role: 'passenger' },
  { href: '/passenger/rides', label: 'My Rides', icon: ListCollapse, role: 'passenger' },
  // ...commonNavItems, // No longer spreading commonNavItems
];

const driverNavItems: NavItem[] = [
  { href: '/driver/home', label: 'Home', icon: Car, role: 'driver' },
  { href: '/driver/requests', label: 'Requests', icon: Bell, role: 'driver' },
  { href: '/driver/post-ride', label: 'Post Ride', icon: PlusCircle, role: 'driver' },
  // ...commonNavItems, // No longer spreading commonNavItems
];


export function BottomNav() {
  const pathname = usePathname();
  const { currentUser } = useAuth();

  if (!currentUser) {
    return null; // Don't show nav if not logged in (e.g. on login/signup pages)
  }
  
  const navItems = currentUser.role === 'driver' ? driverNavItems : passengerNavItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg z-50">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto px-2">
        {navItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={cn(
              'flex flex-col items-center justify-center p-2 rounded-md transition-colors w-1/3 text-center', // Ensure items spread out
              pathname === item.href
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
            aria-current={pathname === item.href ? 'page' : undefined}
          >
            <item.icon className="w-6 h-6" />
            <span className="text-xs mt-1">{item.label}</span>
          </Link>
        ))}
        {/* Logout button removed */}
      </div>
    </nav>
  );
}
