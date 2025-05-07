"use client";

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/auth-context';
import { User, Phone, Briefcase, LogOut, Edit3 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProfilePage() {
  const { currentUser, logout, isLoading } = useAuth();
  const router = useRouter();

  if (isLoading || !currentUser) {
    return (
      <div className="container mx-auto p-4">
        <Skeleton className="h-10 w-48 mb-6" />
        <Card className="max-w-md mx-auto shadow-xl rounded-xl">
          <CardHeader className="items-center text-center">
            <Skeleton className="h-24 w-24 rounded-full mb-4" />
            <Skeleton className="h-8 w-40 mb-2" />
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-12 w-full mt-4" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  return (
    <div className="container mx-auto p-4">
       <h1 className="text-2xl font-semibold mb-6 text-primary text-center">My Profile</h1>
      <Card className="max-w-md mx-auto shadow-xl rounded-xl">
        <CardHeader className="items-center text-center border-b pb-6">
          <Avatar className="w-24 h-24 mb-4 text-3xl border-2 border-primary">
            <AvatarImage src={`https://i.pravatar.cc/150?u=${currentUser.id}`} alt={currentUser.name} data-ai-hint="user avatar placeholder" />
            <AvatarFallback className="bg-primary text-primary-foreground">{getInitials(currentUser.name)}</AvatarFallback>
          </Avatar>
          <CardTitle className="text-2xl font-bold text-foreground">{currentUser.name}</CardTitle>
          <CardDescription className="text-md text-muted-foreground">
            Your personal account details.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          <div className="flex items-center space-x-3 p-3 bg-secondary/50 rounded-lg">
            <Phone className="h-6 w-6 text-primary" />
            <div>
                <p className="text-xs text-muted-foreground">Phone Number</p>
                <p className="font-medium text-foreground">{currentUser.phoneNumber}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 p-3 bg-secondary/50 rounded-lg">
            <Briefcase className="h-6 w-6 text-primary" />
            <div>
                <p className="text-xs text-muted-foreground">Role</p>
                <p className="font-medium text-foreground capitalize">{currentUser.role}</p>
            </div>
          </div>
          
          {/* Future: Edit Profile Button */}
          {/* <Button variant="outline" className="w-full">
            <Edit3 className="mr-2 h-4 w-4" /> Edit Profile
          </Button> */}

          <Button onClick={logout} variant="destructive" className="w-full text-lg py-3 mt-4">
            <LogOut className="mr-2 h-5 w-5" /> Logout
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
