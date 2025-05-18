
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
  isCentralButton?: boolean; // Flag for special styling
}

const passengerNavItems: NavItem[] = [
  { href: '/passenger/home', label: 'Home', icon: Home, role: 'passenger' },
  { href: '/passenger/request-ride', label: 'Request', icon: PlusCircle, role: 'passenger', isCentralButton: true },
  { href: '/passenger/rides', label: 'My Rides', icon: ListCollapse, role: 'passenger' },
];

const driverNavItems: NavItem[] = [
  { href: '/driver/home', label: 'Home', icon: Car, role: 'driver' },
  { href: '/driver/requests', label: 'Requests', icon: Bell, role: 'driver' },
  { href: '/driver/post-ride', label: 'Post Ride', icon: PlusCircle, role: 'driver' },
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
        {navItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={cn(
              'flex flex-col items-center justify-center rounded-md transition-colors text-center flex-1 group', // Base styles for all items
              // Active styling: only apply primary text color if NOT the central button and path matches
              pathname === item.href && !item.isCentralButton
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground',
              // Styling for central button vs. other buttons
              item.isCentralButton
                ? 'bg-accent text-accent-foreground hover:bg-accent/90 rounded-lg p-2 h-full' // New central button style
                : 'p-2 h-full' // Regular padding and height for other items
            )}
            aria-current={pathname === item.href ? 'page' : undefined}
          >
            <item.icon className={cn("w-6 h-6", item.isCentralButton ? "text-accent-foreground" : "")} />
            <span className={cn("text-xs mt-1", item.isCentralButton ? "text-accent-foreground font-medium" : "")}>{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
