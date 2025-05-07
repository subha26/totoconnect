
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { ShieldCheck } from 'lucide-react';

export default function VerifyOtpPage() {
  const [otp, setOtp] = useState('');
  // tempPhoneNumberStore is used to display the number, actual verification uses Firebase's session
  const { tempPhoneNumberStore, confirmOtpFromFirebase, isLoading: authIsLoading } = useAuth();
  const [isVerifying, setIsVerifying] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!tempPhoneNumberStore && !authIsLoading) { // Check authIsLoading to prevent premature redirect
      toast({ title: "Verification Error", description: "Please start the signup process again by entering your phone number.", variant: "destructive" });
      router.replace('/signup');
    }
  }, [tempPhoneNumberStore, router, toast, authIsLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6 ) { // Firebase OTP is typically 6 digits
      toast({ title: "Invalid OTP", description: "OTP must be 6 digits.", variant: "destructive" });
      return;
    }
    
    setIsVerifying(true);
    const success = await confirmOtpFromFirebase(otp);

    if (success) {
      toast({ title: "Phone Verified", description: "Your phone number has been successfully verified." });
      router.push('/signup/details');
    } else {
      toast({ title: "Invalid OTP", description: "The OTP you entered is incorrect. Please try again.", variant: "destructive" });
    }
    setIsVerifying(false);
  };

  const isLoading = authIsLoading || isVerifying;

  return (
    <Card className="w-full max-w-md shadow-none border-none">
      <CardHeader className="text-center">
        <ShieldCheck className="mx-auto h-12 w-12 text-primary mb-2" />
        <CardTitle className="text-3xl font-bold">Verify Phone Number</CardTitle>
        <CardDescription>Enter the 6-digit OTP sent to +91{tempPhoneNumberStore || "your phone"}.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="otp">6-Digit OTP</Label>
            <Input
              id="otp"
              type="text" 
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="••••••"
              maxLength={6}
              required
              className="text-2xl tracking-widest text-center"
            />
          </div>
          <Button type="submit" className="w-full text-lg py-3" disabled={isLoading || !tempPhoneNumberStore}>
            {isLoading ? 'Verifying...' : 'Verify OTP'}
          </Button>
        </form>
      </CardContent>
       <CardFooter className="flex flex-col items-center space-y-2">
        <p className="text-sm text-muted-foreground">
          Didn&apos;t receive OTP?{' '}
          <Button variant="link" size="sm" onClick={() => router.back()} disabled={isLoading} className="p-0 h-auto">
            Resend (Go back to re-trigger)
          </Button>
        </p>
         <p className="text-sm text-muted-foreground">
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Back to Login
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
