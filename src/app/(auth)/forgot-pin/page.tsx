
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
import { Phone, ShieldQuestion, KeyRound, MessageCircle, ArrowLeft } from 'lucide-react';
import { APP_NAME } from '@/lib/constants';

type ForgotPinStep = "enterPhone" | "answerQuestion" | "resetPin";

export default function ForgotPinPage() {
  const [step, setStep] = useState<ForgotPinStep>("enterPhone");
  const [phoneNumber, setPhoneNumber] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState<string | null>(null);
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');

  const { isLoading, getUserSecurityQuestion, verifySecurityAnswer, resetPin } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handlePhoneNumberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneNumber.length !== 10 || !/^\d{10}$/.test(phoneNumber)) {
      toast({ title: "Invalid Phone Number", description: "Please enter a 10-digit phone number.", variant: "destructive" });
      return;
    }
    const question = await getUserSecurityQuestion(phoneNumber);
    if (question) {
      setSecurityQuestion(question);
      setStep("answerQuestion");
    } else {
      toast({ title: "Error", description: "Phone number not found or no security question set up for this account.", variant: "destructive" });
    }
  };

  const handleAnswerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!securityAnswer.trim()) {
      toast({ title: "Missing Answer", description: "Please provide your security answer.", variant: "destructive" });
      return;
    }
    const isCorrect = await verifySecurityAnswer(phoneNumber, securityAnswer.trim());
    if (isCorrect) {
      setStep("resetPin");
      toast({ title: "Answer Verified", description: "You can now reset your PIN." });
    } else {
      toast({ title: "Incorrect Answer", description: "The security answer provided is incorrect.", variant: "destructive" });
    }
  };

  const handleResetPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      toast({ title: "Invalid New PIN", description: "New PIN must be 4 digits.", variant: "destructive" });
      return;
    }
    if (newPin !== confirmNewPin) {
      toast({ title: "PINs Don't Match", description: "New PINs do not match.", variant: "destructive" });
      return;
    }
    const success = await resetPin(phoneNumber, newPin);
    if (success) {
      toast({ title: "PIN Reset Successful", description: "You can now login with your new PIN." });
      router.push('/login');
    } else {
      toast({ title: "PIN Reset Failed", description: "An error occurred. Please try again.", variant: "destructive" });
    }
  };

  return (
    <Card className="w-full max-w-md shadow-none border-none">
      <CardHeader className="text-center">
        <KeyRound className="mx-auto h-12 w-12 text-primary mb-2" />
        <CardTitle className="text-3xl font-bold">Forgot PIN</CardTitle>
        <CardDescription>
          {step === "enterPhone" && "Enter your phone number to start the PIN recovery process."}
          {step === "answerQuestion" && "Answer your security question to verify your identity."}
          {step === "resetPin" && "Set a new PIN for your account."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === "enterPhone" && (
          <form onSubmit={handlePhoneNumberSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="phoneNumber" className="flex items-center">
                <Phone className="mr-2 h-5 w-5 text-primary" />
                Registered Phone Number
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
              {isLoading ? 'Processing...' : 'Get Security Question'}
            </Button>
          </form>
        )}

        {step === "answerQuestion" && securityQuestion && (
          <form onSubmit={handleAnswerSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="securityQuestionDisplay" className="flex items-center">
                <ShieldQuestion className="mr-2 h-5 w-5 text-primary" />
                Your Security Question
              </Label>
              <p id="securityQuestionDisplay" className="text-lg p-2 bg-secondary/50 rounded-md">{securityQuestion}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="securityAnswer" className="flex items-center">
                <MessageCircle className="mr-2 h-5 w-5 text-primary" />
                Your Answer
              </Label>
              <Input
                id="securityAnswer"
                type="text"
                value={securityAnswer}
                onChange={(e) => setSecurityAnswer(e.target.value)}
                placeholder="Enter your answer"
                required
                className="text-lg"
              />
            </div>
            <Button type="submit" className="w-full text-lg py-3" disabled={isLoading}>
              {isLoading ? 'Verifying...' : 'Verify Answer'}
            </Button>
          </form>
        )}

        {step === "resetPin" && (
          <form onSubmit={handleResetPinSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="newPin" className="flex items-center">
                <KeyRound className="mr-2 h-5 w-5 text-primary" />
                New 4-Digit PIN
              </Label>
              <Input
                id="newPin"
                type="password"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="••••"
                maxLength={4}
                required
                className="text-lg tracking-widest"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmNewPin" className="flex items-center">
                <KeyRound className="mr-2 h-5 w-5 text-primary" />
                Confirm New PIN
              </Label>
              <Input
                id="confirmNewPin"
                type="password"
                value={confirmNewPin}
                onChange={(e) => setConfirmNewPin(e.target.value)}
                placeholder="••••"
                maxLength={4}
                required
                className="text-lg tracking-widest"
              />
            </div>
            <Button type="submit" className="w-full text-lg py-3" disabled={isLoading}>
              {isLoading ? 'Resetting PIN...' : 'Reset PIN'}
            </Button>
          </form>
        )}
      </CardContent>
      <CardFooter className="flex flex-col items-center space-y-2">
        <Link href="/login" className="font-semibold text-primary hover:underline flex items-center">
           <ArrowLeft className="mr-1 h-4 w-4" /> Back to Login
        </Link>
      </CardFooter>
    </Card>
  );
}
