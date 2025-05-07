"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ShieldAlert, PhoneCall, PlusCircle, Trash2, UserPlus } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { Skeleton } from '@/components/ui/skeleton';

interface EmergencyContact {
  id: string;
  name: string;
  phoneNumber: string;
}

export default function EmergencyPage() {
  const { currentUser, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isAlerting, setIsAlerting] = useState(false);

  // Load contacts from localStorage
  useEffect(() => {
    if (currentUser) {
      const storedContacts = localStorage.getItem(`totoConnectEmergencyContacts_${currentUser.id}`);
      if (storedContacts) {
        setContacts(JSON.parse(storedContacts));
      }
    }
  }, [currentUser]);

  // Save contacts to localStorage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`totoConnectEmergencyContacts_${currentUser.id}`, JSON.stringify(contacts));
    }
  }, [contacts, currentUser]);

  const handleAddContact = () => {
    if (!newContactName.trim() || !newContactPhone.trim()) {
      toast({ title: "Missing Information", description: "Please enter both name and phone number.", variant: "destructive" });
      return;
    }
    if (newContactPhone.length !== 10 || !/^\d{10}$/.test(newContactPhone)) {
      toast({ title: "Invalid Phone Number", description: "Please enter a 10-digit phone number.", variant: "destructive" });
      return;
    }
    if (contacts.length >= 3) {
        toast({ title: "Contact Limit Reached", description: "You can add up to 3 emergency contacts.", variant: "destructive" });
        return;
    }

    setIsAdding(true);
    const newContact: EmergencyContact = {
      id: `contact-${Date.now()}`,
      name: newContactName,
      phoneNumber: newContactPhone,
    };
    setContacts([...contacts, newContact]);
    setNewContactName('');
    setNewContactPhone('');
    toast({ title: "Contact Added", description: `${newContactName} has been added to your emergency contacts.` });
    setIsAdding(false);
  };

  const handleDeleteContact = (contactId: string) => {
    setContacts(contacts.filter(contact => contact.id !== contactId));
    toast({ title: "Contact Removed", description: "The contact has been removed." });
  };

  const handleEmergencyAlert = async () => {
    if (contacts.length === 0) {
      toast({ title: "No Contacts", description: "Please add at least one emergency contact first.", variant: "destructive" });
      return;
    }
    setIsAlerting(true);
    // Simulate sending alerts
    toast({ title: "EMERGENCY ALERT ACTIVATED", description: "Alerting your emergency contacts and authorities (simulated).", variant: "destructive", duration: 10000 });
    
    // In a real app, this would trigger backend calls to SMS services, etc.
    // For example:
    // for (const contact of contacts) {
    //   await sendEmergencySMS(contact.phoneNumber, currentUser.name, currentUser.location);
    // }
    // await notifyAuthorities(currentUser.location);

    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate network delay
    setIsAlerting(false);
  };
  
  if (authLoading) {
    return (
      <div className="container mx-auto p-4 space-y-6">
        <Skeleton className="h-10 w-48 mb-4" />
        <Card className="shadow-xl rounded-xl">
          <CardHeader><Skeleton className="h-8 w-full" /></CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-12 w-full mt-4" />
          </CardContent>
        </Card>
         <Card className="mt-6 shadow-xl rounded-xl">
          <CardHeader><Skeleton className="h-8 w-full" /></CardHeader>
          <CardContent><Skeleton className="h-12 w-full" /></CardContent>
        </Card>
      </div>
    );
  }


  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-6 text-center text-destructive flex items-center justify-center">
        <ShieldAlert className="mr-2 h-8 w-8" /> Emergency Assistance
      </h1>

      <Card className="mb-6 shadow-xl rounded-xl">
        <CardHeader>
          <CardTitle className="text-xl flex items-center"><UserPlus className="mr-2 h-5 w-5 text-primary"/>Manage Emergency Contacts</CardTitle>
          <CardDescription>Add up to 3 trusted contacts who will be notified in an emergency.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {contacts.map(contact => (
            <div key={contact.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
              <div>
                <p className="font-medium text-foreground">{contact.name}</p>
                <p className="text-sm text-muted-foreground">{contact.phoneNumber}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => handleDeleteContact(contact.id)} aria-label="Delete contact">
                <Trash2 className="h-5 w-5 text-destructive" />
              </Button>
            </div>
          ))}
          {contacts.length < 3 && (
            <div className="space-y-3 pt-3 border-t">
              <Label htmlFor="newContactName">Contact Name</Label>
              <Input 
                id="newContactName" 
                placeholder="e.g., Mom, Friend" 
                value={newContactName} 
                onChange={(e) => setNewContactName(e.target.value)} 
              />
              <Label htmlFor="newContactPhone">Contact Phone (10 digits)</Label>
              <Input 
                id="newContactPhone" 
                type="tel" 
                placeholder="1234567890" 
                value={newContactPhone} 
                onChange={(e) => setNewContactPhone(e.target.value)} 
                maxLength={10}
              />
              <Button onClick={handleAddContact} className="w-full" disabled={isAdding}>
                <PlusCircle className="mr-2 h-4 w-4" /> {isAdding ? 'Adding...' : 'Add Contact'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-destructive/10 border-destructive shadow-xl rounded-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-destructive">SOS ALERT</CardTitle>
          <CardDescription className="text-destructive/80">
            Press this button ONLY in a genuine emergency. Your contacts and authorities (simulated) will be alerted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleEmergencyAlert} 
            variant="destructive" 
            className="w-full h-20 text-2xl"
            disabled={isAlerting || contacts.length === 0}
          >
            <PhoneCall className="mr-3 h-8 w-8" /> {isAlerting ? 'ALERTING...' : 'SEND ALERT'}
          </Button>
          {contacts.length === 0 && <p className="text-sm text-center text-destructive/70 mt-2">Add emergency contacts to enable this feature.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
