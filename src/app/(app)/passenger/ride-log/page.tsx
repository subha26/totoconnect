
"use client";

import React, { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { RideCard } from "@/components/ride-card";
import { useRides } from "@/contexts/ride-context";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { format, isSameDay, isAfter, isBefore, startOfDay } from 'date-fns';
import type { Ride } from '@/lib/types';

export default function PassengerRideLogPage() {
  const { passengerUpcomingRides, passengerPastRides, isLoading, cancelReservation } = useRides();
  const { toast } = useToast();
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const handleCancelReservation = async (rideId: string) => {
    const success = await cancelReservation(rideId);
    if (success) {
      toast({ title: "Reservation Cancelled", description: "Your seat has been cancelled." });
    } else {
      toast({ title: "Cancellation Failed", variant: "destructive" });
    }
  };

  const allPassengerRides = useMemo(() => {
    // Combine upcoming and past rides, ensuring uniqueness if any overlap (though unlikely with context logic)
    const rideMap = new Map<string, Ride>();
    passengerUpcomingRides.forEach(ride => rideMap.set(ride.id, ride));
    passengerPastRides.forEach(ride => rideMap.set(ride.id, ride)); // Past rides might overwrite if IDs are same, context should handle this
    return Array.from(rideMap.values());
  }, [passengerUpcomingRides, passengerPastRides]);


  const ridesOnSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    return allPassengerRides.filter(ride => 
      isSameDay(new Date(ride.departureTime), selectedDate)
    ).sort((a, b) => new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime());
  }, [allPassengerRides, selectedDate]);

  const futureRidesAfterSelected = useMemo(() => {
    if (!selectedDate) return [];
    // From passengerUpcomingRides, as these are inherently future and active
    return passengerUpcomingRides.filter(ride => 
      isAfter(startOfDay(new Date(ride.departureTime)), startOfDay(selectedDate))
    ).sort((a, b) => new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime());
  }, [passengerUpcomingRides, selectedDate]);

  const pastRidesBeforeSelected = useMemo(() => {
    if (!selectedDate) return [];
    // From passengerPastRides, as these are inherently past or completed/cancelled
    return passengerPastRides.filter(ride => 
      isBefore(startOfDay(new Date(ride.departureTime)), startOfDay(selectedDate))
    ).sort((a, b) => new Date(b.departureTime).getTime() - new Date(a.departureTime).getTime());
  }, [passengerPastRides, selectedDate]);


  if (isLoading) {
    return (
      <div className="container mx-auto p-4 space-y-4">
        <Skeleton className="h-10 w-48 mb-2" />
        <Skeleton className="h-64 w-full md:w-1/3 rounded-xl mb-6" /> {/* Calendar placeholder */}
        <Skeleton className="h-10 w-full rounded-md mb-4" /> {/* TabsList placeholder */}
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-4 text-primary">My Ride Log</h1>
      
      <div className="mb-6 flex justify-center">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          className="rounded-md border shadow"
        />
      </div>

      <Tabs defaultValue="on_selected_date" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="on_selected_date">
            On {selectedDate ? format(selectedDate, 'MMM d') : 'Selected Date'}
          </TabsTrigger>
          <TabsTrigger value="future">Upcoming</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
        </TabsList>

        <TabsContent value="on_selected_date">
          <ScrollArea className="h-[calc(100vh-400px)]"> {/* Adjust height as needed */}
            {ridesOnSelectedDate.length > 0 ? (
              <div className="space-y-4">
                {ridesOnSelectedDate.map((ride) => (
                  <RideCard 
                    key={ride.id} 
                    ride={ride} 
                    userRole="passenger" 
                    onCancelReservation={handleCancelReservation}
                    onViewDetails={() => router.push(`/ride/${ride.id}`)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <Image src="https://placehold.co/300x200.png" alt="No rides on this date" width={300} height={200} className="mx-auto rounded-md mb-4" data-ai-hint="empty calendar day" />
                <p className="text-muted-foreground">No rides found for {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'the selected date'}.</p>
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="future">
          <ScrollArea className="h-[calc(100vh-400px)]">
            {futureRidesAfterSelected.length > 0 ? (
              <div className="space-y-4">
                {futureRidesAfterSelected.map((ride) => (
                  <RideCard 
                    key={ride.id} 
                    ride={ride} 
                    userRole="passenger" 
                    onCancelReservation={handleCancelReservation}
                    onViewDetails={() => router.push(`/ride/${ride.id}`)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <Image src="https://placehold.co/300x200.png" alt="No upcoming rides" width={300} height={200} className="mx-auto rounded-md mb-4" data-ai-hint="empty future calendar" />
                <p className="text-muted-foreground">No upcoming rides scheduled after {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'the selected date'}.</p>
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="past">
          <ScrollArea className="h-[calc(100vh-400px)]">
            {pastRidesBeforeSelected.length > 0 ? (
              <div className="space-y-4">
                {pastRidesBeforeSelected.map((ride) => (
                  <RideCard 
                    key={ride.id} 
                    ride={ride} 
                    userRole="passenger" 
                    onViewDetails={() => router.push(`/ride/${ride.id}`)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                 <Image src="https://placehold.co/300x200.png" alt="No past rides" width={300} height={200} className="mx-auto rounded-md mb-4" data-ai-hint="empty past archive" />
                <p className="text-muted-foreground">No past rides found before {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'the selected date'}.</p>
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
