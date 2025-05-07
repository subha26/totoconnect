"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RideCard } from "@/components/ride-card";
import { useRides } from "@/contexts/ride-context";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";
import { useRouter } from "next/navigation";

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

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 space-y-4">
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-6 text-primary">My Rides</h1>
      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="past">Past (Last Week)</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming">
          <ScrollArea className="h-[calc(100vh-200px)]"> {/* Adjust height dynamically */}
            {passengerUpcomingRides.length > 0 ? (
              <div className="space-y-4">
                {passengerUpcomingRides.map((ride) => (
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
                <Image src="https://picsum.photos/seed/norides/300/200" alt="No upcoming rides" width={300} height={200} className="mx-auto rounded-md mb-4" data-ai-hint="empty calendar illustration" />
                <p className="text-muted-foreground">You have no upcoming rides.</p>
              </div>
            )}
          </ScrollArea>
        </TabsContent>
        <TabsContent value="past">
          <ScrollArea className="h-[calc(100vh-200px)]"> {/* Adjust height dynamically */}
            {passengerPastRides.length > 0 ? (
              <div className="space-y-4">
                {passengerPastRides.map((ride) => (
                  <RideCard key={ride.id} ride={ride} userRole="passenger" onViewDetails={() => router.push(`/ride/${ride.id}`)} />
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                 <Image src="https://picsum.photos/seed/pastrides/300/200" alt="No past rides" width={300} height={200} className="mx-auto rounded-md mb-4" data-ai-hint="archive box illustration"/>
                <p className="text-muted-foreground">No ride history from the past week.</p>
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
