
"use client";

import { RideCard } from "@/components/ride-card";
import { useRides } from "@/contexts/ride-context";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function DriverRequestsPage() {
  const { driverRideRequests, isLoading, acceptRideRequest } = useRides();
  const { toast } = useToast();
  const router = useRouter();

  const handleAcceptRequest = async (rideId: string) => {
    const success = await acceptRideRequest(rideId);
    if (success) {
      toast({ title: "Ride Request Accepted!", description: "The ride is now scheduled and moved to your upcoming rides." });
    } else {
      toast({ title: "Failed to Accept Request", description: "Please try again or the request may no longer be valid.", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 space-y-4">
        <Skeleton className="h-10 w-48 mb-6" />
        <Skeleton className="h-56 w-full rounded-xl" />
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-6 text-primary">Passenger Ride Requests</h1>
      <ScrollArea className="h-[calc(100vh-150px)]"> {/* Adjust height dynamically */}
        {driverRideRequests.length > 0 ? (
          <div className="space-y-4">
            {driverRideRequests.map((ride) => (
              <RideCard 
                key={ride.id} 
                ride={ride} 
                userRole="driver" 
                onAcceptRequest={handleAcceptRequest}
                onViewDetails={() => router.push(`/ride/${ride.id}`)} // Allow viewing details before accepting
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-10">
            <Image src="https://placehold.co/300x200.png" alt="No pending requests" width={300} height={200} className="mx-auto rounded-md mb-4" data-ai-hint="empty bell illustration" />
            <p className="text-muted-foreground">No pending ride requests at this time.</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
