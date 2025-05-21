
"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/auth-context';
import { User, Phone, Briefcase, LogOut, Camera, Edit3, Save, XCircle, KeyRound, ShieldQuestion, MessageCircle, UploadCloud } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { UserRole } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format, isSameDay } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { SECURITY_QUESTIONS } from '@/lib/constants';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
// Image import from 'next/image' might not be needed if using AvatarImage with Data URI directly.

export default function ProfilePage() {
  const { currentUser, logout, isLoading, changeProfilePicture, updateUserRole, updatePhoneNumber, changePin, updateSecurityQA } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null); // For Base64 preview

  const [isEditingPhoneNumber, setIsEditingPhoneNumber] = useState(false);
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const [phoneEditError, setPhoneEditError] = useState<string | null>(null);
  const [canUpdatePhoneNumberToday, setCanUpdatePhoneNumberToday] = useState(true);

  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [isChangingPin, setIsChangingPin] = useState(false);

  const [currentSecurityQuestion, setCurrentSecurityQuestion] = useState('');
  const [newSecurityQuestion, setNewSecurityQuestion] = useState('');
  const [newSecurityAnswer, setNewSecurityAnswer] = useState('');
  const [pinForSecurityUpdate, setPinForSecurityUpdate] = useState('');
  const [isUpdatingSecurity, setIsUpdatingSecurity] = useState(false);


  useEffect(() => {
    if (currentUser) {
      setNewPhoneNumber(currentUser.phoneNumber);
      if (currentUser.phoneNumberLastUpdatedAt && currentUser.phoneNumberLastUpdatedAt instanceof Timestamp) {
        const lastUpdate = currentUser.phoneNumberLastUpdatedAt.toDate();
        setCanUpdatePhoneNumberToday(!isSameDay(lastUpdate, new Date()));
      } else {
        setCanUpdatePhoneNumberToday(true);
      }
      setCurrentSecurityQuestion(currentUser.securityQuestion || "Not set");
      setNewSecurityQuestion(currentUser.securityQuestion || '');
      if (currentUser.profilePictureDataUrl) {
        setPreviewUrl(currentUser.profilePictureDataUrl); // Set preview if already exists
      } else {
        setPreviewUrl(null); // Clear preview if no image
      }
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
            <Skeleton className="h-24 w-full mt-4" />
            <Skeleton className="h-24 w-full mt-4" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  const handleChoosePictureClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Basic client-side validation (optional, but good practice)
      if (!file.type.startsWith('image/')) {
        toast({ title: "Invalid File", description: "Please select an image file.", variant: "destructive" });
        return;
      }
      const MAX_FILE_SIZE_KB = 200; // Match context limit for user feedback
      if (file.size > MAX_FILE_SIZE_KB * 1024) {
          toast({ title: "Image Too Large", description: `Please select an image smaller than ${MAX_FILE_SIZE_KB}KB.`, variant: "destructive" });
          return;
      }

      setSelectedFile(file);
      // Generate a preview URL for the selected file (Base64)
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
    event.target.value = '';
  };

  const handleUploadPicture = async () => {
    if (!selectedFile || !currentUser) {
      toast({ title: "No File Selected", description: "Please choose an image first.", variant: "destructive" });
      return;
    }
    const success = await changeProfilePicture(selectedFile); // This now handles Base64
    if (success) {
      toast({ title: "Profile Picture Updated!", description: "Your new picture is now set." });
      // No need to clear selectedFile or previewUrl here, as currentUser update will re-render
    } else {
      // Toast for failure is handled in AuthContext, but you could add specific UI feedback if needed
    }
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
       if (currentUser?.phoneNumberLastUpdatedAt && currentUser.phoneNumberLastUpdatedAt instanceof Timestamp) {
         const lastUpdate = currentUser.phoneNumberLastUpdatedAt.toDate();
         setCanUpdatePhoneNumberToday(!isSameDay(lastUpdate, new Date()));
       } else {
         setCanUpdatePhoneNumberToday(false);
       }
    } else {
      setPhoneEditError(result.message);
    }
  };

  const handleChangePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      toast({ title: "Invalid New PIN", description: "New PIN must be 4 digits.", variant: "destructive" });
      return;
    }
    if (newPin !== confirmNewPin) {
      toast({ title: "PINs Don't Match", description: "New PINs do not match.", variant: "destructive" });
      return;
    }
    setIsChangingPin(true);
    const result = await changePin(oldPin, newPin);
    toast({
      title: result.success ? "PIN Changed" : "Error",
      description: result.message,
      variant: result.success ? "default" : "destructive",
    });
    if (result.success) {
      setOldPin('');
      setNewPin('');
      setConfirmNewPin('');
    }
    setIsChangingPin(false);
  };

  const handleUpdateSecurityQASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSecurityQuestion) {
      toast({ title: "Missing Question", description: "Please select a security question.", variant: "destructive" });
      return;
    }
    if (!newSecurityAnswer.trim()) {
      toast({ title: "Missing Answer", description: "Please provide an answer to the security question.", variant: "destructive" });
      return;
    }
    if (pinForSecurityUpdate.length !== 4 || !/^\d{4}$/.test(pinForSecurityUpdate)) {
      toast({ title: "Invalid PIN", description: "Please enter your current 4-digit PIN to confirm.", variant: "destructive" });
      return;
    }
    setIsUpdatingSecurity(true);
    const result = await updateSecurityQA(pinForSecurityUpdate, newSecurityQuestion, newSecurityAnswer.trim());
    toast({
      title: result.success ? "Security Info Updated" : "Error",
      description: result.message,
      variant: result.success ? "default" : "destructive",
    });
    if (result.success) {
      setCurrentSecurityQuestion(newSecurityQuestion);
      setPinForSecurityUpdate('');
      setNewSecurityAnswer('');
    }
    setIsUpdatingSecurity(false);
  };

  // Use previewUrl if selected, otherwise currentUser.profilePictureDataUrl, then fallback to pravatar
  const avatarDisplaySrc = previewUrl || currentUser.profilePictureDataUrl || `https://i.pravatar.cc/150?u=${currentUser.id}`;

  return (
    <div className="container mx-auto p-4">
       <h1 className="text-2xl font-semibold mb-6 text-primary text-center">My Profile</h1>
      <Card className="max-w-md mx-auto shadow-xl rounded-xl">
        <CardHeader className="items-center text-center border-b pb-6">
          <div className="relative w-24 h-24 mb-4">
            <Avatar className="w-full h-full text-3xl border-2 border-primary">
              <AvatarImage src={avatarDisplaySrc} alt={currentUser.name} data-ai-hint="user avatar placeholder"/>
              <AvatarFallback className="bg-primary text-primary-foreground">{getInitials(currentUser.name)}</AvatarFallback>
            </Avatar>
            <Button
              variant="outline"
              size="icon"
              className="absolute bottom-0 right-0 rounded-full w-8 h-8 bg-card hover:bg-secondary border-primary/50 hover:border-primary"
              onClick={handleChoosePictureClick}
              title="Choose profile picture"
            >
              <Camera className="w-4 h-4 text-primary" />
            </Button>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelected}
                accept="image/*"
                className="hidden"
            />
          </div>
          {selectedFile && previewUrl && ( // Only show upload button if a file is selected AND a preview (which means selection was successful) is available
            <div className="flex flex-col items-center space-y-2 mb-2">
                <p className="text-xs text-muted-foreground">Selected: {selectedFile.name}</p>
                <Button onClick={handleUploadPicture} size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
                    <UploadCloud className="mr-2 h-4 w-4" /> Upload & Save
                </Button>
            </div>
          )}
          <CardTitle className="text-2xl font-bold text-foreground">{currentUser.name}</CardTitle>
          <CardDescription className="text-md text-muted-foreground">
            Your personal account details and security settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="p-3 bg-secondary/50 rounded-lg">
            <div className="flex items-center space-x-3">
              <Phone className="h-6 w-6 text-primary" />
              <div className="flex-grow">
                  <p className="text-xs text-muted-foreground">Phone Number</p>
                  {!isEditingPhoneNumber ? (
                    <p className="font-semibold text-foreground">
                      {currentUser.phoneNumber ? `+91 ${currentUser.phoneNumber}` : 'N/A'}
                    </p>
                  ) : (
                    <Input
                      type="tel"
                      value={newPhoneNumber}
                      onChange={(e) => setNewPhoneNumber(e.target.value)}
                      placeholder="9876543210"
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
             {currentUser.phoneNumberLastUpdatedAt && currentUser.phoneNumberLastUpdatedAt instanceof Timestamp && !isEditingPhoneNumber && (
                 <p className="text-xs text-muted-foreground mt-1">
                    Last updated: {format(currentUser.phoneNumberLastUpdatedAt.toDate(), "PPp")}
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

          <Accordion type="multiple" className="w-full space-y-4">
            <AccordionItem value="change-pin">
              <AccordionTrigger className="text-lg font-semibold hover:no-underline p-3 bg-secondary/50 rounded-lg">
                <div className="flex items-center">
                  <KeyRound className="mr-2 h-5 w-5 text-primary"/>Change PIN
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 px-3">
                <form onSubmit={handleChangePinSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="oldPin">Old PIN</Label>
                    <Input id="oldPin" type="password" value={oldPin} onChange={(e) => setOldPin(e.target.value)} maxLength={4} required className="tracking-widest"/>
                  </div>
                  <div>
                    <Label htmlFor="newPin">New PIN</Label>
                    <Input id="newPin" type="password" value={newPin} onChange={(e) => setNewPin(e.target.value)} maxLength={4} required className="tracking-widest"/>
                  </div>
                  <div>
                    <Label htmlFor="confirmNewPin">Confirm New PIN</Label>
                    <Input id="confirmNewPin" type="password" value={confirmNewPin} onChange={(e) => setConfirmNewPin(e.target.value)} maxLength={4} required className="tracking-widest"/>
                  </div>
                  <Button type="submit" className="w-full" disabled={isChangingPin}>
                    {isChangingPin ? 'Changing PIN...' : 'Change PIN'}
                  </Button>
                </form>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="security-qa">
              <AccordionTrigger className="text-lg font-semibold hover:no-underline p-3 bg-secondary/50 rounded-lg">
                <div className="flex flex-col items-start text-left w-full">
                    <div className="flex items-center">
                        <ShieldQuestion className="mr-2 h-5 w-5 text-primary"/>
                        <span>Security Question &amp; Answer</span>
                    </div>
                    <div className="text-sm text-muted-foreground font-normal mt-1 text-left">
                        Current Question: <span className="font-medium">{currentSecurityQuestion}</span>
                        {currentUser.securityAnswer && <span className="text-xs block text-muted-foreground">(Answer is hidden for security)</span>}
                        {!currentUser.securityQuestion && <span className="text-xs block text-destructive">Security question not set. Please set one.</span>}
                    </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 px-3">
                <form onSubmit={handleUpdateSecurityQASubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="newSecurityQuestion">New Security Question</Label>
                    <Select value={newSecurityQuestion} onValueChange={setNewSecurityQuestion}>
                      <SelectTrigger id="newSecurityQuestion">
                        <SelectValue placeholder="Select a new question" />
                      </SelectTrigger>
                      <SelectContent>
                        {SECURITY_QUESTIONS.map((q, index) => (
                          <SelectItem key={index} value={q}>{q}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="newSecurityAnswer">New Security Answer</Label>
                    <Input id="newSecurityAnswer" type="text" value={newSecurityAnswer} onChange={(e) => setNewSecurityAnswer(e.target.value)} placeholder="Your new answer" required />
                  </div>
                  <div>
                    <Label htmlFor="pinForSecurityUpdate">Current PIN (to confirm changes)</Label>
                    <Input id="pinForSecurityUpdate" type="password" value={pinForSecurityUpdate} onChange={(e) => setPinForSecurityUpdate(e.target.value)} maxLength={4} required className="tracking-widest"/>
                  </div>
                  <Button type="submit" className="w-full" disabled={isUpdatingSecurity}>
                    {isUpdatingSecurity ? 'Updating...' : (currentUser.securityQuestion ? 'Update Security Info' : 'Set Security Info')}
                  </Button>
                </form>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <Button onClick={logout} variant="destructive" className="w-full text-lg py-3 mt-4">
            <LogOut className="mr-2 h-5 w-5" /> Logout
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
