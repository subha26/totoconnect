
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
  isCentralButton?: boolean;
}

const passengerNavItems: NavItem[] = [
  { href: '/passenger/home', label: 'Home', icon: Home, role: 'passenger' },
  { href: '/passenger/request-ride', label: 'Request', icon: PlusCircle, role: 'passenger', isCentralButton: true },
  { href: '/passenger/rides', label: 'My Rides', icon: ListCollapse, role: 'passenger' },
];

const driverNavItems: NavItem[] = [
  { href: '/driver/home', label: 'Home', icon: Car, role: 'driver' },
  { href: '/driver/post-ride', label: 'Post', icon: PlusCircle, role: 'driver', isCentralButton: true },
  { href: '/driver/requests', label: 'Requests', icon: Bell, role: 'driver' },
];


export function BottomNav() {
  const pathname = usePathname();
  const { currentUser } = useAuth();

  if (!currentUser) {
    return null;
  }

  const navItems = currentUser.role === 'driver' ? driverNavItems : passengerNavItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg z-50">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto px-2">
        {navItems.map((item) => {
          if (item.isCentralButton) {
            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center rounded-full transition-all transform',
                  // Styling for the central button:
                  // w-16 h-16 makes it larger and circular
                  // -mt-6 pulls it upwards, making it overlap the nav bar top edge
                  // bg-primary and text-primary-foreground for color
                  // shadow-xl for a pronounced raised effect
                  'w-16 h-16 -mt-6 bg-primary text-primary-foreground shadow-xl hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-card'
                )}
                aria-current={pathname === item.href ? 'page' : undefined}
              >
                <item.icon className="w-7 h-7" /> 
                <span className="text-xs mt-0.5">{item.label}</span>
              </Link>
            );
          }
          // Styling for other navigation items
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center rounded-md p-2 transition-colors text-center flex-1 h-full group',
                pathname === item.href
                  ? 'text-primary' // Active item color
                  : 'text-muted-foreground hover:text-foreground' // Inactive item color
              )}
              aria-current={pathname === item.href ? 'page' : undefined}
            >
              <item.icon className="w-6 h-6" />
              <span className="text-xs mt-1">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
