"use client";

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RideCard } from '@/components/ride-card';
import { useAuth } from '@/contexts/auth-context';
import { useRides } from '@/contexts/ride-context';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Bell, ShieldAlert, Car, Users, MessageSquare, Phone } from 'lucide-react';
import Image from 'next/image';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

export default function DriverHomePage() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const { 
    driverUpcomingRides, 
    driverRideRequests,
    isLoading: ridesLoading, 
    updateRideStatus,
    acceptRideRequest,
    currentDriverRide
  } = useRides();
  const { toast } = useToast();

  const handleStartRide = async (rideId: string) => {
    const success = await updateRideStatus(rideId, 'On Route', 10); // Start with 10% progress
    if (success) {
      toast({ title: "Ride Started!", description: "The ride is now on route." });
    } else {
      toast({ title: "Failed to Start Ride", variant: "destructive" });
    }
  };

  const handleCompleteRide = async (rideId: string) => {
    const success = await updateRideStatus(rideId, 'Completed', 100);
    if (success) {
      toast({ title: "Ride Completed!", description: "Great job!" });
    } else {
      toast({ title: "Failed to Complete Ride", variant: "destructive" });
    }
  };
  
  const handleAcceptRequest = async (rideId: string) => {
    const success = await acceptRideRequest(rideId);
     if (success) {
      toast({ title: "Ride Request Accepted!", description: "The ride is now scheduled." });
    } else {
      toast({ title: "Failed to Accept Request", description: "Please try again or the request may no longer be valid.", variant: "destructive" });
    }
  };

  // Simulate ride progress for current active ride
  // In a real app, this would come from GPS updates
  const activeRide = currentDriverRide;
  
  if (activeRide && activeRide.status === 'On Route') {
      const intervalId = setInterval(() => {
        if (activeRide.progress === undefined || activeRide.progress >= 100) {
            clearInterval(intervalId);
            if(activeRide.progress >=100 && activeRide.status !== 'Completed') {
              updateRideStatus(activeRide.id, 'Destination Reached', 100);
            }
            return;
        }
        const newProgress = Math.min((activeRide.progress || 0) + 10, 100);
        updateRideStatus(activeRide.id, 'On Route', newProgress);
      }, 5000); // Update every 5 seconds

      // useEffect cleanup
      // return () => clearInterval(intervalId); // This causes issues with client components
  }


  if (ridesLoading || !currentUser) {
    return (
      <div className="container mx-auto p-4 space-y-6">
        <Skeleton className="h-10 w-48" />
        {currentDriverRide && <Skeleton className="h-72 w-full rounded-xl" />}
        <Skeleton className="h-8 w-32" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-56 w-full rounded-xl" />
          <Skeleton className="h-56 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-primary">Driver Dashboard</h1>
         <Button variant="ghost" size="icon" onClick={() => router.push('/emergency')}>
          <ShieldAlert className="h-6 w-6 text-destructive" />
          <span className="sr-only">Emergency</span>
        </Button>
      </header>

      {activeRide && (
        <section>
          <h2 className="text-xl font-semibold mb-3 text-foreground">Current Ride</h2>
           <RideCard
            ride={activeRide}
            userRole="driver"
            onCompleteRide={handleCompleteRide}
            onCancelReservation={async (id) => { // Driver cancelling the whole ride
                await updateRideStatus(id, "Cancelled");
                toast({title: "Ride Cancelled", variant: "destructive"});
            }}
            isCurrentRide={true}
          />
        </section>
      )}

      <section>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-xl font-semibold text-foreground">Upcoming Rides</h2>
          <Button onClick={() => router.push('/driver/post-ride')} className="bg-accent text-accent-foreground hover:bg-accent/90">
            <PlusCircle className="mr-2 h-5 w-5" /> Post New Ride
          </Button>
        </div>
        {driverUpcomingRides.length > 0 ? (
           <ScrollArea className="h-[calc(100vh-var(--current-ride-height,0px)-var(--header-height,0px)-var(--nav-height,0px)-350px)]">
            <div className="grid gap-4 md:grid-cols-2">
              {driverUpcomingRides.map((ride) => (
                <RideCard 
                  key={ride.id} 
                  ride={ride} 
                  userRole="driver" 
                  onStartRide={handleStartRide}
                  onViewDetails={() => router.push(`/ride/${ride.id}`)}
                />
              ))}
            </div>
          </ScrollArea>
        ) : (
          <Card className="shadow-lg rounded-xl">
            <CardContent className="p-6 text-center">
               <Image src="https://picsum.photos/seed/driverempty/300/200" alt="No upcoming rides" width={300} height={200} className="mx-auto rounded-md mb-4" data-ai-hint="empty road illustration" />
              <p className="text-muted-foreground">No upcoming rides scheduled. You can post one!</p>
            </CardContent>
          </Card>
        )}
      </section>

      <section>
        <div className="flex justify-between items-center mb-3">
            <h2 className="text-xl font-semibold text-foreground">New Ride Requests</h2>
            <Button variant="outline" size="sm" onClick={() => router.push('/driver/requests')}>
                <Bell className="mr-2 h-4 w-4" /> View All ({driverRideRequests.length})
            </Button>
        </div>
         {driverRideRequests.length > 0 ? (
            <ScrollArea className="h-[200px]"> {/* Fixed height for this section or adjust as needed */}
                <div className="grid gap-4 md:grid-cols-2">
                {driverRideRequests.slice(0,2).map((ride) => ( // Show first 2 requests
                    <RideCard 
                    key={ride.id} 
                    ride={ride} 
                    userRole="driver" 
                    onAcceptRequest={handleAcceptRequest}
                    onViewDetails={() => router.push(`/ride/${ride.id}`)}
                    />
                ))}
                </div>
           </ScrollArea>
        ) : (
          <Card className="shadow-lg rounded-xl">
            <CardContent className="p-6 text-center">
              <Image src="https://picsum.photos/seed/norequests/300/200" alt="No new requests" width={300} height={200} className="mx-auto rounded-md mb-4" data-ai-hint="empty inbox illustration" />
              <p className="text-muted-foreground">No new ride requests at the moment.</p>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
