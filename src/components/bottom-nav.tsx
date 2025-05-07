"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ListCollapse, User, LogOut, Car, Bell, PlusCircle, MessageSquare, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  role?: 'passenger' | 'driver';
}

const commonNavItems: NavItem[] = [
  { href: '/emergency', label: 'Emergency', icon: AlertTriangle },
  { href: '/profile', label: 'Profile', icon: User },
];

const passengerNavItems: NavItem[] = [
  { href: '/passenger/home', label: 'Home', icon: Home, role: 'passenger' },
  { href: '/passenger/rides', label: 'My Rides', icon: ListCollapse, role: 'passenger' },
  ...commonNavItems,
];

const driverNavItems: NavItem[] = [
  { href: '/driver/home', label: 'Home', icon: Car, role: 'driver' },
  { href: '/driver/requests', label: 'Requests', icon: Bell, role: 'driver' },
  { href: '/driver/post-ride', label: 'Post Ride', icon: PlusCircle, role: 'driver' },
  ...commonNavItems,
];


export function BottomNav() {
  const pathname = usePathname();
  const { currentUser, logout } = useAuth();

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
              'flex flex-col items-center justify-center p-2 rounded-md transition-colors',
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
        <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="flex flex-col items-center justify-center p-2 text-muted-foreground hover:text-destructive"
            aria-label="Logout"
          >
            <LogOut className="w-6 h-6" />
            <span className="text-xs mt-1">Logout</span>
          </Button>
      </div>
    </nav>
  );
}
