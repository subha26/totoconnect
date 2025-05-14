
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/auth-context';
import { User, Phone, Briefcase, LogOut, Camera, Edit3, Save, XCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { UserRole } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { format, isSameDay } from 'date-fns';
import type { Timestamp } from 'firebase/firestore';

export default function ProfilePage() {
  const { currentUser, logout, isLoading, changeProfilePicture, updateUserRole, updatePhoneNumber } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [isEditingPhoneNumber, setIsEditingPhoneNumber] = useState(false);
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const [phoneEditError, setPhoneEditError] = useState<string | null>(null);
  const [canUpdatePhoneNumberToday, setCanUpdatePhoneNumberToday] = useState(true);

  useEffect(() => {
    if (currentUser?.phoneNumber) {
      setNewPhoneNumber(currentUser.phoneNumber);
    }
    if (currentUser?.phoneNumberLastUpdatedAt) {
      const lastUpdate = (currentUser.phoneNumberLastUpdatedAt as Timestamp).toDate();
      setCanUpdatePhoneNumberToday(!isSameDay(lastUpdate, new Date()));
    } else {
      setCanUpdatePhoneNumberToday(true);
    }
  }, [currentUser]);


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
    const newRole = newRoleValue as UserRole; 
    if (!currentUser || !newRole) return;
    if (newRole === currentUser.role) return; 

    const success = await updateUserRole(newRole);
    if (success) {
        toast({ title: "Role Updated", description: `You are now a ${newRole}. Your view may update.` });
    } else {
        toast({ title: "Update Failed", description: "Could not update your role.", variant: "destructive" });
    }
  };

  const handleEditPhoneNumber = () => {
    setIsEditingPhoneNumber(true);
    setNewPhoneNumber(currentUser.phoneNumber);
    setPhoneEditError(null);
  };

  const handleCancelEditPhoneNumber = () => {
    setIsEditingPhoneNumber(false);
    setPhoneEditError(null);
  };

  const handleSavePhoneNumber = async () => {
    setPhoneEditError(null);
    if (newPhoneNumber.length !== 10 || !/^\d{10}$/.test(newPhoneNumber)) {
      setPhoneEditError("Phone number must be 10 digits.");
      return;
    }
    if (newPhoneNumber === currentUser.phoneNumber) {
      setIsEditingPhoneNumber(false);
      return;
    }

    const result = await updatePhoneNumber(newPhoneNumber);
    toast({
      title: result.success ? "Success" : "Error",
      description: result.message,
      variant: result.success ? "default" : "destructive",
    });
    if (result.success) {
      setIsEditingPhoneNumber(false);
       if (currentUser?.phoneNumberLastUpdatedAt) { // Re-check after successful update
         const lastUpdate = (currentUser.phoneNumberLastUpdatedAt as Timestamp).toDate();
         setCanUpdatePhoneNumberToday(!isSameDay(lastUpdate, new Date()));
       } else {
         setCanUpdatePhoneNumberToday(false); // Should be false immediately after an update
       }
    } else {
      setPhoneEditError(result.message);
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
          <div className="p-3 bg-secondary/50 rounded-lg">
            <div className="flex items-center space-x-3">
              <Phone className="h-6 w-6 text-primary" />
              <div className="flex-grow">
                  <p className="text-xs text-muted-foreground">Phone Number</p>
                  {!isEditingPhoneNumber ? (
                    <p className="font-semibold text-foreground">{currentUser.phoneNumber}</p>
                  ) : (
                    <Input
                      type="tel"
                      value={newPhoneNumber}
                      onChange={(e) => setNewPhoneNumber(e.target.value)}
                      maxLength={10}
                      className="font-semibold text-foreground h-auto p-0 border-none bg-transparent shadow-none focus:ring-0 focus:ring-offset-0"
                    />
                  )}
              </div>
              {!isEditingPhoneNumber && canUpdatePhoneNumberToday && (
                <Button variant="ghost" size="icon" onClick={handleEditPhoneNumber} title="Edit phone number">
                  <Edit3 className="h-4 w-4 text-primary" />
                </Button>
              )}
            </div>
            {isEditingPhoneNumber && (
              <div className="mt-2 flex space-x-2 justify-end">
                <Button variant="ghost" size="sm" onClick={handleCancelEditPhoneNumber}>
                  <XCircle className="mr-1 h-4 w-4" /> Cancel
                </Button>
                <Button size="sm" onClick={handleSavePhoneNumber} className="bg-accent text-accent-foreground hover:bg-accent/90">
                  <Save className="mr-1 h-4 w-4" /> Save
                </Button>
              </div>
            )}
            {phoneEditError && <p className="text-xs text-destructive mt-1">{phoneEditError}</p>}
            {!canUpdatePhoneNumberToday && !isEditingPhoneNumber && (
              <p className="text-xs text-muted-foreground mt-1">
                Phone number updated today. You can update it again tomorrow.
              </p>
            )}
             {currentUser.phoneNumberLastUpdatedAt && !isEditingPhoneNumber && (
                 <p className="text-xs text-muted-foreground mt-1">
                    Last updated: {format((currentUser.phoneNumberLastUpdatedAt as Timestamp).toDate(), "PPp")}
                 </p>
             )}
          </div>
          
          <div className="flex items-center space-x-3 p-3 bg-secondary/50 rounded-lg">
            <Briefcase className="h-6 w-6 text-primary" />
            <div className="w-full">
                <p className="text-xs text-muted-foreground">Role</p>
                <Select
                    value={currentUser.role || ''} 
                    onValueChange={handleRoleChange}
                >
                    <SelectTrigger 
                        id="role-select" 
                        className="w-full font-semibold border-none bg-transparent p-0 h-auto shadow-none focus:ring-0 focus:ring-offset-0 text-left text-foreground hover:bg-transparent data-[state=open]:bg-transparent"
                    >
                        <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="passenger" className="font-semibold">Passenger</SelectItem>
                        <SelectItem value="driver" className="font-semibold">Driver</SelectItem>
                    </SelectContent>
                </Select>
            </div>
          </div>
          
          <Button onClick={logout} variant="destructive" className="w-full text-lg py-3 mt-4">
            <LogOut className="mr-2 h-5 w-5" /> Logout
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
