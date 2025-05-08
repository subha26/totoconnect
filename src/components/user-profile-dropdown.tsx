
"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, LogOut } from 'lucide-react';
import type { User as AuthUser } from '@/lib/types';

const getInitials = (name: string = "") => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
};

export function UserProfileDropdown() {
  const { currentUser, logout } = useAuth();
  const router = useRouter();

  if (!currentUser) {
    return null;
  }

  const handleProfileClick = () => {
    router.push('/profile');
  };

  const handleLogoutClick = () => {
    logout();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="rounded-full w-10 h-10 p-0">
          <Avatar className="w-9 h-9">
            <AvatarImage 
              src={`https://i.pravatar.cc/150?u=${currentUser.id}`} 
              alt={currentUser.name} 
              data-ai-hint="user avatar placeholder" 
            />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {getInitials(currentUser.name)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 z-50">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none text-foreground">{currentUser.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {currentUser.phoneNumber}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleProfileClick} className="cursor-pointer">
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogoutClick} className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
