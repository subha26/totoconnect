"use client";

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RideCard } from '@/components/ride-card';
import { useAuth } from '@/contexts/auth-context';
import { useRides } from '@/contexts/ride-context';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, ShieldAlert, UserCircle2, Car, MapPin, Clock, Users, Phone, MessageSquare } from 'lucide-react';
import Image from 'next/image';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

export default function PassengerHomePage() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const { 
    rides: scheduledRides, // All rides for now, should be filtered
    isLoading: ridesLoading, 
    reserveSeat, 
    cancelReservation,
    updateRideStatus,
    currentPassengerRide 
  } = useRides();
  const { toast } = useToast();

  const handleReserveSeat = async (rideId: string) => {
    const success = await reserveSeat(rideId);
    if (success) {
      toast({ title: "Seat Reserved!", description: "Your spot is confirmed." });
    } else {
      toast({ title: "Reservation Failed", description: "Could not reserve seat. Please try again.", variant: "destructive" });
    }
  };

  const handleCancelReservation = async (rideId: string) => {
    const success = await cancelReservation(rideId);
    if (success) {
      toast({ title: "Reservation Cancelled", description: "Your seat has been cancelled." });
    } else {
      toast({ title: "Cancellation Failed", variant: "destructive" });
    }
  };
  
  const handleConfirmBoarded = async (rideId: string) => {
    // This is a passenger action, could update status to 'On Route' from their perspective or a specific boarded status
    // For simplicity, let's assume this action implicitly moves to 'On Route' or confirms presence.
    // In a real app, the driver would primarily control 'On Route' status.
    // Let's simulate passenger confirming they are on board, which might trigger UI changes for them.
    // No direct status change, but could be tracked.
    toast({ title: "Ride Confirmed", description: "You have confirmed you are on board." });
    // Potentially update a local state or a specific passenger status on the ride object if backend supports it.
    // For now, this is a UI confirmation.
    // If this should actually change the ride status, ensure passenger has permission or it's a special passenger-initiated status.
    // Example: updateRideStatus(rideId, 'On Route'); // if passenger action could do this
  };

  const availableRides = scheduledRides.filter(ride => ride.status === 'Scheduled' && !ride.passengers.find(p => p.userId === currentUser?.id));

  if (ridesLoading || !currentUser) {
    return (
      <div className="container mx-auto p-4 space-y-6">
        <Skeleton className="h-10 w-48" />
        {currentPassengerRide && <Skeleton className="h-64 w-full rounded-xl" />}
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
        <h1 className="text-2xl font-semibold text-primary">Welcome, {currentUser.name}!</h1>
        <Button variant="ghost" size="icon" onClick={() => router.push('/emergency')}>
          <ShieldAlert className="h-6 w-6 text-destructive" />
          <span className="sr-only">Emergency</span>
        </Button>
      </header>

      {currentPassengerRide && (
        <section>
          <h2 className="text-xl font-semibold mb-3 text-foreground">Your Current Ride</h2>
          <RideCard 
            ride={currentPassengerRide} 
            userRole="passenger"
            onCancelReservation={handleCancelReservation}
            onConfirmBoarded={handleConfirmBoarded}
            isCurrentRide={true}
          />
        </section>
      )}

      <section>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-xl font-semibold text-foreground">Available Rides</h2>
          <Button onClick={() => router.push('/passenger/request-ride')} className="bg-accent text-accent-foreground hover:bg-accent/90">
            <PlusCircle className="mr-2 h-5 w-5" /> Request Ride
          </Button>
        </div>
        {availableRides.length > 0 ? (
          <ScrollArea className="h-[calc(100vh-var(--current-ride-height,0px)-var(--header-height,0px)-var(--nav-height,0px)-250px)]"> {/* Adjust height as needed */}
            <div className="grid gap-4 md:grid-cols-2">
              {availableRides.map((ride) => (
                <RideCard 
                  key={ride.id} 
                  ride={ride} 
                  userRole="passenger" 
                  onReserve={handleReserveSeat}
                  onViewDetails={() => router.push(`/ride/${ride.id}`)}
                />
              ))}
            </div>
          </ScrollArea>
        ) : (
          <Card className="shadow-lg rounded-xl">
            <CardContent className="p-6 text-center">
              <Image src="https://picsum.photos/seed/empty/300/200" alt="No rides available" width={300} height={200} className="mx-auto rounded-md mb-4" data-ai-hint="empty state illustration" />
              <p className="text-muted-foreground">No scheduled rides available right now. Try requesting one!</p>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
