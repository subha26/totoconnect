
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RideCard } from '@/components/ride-card';
import { useAuth } from '@/contexts/auth-context';
import { useRides } from '@/contexts/ride-context';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Bell, Car, Users, MessageSquare, Phone, Edit, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';
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


export default function DriverHomePage() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const { 
    driverUpcomingRides, 
    driverRideRequests, 
    isLoading: ridesLoading, 
    updateRideStatus,
    acceptRideRequest,
    currentDriverRide,
    deleteRide
  } = useRides();
  const { toast } = useToast();

  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [chatRideId, setChatRideId] = useState<string | null>(null);
  const [chatModalTitle, setChatModalTitle] = useState("");
  const [rideToDelete, setRideToDelete] = useState<string | null>(null);

  const handleOpenChatModal = (rideId: string, title: string) => {
    setChatRideId(rideId);
    setChatModalTitle(title);
    setIsChatModalOpen(true);
  };

  const handleStartRide = async (rideId: string) => {
    const success = await updateRideStatus(rideId, 'On Route', 10); 
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
      // Failure toast handled in context
    }
  };

  const handleEditRide = (rideId: string) => {
    router.push(`/driver/edit-ride/${rideId}`);
  };

  const confirmDeleteRide = async () => {
    if (rideToDelete) {
      const success = await deleteRide(rideToDelete);
      if (success) {
        toast({ title: "Ride Deleted", description: "The ride has been successfully removed." });
      } else {
        // toast({ title: "Deletion Failed", description: "Could not delete the ride. Please try again.", variant: "destructive" });
        // Failure toast handled in context for specific reasons (e.g., ride has passengers)
      }
      setRideToDelete(null);
    }
  };
  
  const handleDeleteRide = (rideId: string) => {
    setRideToDelete(rideId);
  };


  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    if (currentDriverRide && currentDriverRide.status === 'On Route') {
        intervalId = setInterval(() => {
            if (currentDriverRide.progress === undefined || currentDriverRide.progress >= 100) {
                if (intervalId) clearInterval(intervalId);
                if(currentDriverRide.progress >=100 && currentDriverRide.status !== 'Completed') {
                if (typeof updateRideStatus === 'function') {
                    updateRideStatus(currentDriverRide.id, 'Destination Reached', 100);
                }
                }
                return;
            }
            const newProgress = Math.min((currentDriverRide.progress || 0) + 10, 100);
            if (typeof updateRideStatus === 'function') {
                updateRideStatus(currentDriverRide.id, 'On Route', newProgress);
            }
        }, 5000);
    }
    return () => {
        if (intervalId) clearInterval(intervalId);
    };
  }, [currentDriverRide, updateRideStatus]);


  if (ridesLoading || !currentUser) {
    return (
      <div className="container mx-auto p-4 space-y-6">
        <Skeleton className="h-10 w-48" />
        {/* Skeleton for current ride if applicable */}
        <Skeleton className="h-72 w-full rounded-xl mb-4" />
        <Skeleton className="h-8 w-32 mb-2" />
        <div className="flex space-x-4 overflow-hidden pb-4">
          <Skeleton className="h-56 w-80 flex-none rounded-xl" />
          <Skeleton className="h-56 w-80 flex-none rounded-xl" />
        </div>
         <Skeleton className="h-8 w-40 mb-2" />
        <div className="flex space-x-4 overflow-hidden pb-4">
          <Skeleton className="h-56 w-80 flex-none rounded-xl" />
          <Skeleton className="h-56 w-80 flex-none rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-primary">Driver Dashboard</h1>
      </header>

      {currentDriverRide && (
        <section>
          <h2 className="text-xl font-semibold mb-3 text-foreground">Current Ride</h2>
           <RideCard
            ride={currentDriverRide}
            userRole="driver"
            onCompleteRide={handleCompleteRide}
            onCancelReservation={async (id) => { // Driver cancelling their own active ride
                await updateRideStatus(id, "Cancelled");
                toast({title: "Ride Cancelled", variant: "destructive"});
            }}
            onOpenChat={handleOpenChatModal}
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
           <div className="flex overflow-x-auto space-x-4 pb-4 pt-1">
              {driverUpcomingRides.map((ride) => (
                <RideCard 
                  key={ride.id} 
                  ride={ride} 
                  userRole="driver" 
                  onStartRide={handleStartRide}
                  onViewDetails={() => router.push(`/ride/${ride.id}`)}
                  onOpenChat={handleOpenChatModal}
                  onEditRide={handleEditRide}
                  onDeleteRide={handleDeleteRide}
                  className="flex-none w-[300px] sm:w-[320px] md:w-[350px]"
                />
              ))}
            </div>
        ) : (
          <Card className="shadow-lg rounded-xl">
            <CardContent className="p-6 text-center">
               <Image src="https://placehold.co/300x200.png" alt="No upcoming rides" width={300} height={200} className="mx-auto rounded-md mb-4" data-ai-hint="empty road calendar" />
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
            <div className="flex overflow-x-auto space-x-4 pb-4 pt-1">
                {driverRideRequests.map((ride) => ( 
                    <RideCard 
                    key={ride.id} 
                    ride={ride} 
                    userRole="driver" 
                    onAcceptRequest={handleAcceptRequest}
                    onViewDetails={() => router.push(`/ride/${ride.id}`)}
                    className="flex-none w-[300px] sm:w-[320px] md:w-[350px]"
                    />
                ))}
            </div>
        ) : (
          <Card className="shadow-lg rounded-xl">
            <CardContent className="p-6 text-center">
              <Image src="https://placehold.co/300x200.png" alt="No new requests" width={300} height={200} className="mx-auto rounded-md mb-4" data-ai-hint="empty bell inbox" />
              <p className="text-muted-foreground">No new ride requests at the moment.</p>
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
      {rideToDelete && (
        <AlertDialog open={!!rideToDelete} onOpenChange={() => setRideToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the ride.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setRideToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteRide} className="bg-destructive hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
