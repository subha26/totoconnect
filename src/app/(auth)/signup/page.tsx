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
import { Phone, UserPlus } from 'lucide-react';
import { APP_NAME } from '@/lib/constants';
import { sendOtp as mockSendOtp } from '@/services/sms'; // Mocked

export default function SignupPage() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const { setTempPhoneNumber, isLoading: authIsLoading } = useAuth();
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneNumber.length !== 10 || !/^\d{10}$/.test(phoneNumber)) {
      toast({ title: "Invalid Phone Number", description: "Please enter a 10-digit phone number.", variant: "destructive" });
      return;
    }

    setIsSendingOtp(true);
    // In a real app, you'd call your backend to send OTP via SMS
    const otpSent = await mockSendOtp(phoneNumber, "1234"); // Mock: always sends "1234"

    if (otpSent) {
      setTempPhoneNumber(phoneNumber);
      toast({ title: "OTP Sent", description: `An OTP has been sent to ${phoneNumber}. (Mock: 1234)` });
      router.push('/signup/verify-otp');
    } else {
      toast({ title: "Failed to Send OTP", description: "Please try again.", variant: "destructive" });
    }
    setIsSendingOtp(false);
  };

  const isLoading = authIsLoading || isSendingOtp;

  return (
    <Card className="w-full max-w-md shadow-none border-none">
      <CardHeader className="text-center">
        <UserPlus className="mx-auto h-12 w-12 text-primary mb-2" />
        <CardTitle className="text-3xl font-bold">Create Account on {APP_NAME}</CardTitle>
        <CardDescription>Enter your phone number to get started. We&apos;ll send you an OTP to verify.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="phoneNumber" className="flex items-center">
              <Phone className="mr-2 h-5 w-5 text-primary" />
              Phone Number
            </Label>
            <Input
              id="phoneNumber"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="10-digit mobile number"
              maxLength={10}
              required
              className="text-lg"
            />
          </div>
          <Button type="submit" className="w-full text-lg py-3" disabled={isLoading}>
            {isLoading ? 'Sending OTP...' : 'Send OTP'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col items-center space-y-2">
        <p className="text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Login
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
