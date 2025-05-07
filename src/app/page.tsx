"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Skeleton } from '@/components/ui/skeleton';

export default function HomePage() {
  const { currentUser, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (currentUser) {
        if (currentUser.role === 'driver') {
          router.replace('/driver/home');
        } else {
          router.replace('/passenger/home');
        }
      } else {
        router.replace('/login');
      }
    }
  }, [currentUser, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
        <Skeleton className="w-32 h-8 mb-4" />
        <Skeleton className="w-48 h-4" />
      </div>
    );
  }

  return null; // Or a minimal loading state until redirect happens
}
