
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import type { UserRole } from '@/lib/types';
import { Phone, UserCircle2, KeyRound, Users, UserPlus, ShieldQuestion, MessageCircle } from 'lucide-react';
import { APP_NAME, SECURITY_QUESTIONS } from '@/lib/constants';

export default function SignupPage() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [role, setRole] = useState<UserRole>(null);
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const { signup, isLoading: authIsLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneNumber.length !== 10 || !/^\d{10}$/.test(phoneNumber)) {
      toast({ title: "Invalid Phone Number", description: "Please enter a 10-digit phone number.", variant: "destructive" });
      return;
    }
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
    if (!securityQuestion) {
      toast({ title: "Select Security Question", description: "Please select a security question.", variant: "destructive" });
      return;
    }
    if (!securityAnswer.trim()) {
      toast({ title: "Provide Security Answer", description: "Please provide an answer to your security question.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    const success = await signup(phoneNumber, name, pin, role, securityQuestion, securityAnswer.trim());

    if (success) {
      toast({ title: "Signup Successful!", description: `Welcome, ${name}!` });
      // AuthContext handles redirection
    } else {
      toast({ title: "Signup Failed", description: "An error occurred. The phone number might already be registered or there was a server issue.", variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  const isLoading = authIsLoading || isSubmitting;

  return (
    <Card className="w-full max-w-md shadow-none border-none">
      <CardHeader className="text-center">
        <UserPlus className="mx-auto h-12 w-12 text-primary mb-2" />
        <CardTitle className="text-3xl font-bold">Create Account on {APP_NAME}</CardTitle>
        <CardDescription>Enter your details to get started.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="phoneNumber" className="flex items-center">
              <Phone className="mr-2 h-5 w-5 text-primary" />
              Phone Number (10 digits, India)
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

          <div className="space-y-2">
            <Label htmlFor="securityQuestion" className="flex items-center">
              <ShieldQuestion className="mr-2 h-5 w-5 text-primary" />
              Security Question
            </Label>
            <Select value={securityQuestion} onValueChange={setSecurityQuestion}>
              <SelectTrigger id="securityQuestion" className="text-lg">
                <SelectValue placeholder="Select a question" />
              </SelectTrigger>
              <SelectContent>
                {SECURITY_QUESTIONS.map((q, index) => (
                  <SelectItem key={index} value={q}>{q}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="securityAnswer" className="flex items-center">
              <MessageCircle className="mr-2 h-5 w-5 text-primary" />
              Security Answer
            </Label>
            <Input
              id="securityAnswer"
              type="text"
              value={securityAnswer}
              onChange={(e) => setSecurityAnswer(e.target.value)}
              placeholder="Your answer"
              required
              className="text-lg"
            />
          </div>
          
          <Button type="submit" className="w-full text-lg py-3" disabled={isLoading}>
            {isLoading ? 'Creating Account...' : 'Sign Up'}
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
