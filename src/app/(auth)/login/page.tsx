
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Phone, KeyRound, LogIn } from 'lucide-react';
import { APP_NAME } from '@/lib/constants';

export default function LoginPage() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pin, setPin] = useState('');
  const { login, isLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneNumber.length !== 10 || !/^\d{10}$/.test(phoneNumber)) {
      toast({ title: "Invalid Phone Number", description: "Please enter a 10-digit phone number.", variant: "destructive" });
      return;
    }
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      toast({ title: "Invalid PIN", description: "PIN must be 4 digits.", variant: "destructive" });
      return;
    }

    const success = await login(phoneNumber, pin);
    if (!success) {
      toast({ title: "Login Failed", description: "Invalid phone number or PIN.", variant: "destructive" });
    }
    // Redirection is handled by AuthContext
  };

  return (
    <Card className="w-full max-w-md shadow-none border-none">
      <CardHeader className="text-center">
        <LogIn className="mx-auto h-12 w-12 text-primary mb-2" />
        <CardTitle className="text-3xl font-bold">Welcome to {APP_NAME}</CardTitle>
        <CardDescription>Enter your phone number and PIN to access your account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="phoneNumber" className="flex items-center">
              <Phone className="mr-2 h-5 w-5 text-primary" />
              Phone Number (10 digits)
            </Label>
            <Input
              id="phoneNumber"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="9876543210"
              maxLength={10}
              required
              className="text-lg placeholder:text-muted-foreground"
            />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="pin" className="flex items-center">
                <KeyRound className="mr-2 h-5 w-5 text-primary" />
                4-Digit PIN
              </Label>
              <Link href="/forgot-pin" className="text-sm text-primary hover:underline">
                Forgot PIN?
              </Link>
            </div>
            <Input
              id="pin"
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
              maxLength={4}
              required
              className="text-lg tracking-widest placeholder:text-muted-foreground"
            />
          </div>
          <Button type="submit" className="w-full text-lg py-3" disabled={isLoading}>
            {isLoading ? 'Logging In...' : 'Login'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col items-center space-y-2">
        <p className="text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-semibold text-primary hover:underline">
            Sign Up
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
