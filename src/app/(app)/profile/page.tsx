
"use client";

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/auth-context';
import { User, Phone, Briefcase, LogOut, Camera } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { UserRole } from '@/lib/types';

export default function ProfilePage() {
  const { currentUser, logout, isLoading, changeProfilePicture, updateUserRole } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

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

  const handleChangePicture = async () => {
    if (!currentUser) return;
    await changeProfilePicture();
    toast({ title: "Profile Picture Updated", description: "Your new avatar is being fetched." });
  };

  const handleRoleChange = async (newRoleValue: string) => {
    const newRole = newRoleValue as UserRole; // Cast string from Select to UserRole
    if (!currentUser || !newRole) return;
    if (newRole === currentUser.role) return; 

    const success = await updateUserRole(newRole);
    if (success) {
        toast({ title: "Role Updated", description: `You are now a ${newRole}. Your view may update.` });
        // AppLayout should handle redirection if the current route is no longer valid for the new role.
    } else {
        toast({ title: "Update Failed", description: "Could not update your role.", variant: "destructive" });
    }
  };

  const avatarSrc = `https://i.pravatar.cc/150?u=${currentUser.id}${currentUser.profileImageVersion ? `-${currentUser.profileImageVersion}` : ''}`;

  return (
    <div className="container mx-auto p-4">
       <h1 className="text-2xl font-semibold mb-6 text-primary text-center">My Profile</h1>
      <Card className="max-w-md mx-auto shadow-xl rounded-xl">
        <CardHeader className="items-center text-center border-b pb-6">
          <div className="relative w-24 h-24 mb-4">
            <Avatar className="w-full h-full text-3xl border-2 border-primary">
              <AvatarImage src={avatarSrc} alt={currentUser.name} data-ai-hint="user avatar placeholder" />
              <AvatarFallback className="bg-primary text-primary-foreground">{getInitials(currentUser.name)}</AvatarFallback>
            </Avatar>
            <Button
              variant="outline"
              size="icon"
              className="absolute bottom-0 right-0 rounded-full w-8 h-8 bg-card hover:bg-secondary border-primary/50 hover:border-primary"
              onClick={handleChangePicture}
              title="Change profile picture"
            >
              <Camera className="w-4 h-4 text-primary" />
              <span className="sr-only">Change profile picture</span>
            </Button>
          </div>
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
          
          <div className="space-y-2">
            <Label htmlFor="role-select" className="flex items-center text-xs text-muted-foreground mb-1">
                <Briefcase className="mr-2 h-5 w-5 text-primary" />
                Role
            </Label>
            <Select
                value={currentUser.role || ''} // Ensure value is not null for Select
                onValueChange={handleRoleChange}
            >
                <SelectTrigger id="role-select" className="w-full">
                    <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="passenger">Passenger</SelectItem>
                    <SelectItem value="driver">Driver</SelectItem>
                </SelectContent>
            </Select>
          </div>
          
          <Button onClick={logout} variant="destructive" className="w-full text-lg py-3 mt-4">
            <LogOut className="mr-2 h-5 w-5" /> Logout
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
