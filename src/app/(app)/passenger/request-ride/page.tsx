
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useRides } from '@/contexts/ride-context';
import { useToast } from '@/hooks/use-toast';
import { CalendarFold, MapPin, Send, Users, Lock } from 'lucide-react';
import { LOCATIONS } from '@/lib/constants';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { RideRequestType } from '@/lib/types';


export default function RequestRidePage() {
  const router = useRouter();
  const { requestRide, isLoading } = useRides();
  const { toast } = useToast();
  
  const [origin, setOrigin] = useState<string>(LOCATIONS.MAIN_ROAD);
  const [destination, setDestination] = useState<string>(LOCATIONS.COLLEGE);
  const [departureTime, setDepartureTime] = useState<Date | undefined>(new Date(Date.now() + 30 * 60 * 1000)); // Default to 30 mins from now
  const [timeString, setTimeString] = useState<string>(format(new Date(Date.now() + 30 * 60 * 1000), "HH:mm"));
  const [requestType, setRequestType] = useState<RideRequestType>('sharing');


  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTimeString(e.target.value);
    if (departureTime) {
      const [hours, minutes] = e.target.value.split(':').map(Number);
      const newDate = new Date(departureTime);
      newDate.setHours(hours, minutes, 0, 0); // Reset seconds and milliseconds
      setDepartureTime(newDate);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      const [hours, minutes] = timeString.split(':').map(Number);
      const newDateTime = new Date(date);
      newDateTime.setHours(hours, minutes, 0, 0); // Reset seconds and milliseconds
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
    // Rule a: No request can be made for a ride before the current date and time
    if (departureTime < new Date()) {
      toast({ title: "Invalid Time", description: "Departure time cannot be in the past.", variant: "destructive" });
      return;
    }
    if (origin === destination) {
      toast({ title: "Invalid Locations", description: "Origin and destination cannot be the same.", variant: "destructive" });
      return;
    }

    const result = await requestRide(departureTime, origin, destination, requestType);
    if (result?.success) {
      toast({ title: "Ride Requested!", description: "Your request has been sent to nearby drivers." });
      router.push('/passenger/home');
    } else {
      toast({ title: "Request Failed", description: result?.message || "Could not request ride. Please try again.", variant: "destructive" });
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Card className="max-w-lg mx-auto shadow-xl rounded-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-primary flex items-center">
            <Send className="mr-2 h-6 w-6" /> Request a New Ride
          </CardTitle>
          <CardDescription>Let us know where and when you want to go, and your preferred ride type.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="origin" className="flex items-center"><MapPin className="mr-2 h-4 w-4 text-primary" />Origin</Label>
              <Select value={origin} onValueChange={setOrigin}>
                <SelectTrigger id="origin">
                  <SelectValue placeholder="Select origin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={LOCATIONS.MAIN_ROAD}>{LOCATIONS.MAIN_ROAD}</SelectItem>
                  <SelectItem value={LOCATIONS.COLLEGE}>{LOCATIONS.COLLEGE}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="destination" className="flex items-center"><MapPin className="mr-2 h-4 w-4 text-primary" />Destination</Label>
               <Select value={destination} onValueChange={setDestination}>
                <SelectTrigger id="destination">
                  <SelectValue placeholder="Select destination" />
                </SelectTrigger>
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
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !departureTime && "text-muted-foreground"
                      )}
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
                      disabled={(date) => date < new Date(new Date().setDate(new Date().getDate()-1))} // Disable past dates, time checked in submit
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                 <Label htmlFor="departureTimeField" className="flex items-center"><MapPin className="mr-2 h-4 w-4 text-primary" />Time</Label>
                <Input
                    id="departureTimeField"
                    type="time"
                    value={timeString}
                    onChange={handleTimeChange}
                    required
                  />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="flex items-center mb-2">
                <Users className="mr-2 h-5 w-5 text-primary" />
                Ride Type
              </Label>
              <RadioGroup
                value={requestType}
                onValueChange={(value) => setRequestType(value as RideRequestType)}
                className="flex space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="sharing" id="type-sharing" />
                  <Label htmlFor="type-sharing" className="font-normal">Sharing (up to 4 passengers)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="full_reserved" id="type-full" />
                  <Label htmlFor="type-full" className="font-normal flex items-center"><Lock className="w-3 h-3 mr-1"/>Full Reserved (Private)</Label>
                </div>
              </RadioGroup>
            </div>


            <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90 py-3 text-lg" disabled={isLoading}>
              {isLoading ? 'Submitting Request...' : 'Request Ride'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
