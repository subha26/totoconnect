
"use client";

import React, { useState } from 'react'; // Import React and useState
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RideCard } from '@/components/ride-card';
import { useAuth } from '@/contexts/auth-context';
import { useRides } from '@/contexts/ride-context';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Bell, Car, Users, MessageSquare, Phone, Edit, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { ChatModal } from '@/components/chat-modal'; // Import ChatModal
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"


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
    deleteRide // Added deleteRide from context
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
      toast({ title: "Failed to Accept Request", description: "Please try again or the request may no longer be valid.", variant: "destructive" });
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
        toast({ title: "Deletion Failed", description: "Could not delete the ride. Please try again.", variant: "destructive" });
      }
      setRideToDelete(null); // Close dialog
    }
  };
  
  const handleDeleteRide = (rideId: string) => {
    setRideToDelete(rideId); // Open confirmation dialog
  };


  // Simulate ride progress for current active ride
  // In a real app, this would come from GPS updates
  const activeRide = currentDriverRide;
  
  if (activeRide && activeRide.status === 'On Route') {
      // This interval setup might be problematic with React's lifecycle and Next.js.
      // Consider moving progress updates to be triggered by real events or a more robust polling mechanism if needed.
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
         {/* Emergency button removed */}
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
           <ScrollArea className="h-[calc(100vh-var(--current-ride-height,0px)-var(--header-height,0px)-var(--nav-height,0px)-350px)]">
            <div className="grid gap-4 md:grid-cols-2">
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
                />
              ))}
            </div>
          </ScrollArea>
        ) : (
          <Card className="shadow-lg rounded-xl">
            <CardContent className="p-6 text-center">
               <Image src="https://placehold.co/300x200.png" alt="No upcoming rides" width={300} height={200} className="mx-auto rounded-md mb-4" data-ai-hint="empty road illustration" />
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
            <ScrollArea className="h-[200px)]"> {/* Fixed height for this section or adjust as needed */}
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
              <Image src="https://placehold.co/300x200.png" alt="No new requests" width={300} height={200} className="mx-auto rounded-md mb-4" data-ai-hint="empty inbox illustration" />
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
