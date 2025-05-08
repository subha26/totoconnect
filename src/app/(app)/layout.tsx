
"use client";

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { BottomNav } from '@/components/bottom-nav';
import { Skeleton } from '@/components/ui/skeleton';
import { AppHeader } from '@/components/app-header'; // Import the new AppHeader component

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentUser, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !currentUser) {
      router.replace('/login');
    } else if (!isLoading && currentUser) {
      // Role-based route protection
      const currentBaseRoute = pathname.split('/')[1]; // e.g., "passenger" or "driver"
      if (currentUser.role && currentBaseRoute !== currentUser.role && (currentBaseRoute === 'passenger' || currentBaseRoute === 'driver')) {
         // If user is on a role-specific page that doesn't match their role
         router.replace(currentUser.role === 'driver' ? '/driver/home' : '/passenger/home');
      }
    }
  }, [currentUser, isLoading, router, pathname]);

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <header className="fixed top-0 left-0 right-0 z-40 h-16 bg-card shadow-md flex items-center justify-between px-4 md:px-6">
          <Skeleton className="h-8 w-32" /> {/* Placeholder for App Name */}
          <Skeleton className="h-10 w-10 rounded-full" /> {/* Placeholder for UserProfileDropdown Avatar */}
        </header>
        <main className="flex-grow p-4 pt-20"> {/* pt-16 for header + some space */}
          <Skeleton className="h-24 w-full mb-4" />
          <Skeleton className="h-16 w-full" />
        </main>
        <footer className="h-16 border-t flex justify-around items-center">
          <Skeleton className="h-10 w-10 rounded-md" />
          <Skeleton className="h-10 w-10 rounded-md" />
          <Skeleton className="h-10 w-10 rounded-md" />
        </footer>
      </div>
    );
  }
  
  if (!currentUser) return null; // Or a more specific "Redirecting..." message

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader /> {/* Add the AppHeader here */}
      <main className="flex-grow pb-20 pt-20"> {/* Added pt-20 for AppHeader (h-16) + some space, padding-bottom for BottomNav */}
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
