
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox"; // Import Checkbox
import { useRides } from '@/contexts/ride-context';
import { useToast } from '@/hooks/use-toast';
import { CalendarFold, MapPin, Users, PlusCircleIcon, Repeat } from 'lucide-react';
import { LOCATIONS, DEFAULT_TOTAL_SEATS } from '@/lib/constants';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";

export default function PostRidePage() {
  const router = useRouter();
  const { postRide } = useRides(); // isLoading is now handled internally by postRide
  const { toast } = useToast();
  
  const [origin, setOrigin] = useState<string>(LOCATIONS.MAIN_ROAD);
  const [destination, setDestination] = useState<string>(LOCATIONS.COLLEGE);
  const [departureDate, setDepartureDate] = useState<Date | undefined>(new Date(Date.now() + 60 * 60 * 1000)); // Default to 1 hour from now
  const [timeString, setTimeString] = useState<string>(format(new Date(Date.now() + 60 * 60 * 1000), "HH:mm"));
  const [totalSeats, setTotalSeats] = useState<number>(DEFAULT_TOTAL_SEATS);
  const [repeatForWeek, setRepeatForWeek] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);


  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTimeString(e.target.value);
  };

  const handleDateSelect = (date: Date | undefined) => {
    setDepartureDate(date);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!departureDate || !timeString) {
      toast({ title: "Missing Information", description: "Please select a departure date and time.", variant: "destructive" });
      return;
    }

    const [hours, minutes] = timeString.split(':').map(Number);
    const finalDepartureDateTime = new Date(departureDate);
    finalDepartureDateTime.setHours(hours, minutes, 0, 0);


    if (finalDepartureDateTime < new Date()) {
      toast({ title: "Invalid Time", description: "Departure time cannot be in the past.", variant: "destructive" });
      return;
    }
     if (origin === destination) {
      toast({ title: "Invalid Locations", description: "Origin and destination cannot be the same.", variant: "destructive" });
      return;
    }
    if (totalSeats <= 0 || totalSeats > 10) { 
       toast({ title: "Invalid Seats", description: "Number of seats must be between 1 and 10.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    const result = await postRide(finalDepartureDateTime, origin, destination, totalSeats, repeatForWeek);
    setIsSubmitting(false);

    if (result.success) {
      toast({ title: "Ride(s) Posted!", description: result.message });
      router.push('/driver/home');
    } else {
      toast({ title: "Post Failed", description: result.message || "Could not post ride(s). Please try again.", variant: "destructive" });
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
                        className={cn("w-full justify-start text-left font-normal",!departureDate && "text-muted-foreground")}
                        >
                        <CalendarFold className="mr-2 h-4 w-4" />
                        {departureDate ? format(departureDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar
                        mode="single"
                        selected={departureDate}
                        onSelect={handleDateSelect}
                        initialFocus
                        disabled={(date) => date < new Date(new Date().setDate(new Date().getDate()-1))}
                        />
                    </PopoverContent>
                    </Popover>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="departureTimeField" className="flex items-center"><MapPin className="mr-2 h-4 w-4 text-primary" />Time</Label> {/* Icon might be better as Clock */}
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

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="repeatForWeek" 
                checked={repeatForWeek} 
                onCheckedChange={(checked) => setRepeatForWeek(checked as boolean)}
              />
              <Label htmlFor="repeatForWeek" className="font-normal flex items-center">
                <Repeat className="mr-2 h-4 w-4 text-primary" /> Repeat for the next 7 days
              </Label>
            </div>

            <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90 py-3 text-lg" disabled={isSubmitting}>
              {isSubmitting ? (repeatForWeek ? 'Posting Rides...' : 'Posting Ride...') : (repeatForWeek ? 'Post 7 Rides' : 'Post Ride')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

