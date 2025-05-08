
"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRides } from '@/contexts/ride-context';
import { useToast } from '@/hooks/use-toast';
import { CalendarFold, MapPin, Users, Edit, RotateCcw } from 'lucide-react';
import { LOCATIONS, DEFAULT_TOTAL_SEATS } from '@/lib/constants';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { Skeleton } from '@/components/ui/skeleton';
import type { Ride, RideFirestoreData } from '@/lib/types'; // Import Ride for type checking
import { Timestamp } from 'firebase/firestore';


export default function EditRidePage() {
  const router = useRouter();
  const params = useParams();
  const rideId = typeof params.id === 'string' ? params.id : '';

  const { getRideById, updateRideDetails, isLoading: ridesLoading } = useRides();
  const { toast } = useToast();
  
  const [ride, setRide] = useState<Ride | null | undefined>(undefined);
  const [origin, setOrigin] = useState<string>('');
  const [destination, setDestination] = useState<string>('');
  const [departureTime, setDepartureTime] = useState<Date | undefined>(undefined);
  const [timeString, setTimeString] = useState<string>('');
  const [totalSeats, setTotalSeats] = useState<number>(DEFAULT_TOTAL_SEATS);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (rideId) {
      const existingRide = getRideById(rideId);
      setRide(existingRide);
      if (existingRide) {
        setOrigin(existingRide.origin);
        setDestination(existingRide.destination);
        const existingDepartureDate = parseISO(existingRide.departureTime);
        setDepartureTime(existingDepartureDate);
        setTimeString(format(existingDepartureDate, "HH:mm"));
        setTotalSeats(existingRide.totalSeats);
      } else if (!ridesLoading && existingRide === null) { // explicitly null means not found after loading
        toast({ title: "Ride Not Found", description: "The ride you are trying to edit does not exist.", variant: "destructive" });
        router.push('/driver/home');
      }
    }
  }, [rideId, getRideById, ridesLoading, router, toast]);

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
    if (!ride || !rideId) {
      toast({ title: "Error", description: "Ride data is missing.", variant: "destructive" });
      return;
    }
    if (!departureTime) {
      toast({ title: "Missing Information", description: "Please select a departure date and time.", variant: "destructive" });
      return;
    }
    if (departureTime < new Date() && format(departureTime, 'yyyy-MM-dd') !== format(new Date(), 'yyyy-MM-dd')) { // Allow same day past time for minor edits, but not past days
      toast({ title: "Invalid Time", description: "Departure date cannot be in the past.", variant: "destructive" });
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
    if (totalSeats < ride.passengers.length) {
      toast({ title: "Seat Conflict", description: `Cannot reduce seats below current passenger count (${ride.passengers.length}).`, variant: "destructive"});
      return;
    }


    setIsSubmitting(true);
    const updatedRideData: Partial<RideFirestoreData> = {
        origin,
        destination,
        departureTime: Timestamp.fromDate(departureTime),
        totalSeats,
        seatsAvailable: totalSeats - ride.passengers.length, // Recalculate available seats
    };

    const success = await updateRideDetails(rideId, updatedRideData);
    if (success) {
      toast({ title: "Ride Updated!", description: "Your ride details have been saved." });
      router.push('/driver/home');
    } else {
      toast({ title: "Update Failed", description: "Could not update ride. Please try again.", variant: "destructive" });
    }
    setIsSubmitting(false);
  };
  
  const isLoading = ridesLoading || ride === undefined;

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <Card className="max-w-lg mx-auto shadow-xl rounded-xl">
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2 mt-1" />
          </CardHeader>
          <CardContent className="space-y-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }
  if (!ride) return null; // Already handled by redirect in useEffect if ride is null after loading

  return (
    <div className="container mx-auto p-4">
      <Card className="max-w-lg mx-auto shadow-xl rounded-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-primary flex items-center">
            <Edit className="mr-2 h-6 w-6" /> Edit Your Ride
          </CardTitle>
          <CardDescription>Modify the details of your existing ride offering.</CardDescription>
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
              {ride && ride.passengers.length > 0 && (
                <p className="text-xs text-muted-foreground">
                    Currently {ride.passengers.length} passenger(s) reserved. Cannot set total seats below this number.
                </p>
              )}
            </div>

            <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90 py-3 text-lg" disabled={isSubmitting}>
             <RotateCcw className="mr-2 h-5 w-5" /> {isSubmitting ? 'Updating Ride...' : 'Update Ride'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
