
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import type { UserRole } from '@/lib/types';
import { UserCircle2, KeyRound, Users, CheckCircle } from 'lucide-react';

export default function SignupDetailsPage() {
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [role, setRole] = useState<UserRole>(null);
  const { tempPhoneNumberStore, firebaseUser, signupDetails, isLoading: authIsLoading } = useAuth(); // Use tempPhoneNumberStore and firebaseUser
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    // User should have been authenticated by Firebase (firebaseUser exists)
    // and tempPhoneNumberStore should be set from the OTP step.
    if (!authIsLoading && (!firebaseUser || !tempPhoneNumberStore)) {
      toast({ title: "Signup Error", description: "Phone verification incomplete. Please start over.", variant: "destructive" });
      router.replace('/signup');
    }
  }, [firebaseUser, tempPhoneNumberStore, router, toast, authIsLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: "Invalid Name", description: "Please enter your name.", variant: "destructive" });
      return;
    }
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      toast({ title: "Invalid PIN", description: "PIN must be 4 digits.", variant: "destructive" });
      return;
    }
    if (pin !== confirmPin) {
      toast({ title: "PINs Don't Match", description: "Please ensure both PINs are the same.", variant: "destructive" });
      return;
    }
    if (!role) {
      toast({ title: "Select Role", description: "Please select if you are a Passenger or Driver.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    const success = await signupDetails(name, pin, role);

    if (success) {
      toast({ title: "Signup Successful!", description: `Welcome, ${name}!` });
      // AuthContext handles redirection
    } else {
      toast({ title: "Signup Failed", description: "An error occurred. Please try again. The phone number might already be registered.", variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  const isLoading = authIsLoading || isSubmitting;

  if (!firebaseUser || !tempPhoneNumberStore) {
      return ( 
        <div className="flex items-center justify-center min-h-screen">
            <p>Loading user data or redirecting...</p>
        </div>
      )
  }

  return (
    <Card className="w-full max-w-md shadow-none border-none">
      <CardHeader className="text-center">
        <CheckCircle className="mx-auto h-12 w-12 text-primary mb-2" />
        <CardTitle className="text-3xl font-bold">Complete Your Profile</CardTitle>
        <CardDescription>Just a few more details for +91{tempPhoneNumberStore}.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center">
              <UserCircle2 className="mr-2 h-5 w-5 text-primary" />
              Full Name
            </Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              required
              className="text-lg"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pin" className="flex items-center">
              <KeyRound className="mr-2 h-5 w-5 text-primary" />
              Set 4-Digit PIN
            </Label>
            <Input
              id="pin"
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
              maxLength={4}
              required
              className="text-lg tracking-widest"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPin" className="flex items-center">
              <KeyRound className="mr-2 h-5 w-5 text-primary" />
             Confirm 4-Digit PIN
            </Label>
            <Input
              id="confirmPin"
              type="password"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value)}
              placeholder="••••"
              maxLength={4}
              required
              className="text-lg tracking-widest"
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center mb-2">
                <Users className="mr-2 h-5 w-5 text-primary" />
                I am a...
            </Label>
            <RadioGroup
              value={role || undefined}
              onValueChange={(value) => setRole(value as UserRole)}
              className="flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="passenger" id="role-passenger" />
                <Label htmlFor="role-passenger" className="text-lg">Passenger</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="driver" id="role-driver" />
                <Label htmlFor="role-driver" className="text-lg">Driver</Label>
              </div>
            </RadioGroup>
          </div>
          <Button type="submit" className="w-full text-lg py-3" disabled={isLoading}>
            {isLoading ? 'Creating Account...' : 'Complete Signup'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center">
         <p className="text-sm text-muted-foreground">
            This completes your registration.
        </p>
      </CardFooter>
    </Card>
  );
}
