"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRides } from '@/contexts/ride-context';
import { useToast } from '@/hooks/use-toast';
import { CalendarFold, MapPin, Users, PlusCircleIcon } from 'lucide-react';
import { LOCATIONS, DEFAULT_TOTAL_SEATS } from '@/lib/constants';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function PostRidePage() {
  const router = useRouter();
  const { postRide, isLoading } = useRides();
  const { toast } = useToast();
  
  const [origin, setOrigin] = useState<string>(LOCATIONS.MAIN_ROAD);
  const [destination, setDestination] = useState<string>(LOCATIONS.COLLEGE);
  const [departureTime, setDepartureTime] = useState<Date | undefined>(new Date(Date.now() + 60 * 60 * 1000)); // Default to 1 hour from now
  const [timeString, setTimeString] = useState<string>(format(new Date(Date.now() + 60 * 60 * 1000), "HH:mm"));
  const [totalSeats, setTotalSeats] = useState<number>(DEFAULT_TOTAL_SEATS);

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTimeString(e.target.value);
    if (departureTime) {
      const [hours, minutes] = e.target.value.split(':').map(Number);
      const newDate = new Date(departureTime);
      newDate.setHours(hours, minutes);
      setDepartureTime(newDate);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      const [hours, minutes] = timeString.split(':').map(Number);
      const newDateTime = new Date(date);
      newDateTime.setHours(hours, minutes, 0, 0);
      setDepartureTime(newDateTime);
    } else {
      setDepartureTime(undefined);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!departureTime) {
      toast({ title: "Missing Information", description: "Please select a departure date and time.", variant: "destructive" });
      return;
    }
    if (departureTime < new Date()) {
      toast({ title: "Invalid Time", description: "Departure time cannot be in the past.", variant: "destructive" });
      return;
    }
     if (origin === destination) {
      toast({ title: "Invalid Locations", description: "Origin and destination cannot be the same.", variant: "destructive" });
      return;
    }
    if (totalSeats <= 0 || totalSeats > 10) { // Assuming max 10 seats for a toto
       toast({ title: "Invalid Seats", description: "Number of seats must be between 1 and 10.", variant: "destructive" });
      return;
    }

    const success = await postRide(departureTime, origin, destination, totalSeats);
    if (success) {
      toast({ title: "Ride Posted!", description: "Your ride is now available for passengers." });
      router.push('/driver/home');
    } else {
      toast({ title: "Post Failed", description: "Could not post ride. Please try again.", variant: "destructive" });
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Card className="max-w-lg mx-auto shadow-xl rounded-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-primary flex items-center">
            <PlusCircleIcon className="mr-2 h-6 w-6" /> Post a New Ride
          </CardTitle>
          <CardDescription>Offer a ride to passengers by providing details below.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="origin" className="flex items-center"><MapPin className="mr-2 h-4 w-4 text-primary" />Origin</Label>
              <Select value={origin} onValueChange={setOrigin}>
                <SelectTrigger id="origin"><SelectValue placeholder="Select origin" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={LOCATIONS.MAIN_ROAD}>{LOCATIONS.MAIN_ROAD}</SelectItem>
                  <SelectItem value={LOCATIONS.COLLEGE}>{LOCATIONS.COLLEGE}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="destination" className="flex items-center"><MapPin className="mr-2 h-4 w-4 text-primary" />Destination</Label>
              <Select value={destination} onValueChange={setDestination}>
                <SelectTrigger id="destination"><SelectValue placeholder="Select destination" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={LOCATIONS.MAIN_ROAD}>{LOCATIONS.MAIN_ROAD}</SelectItem>
                  <SelectItem value={LOCATIONS.COLLEGE}>{LOCATIONS.COLLEGE}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="departureDate" className="flex items-center"><CalendarFold className="mr-2 h-4 w-4 text-primary" />Date</Label>
                    <Popover>
                    <PopoverTrigger asChild>
                        <Button
                        id="departureDate"
                        variant={"outline"}
                        className={cn("w-full justify-start text-left font-normal",!departureTime && "text-muted-foreground")}
                        >
                        <CalendarFold className="mr-2 h-4 w-4" />
                        {departureTime ? format(departureTime, "PPP") : <span>Pick a date</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar
                        mode="single"
                        selected={departureTime}
                        onSelect={handleDateSelect}
                        initialFocus
                        disabled={(date) => date < new Date(new Date().setDate(new Date().getDate()-1))}
                        />
                    </PopoverContent>
                    </Popover>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="departureTimeField" className="flex items-center"><MapPin className="mr-2 h-4 w-4 text-primary" />Time</Label>
                    <Input id="departureTimeField" type="time" value={timeString} onChange={handleTimeChange} required />
                </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="totalSeats" className="flex items-center"><Users className="mr-2 h-4 w-4 text-primary" />Total Seats Available</Label>
              <Input 
                id="totalSeats" 
                type="number" 
                value={totalSeats} 
                onChange={(e) => setTotalSeats(parseInt(e.target.value))} 
                min="1" 
                max="10" 
                required 
              />
            </div>

            <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90 py-3 text-lg" disabled={isLoading}>
              {isLoading ? 'Posting Ride...' : 'Post Ride'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
