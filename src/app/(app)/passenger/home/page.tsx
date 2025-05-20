
"use client";

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RideCard } from '@/components/ride-card';
import { useAuth } from '@/contexts/auth-context';
import { useRides } from '@/contexts/ride-context';
import { useToast } from '@/hooks/use-toast';
import { UserCircle2, Car, MapPin, Clock, Users, Phone, MessageSquare, ListChecks, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import type { Ride } from '@/lib/types';
import { ChatModal } from '@/components/chat-modal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { isSameDay } from 'date-fns';


export default function PassengerHomePage() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const { 
    rides: allRides, 
    isLoading: ridesLoading, 
    reserveSeat, 
    cancelReservation,
    currentPassengerRide,
    passengerActiveRequests,
    deleteRideRequest // New function from context
  } = useRides();
  const { toast } = useToast();

  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [chatRideId, setChatRideId] = useState<string | null>(null);
  const [chatModalTitle, setChatModalTitle] = useState("");
  const [requestToDelete, setRequestToDelete] = useState<string | null>(null);


  const handleOpenChatModal = (rideId: string, title: string) => {
    setChatRideId(rideId);
    setChatModalTitle(title);
    setIsChatModalOpen(true);
  };

  const handleReserveSeat = async (rideId: string) => {
    const success = await reserveSeat(rideId);
    if (success) {
      toast({ title: "Seat Reserved!", description: "Your spot is confirmed." });
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
    toast({ title: "Ride Confirmed", description: "You have confirmed you are on board." });
  };

  const handleDeleteRequest = (rideId: string) => {
    setRequestToDelete(rideId);
  };

  const confirmDeleteRequest = async () => {
    if (requestToDelete) {
      const success = await deleteRideRequest(requestToDelete);
      // Toast is handled in context
      setRequestToDelete(null);
    }
  };

  const availableRides = useMemo(() => {
    if (!currentUser) return [];
    const today = new Date();
    const potentiallyAvailable = allRides.filter(ride => 
      ride.status === 'Scheduled' &&
      isSameDay(new Date(ride.departureTime), today) && // Show only today's rides
      new Date(ride.departureTime) >= today && // Ensure it's not in the past today
      ride.seatsAvailable > 0 &&
      !ride.passengers.find(p => p.userId === currentUser.id) &&
      ride.driverId !== currentUser.id &&
      ride.requestType !== 'full_reserved' // Don't show fully reserved rides to others
    );

    const uniqueRideOfferKeys = new Set<string>();
    return potentiallyAvailable.filter(ride => {
      const rideKey = `${ride.driverId}-${ride.origin}-${ride.destination}-${ride.departureTime}`;
      if (!uniqueRideOfferKeys.has(rideKey)) {
        uniqueRideOfferKeys.add(rideKey);
        return true;
      }
      return false;
    }).sort((a, b) => new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime());
  }, [allRides, currentUser]);


  if (ridesLoading || !currentUser) {
    return (
      <div className="container mx-auto p-4 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-72 w-full rounded-xl mb-4" /> 
        <Skeleton className="h-8 w-40 mb-2" /> 
        <Skeleton className="h-48 w-full rounded-xl mb-4" /> 
        <Skeleton className="h-8 w-32 mb-2" /> 
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
      </header>

      {currentPassengerRide && (
        <section>
          <h2 className="text-xl font-semibold mb-3 text-foreground">Your Current Ride</h2>
          <RideCard 
            ride={currentPassengerRide} 
            userRole="passenger"
            onCancelReservation={handleCancelReservation}
            onConfirmBoarded={handleConfirmBoarded}
            onOpenChat={handleOpenChatModal}
            isCurrentRide={true}
          />
        </section>
      )}

      {passengerActiveRequests.length > 0 && (
        <section>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xl font-semibold text-foreground flex items-center"><ListChecks className="mr-2 h-6 w-6 text-primary"/>My Active Ride Requests</h2>
          </div>
          <ScrollArea className="w-full whitespace-nowrap pb-4">
              <div className="flex space-x-4">
                  {passengerActiveRequests.map((ride: Ride) => (
                  <RideCard 
                      key={ride.id} 
                      ride={ride} 
                      userRole="passenger"
                      onViewDetails={() => router.push(`/ride/${ride.id}`)}
                      onDeleteRequest={handleDeleteRequest} // Pass delete handler
                      className="flex-none w-[300px] sm:w-[320px] md:w-[350px]"
                  />
                  ))}
              </div>
          </ScrollArea>
        </section>
      )}


      <section>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-xl font-semibold text-foreground">Available Rides for Today</h2>
        </div>
        {availableRides.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {availableRides.map((ride: Ride) => (
                <RideCard 
                  key={ride.id} 
                  ride={ride} 
                  userRole="passenger" 
                  onReserve={handleReserveSeat}
                  onViewDetails={() => router.push(`/ride/${ride.id}`)}
                  onOpenChat={handleOpenChatModal}
                />
              ))}
            </div>
        ) : (
          <Card className="shadow-lg rounded-xl">
            <CardContent className="p-6 text-center">
              <Image src="https://placehold.co/300x200.png" alt="No rides available" width={300} height={200} className="mx-auto rounded-md mb-4" data-ai-hint="empty street calendar" />
              <p className="text-muted-foreground">No scheduled rides available for today. Try requesting one!</p>
            </CardContent>
          </Card>
        )}
      </section>

      {currentUser && chatRideId && (
        <ChatModal
          isOpen={isChatModalOpen}
          onClose={() => setIsChatModalOpen(false)}
          rideId={chatRideId}
          chatTitle={chatModalTitle}
          currentUser={currentUser}
        />
      )}
      {requestToDelete && (
        <AlertDialog open={!!requestToDelete} onOpenChange={() => setRequestToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Ride Request?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this ride request? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setRequestToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteRequest} className="bg-destructive hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

