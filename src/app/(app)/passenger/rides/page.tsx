
"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RideCard } from "@/components/ride-card";
import { useRides } from "@/contexts/ride-context";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { isSameDay } from 'date-fns';

export default function PassengerRidesPage() {
  const { passengerUpcomingRides, passengerPastRides, isLoading, cancelReservation } = useRides();
  const { toast } = useToast();
  const router = useRouter();

  const handleCancelReservation = async (rideId: string) => {
    const success = await cancelReservation(rideId);
    if (success) {
      toast({ title: "Reservation Cancelled", description: "Your seat has been cancelled." });
    } else {
      toast({ title: "Cancellation Failed", variant: "destructive" });
    }
  };

  const todaysRides = passengerUpcomingRides.filter(ride => 
    isSameDay(new Date(ride.departureTime), new Date())
  );

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 space-y-4">
        <Skeleton className="h-10 w-full rounded-md mb-6" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-6 text-primary">My Rides</h1>
      <Tabs defaultValue="today" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="today">Today's Rides</TabsTrigger>
          <TabsTrigger value="past">Past (Last Week)</TabsTrigger>
        </TabsList>
        <TabsContent value="today">
          <ScrollArea className="h-[calc(100vh-200px)]">
            {todaysRides.length > 0 ? (
              <div className="space-y-4">
                {todaysRides.map((ride) => (
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
                <Image src="https://placehold.co/300x200.png" alt="No rides today" width={300} height={200} className="mx-auto rounded-md mb-4" data-ai-hint="empty calendar today" />
                <p className="text-muted-foreground">You have no rides scheduled for today.</p>
              </div>
            )}
          </ScrollArea>
        </TabsContent>
        <TabsContent value="past">
          <ScrollArea className="h-[calc(100vh-200px)]">
            {passengerPastRides.length > 0 ? (
              <div className="space-y-4">
                {passengerPastRides.map((ride) => (
                  <RideCard key={ride.id} ride={ride} userRole="passenger" onViewDetails={() => router.push(`/ride/${ride.id}`)} />
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                 <Image src="https://placehold.co/300x200.png" alt="No past rides" width={300} height={200} className="mx-auto rounded-md mb-4" data-ai-hint="archive box" />
                <p className="text-muted-foreground">No ride history from the past week.</p>
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
