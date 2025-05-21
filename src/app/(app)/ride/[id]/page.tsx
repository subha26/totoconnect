
"use client";

import { useParams, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react'; // Import React
import { useRides } from '@/contexts/ride-context';
import { useAuth } from '@/contexts/auth-context';
import type { Ride } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { MapPin, Clock, Users, User, Phone, MessageSquare, Car, ArrowLeft, ShieldAlert, CheckCircle, XCircle, PlayCircle, Flag } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { ChatModal } from '@/components/chat-modal'; // Import ChatModal
import { ScrollArea } from '@/components/ui/scroll-area'; // Import ScrollArea

export default function RideDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rideId = typeof params.id === 'string' ? params.id : '';
  
  const { getRideById, isLoading: ridesLoading, reserveSeat, cancelReservation, updateRideStatus, acceptRideRequest } = useRides();
  const { currentUser, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [ride, setRide] = useState<Ride | null | undefined>(undefined); // undefined for initial loading, null if not found
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [chatModalTitle, setChatModalTitle] = useState("");


  useEffect(() => {
    if (rideId) {
      const foundRide = getRideById(rideId);
      setRide(foundRide);
    }
  }, [rideId, getRideById, ridesLoading, currentUser, ]); 
  // Removed 'rides' from dependency array as getRideById should be stable if rides itself hasn't changed in a way that affects this specific ride's data directly.

  const isLoading = ridesLoading || authLoading || ride === undefined;

  const handleOpenChatModal = () => {
    if (!ride || !currentUser) return;
    let title = "";
    if (currentUser.role === 'passenger') {
      title = `Chat with Driver (${ride.driverName || 'Driver'})`;
    } else if (currentUser.role === 'driver' && ride.driverId === currentUser.id) {
      title = `Group Chat for ride to ${ride.destination}`;
    }
    setChatModalTitle(title);
    setIsChatModalOpen(true);
  };


  if (isLoading) {
    return (
      <div className="container mx-auto p-4 space-y-4">
        <Skeleton className="h-8 w-24 mb-4" />
        <Card className="shadow-xl rounded-xl">
          <CardHeader><Skeleton className="h-8 w-3/4" /><Skeleton className="h-4 w-1/2 mt-2" /></CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-16 w-full" />
          </CardContent>
          <CardFooter><Skeleton className="h-10 w-full" /></CardFooter>
        </Card>
      </div>
    );
  }

  if (!ride) {
    return (
      <div className="container mx-auto p-4 text-center">
        <Alert variant="destructive" className="max-w-md mx-auto">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Ride Not Found</AlertTitle>
          <AlertDescription>
            The ride you are looking for does not exist or has been removed.
          </AlertDescription>
        </Alert>
        <Button onClick={() => router.back()} variant="outline" className="mt-6">
            <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
      </div>
    );
  }

  const isPassenger = currentUser?.role === 'passenger';
  const isDriver = currentUser?.role === 'driver';
  const passengerIsOnThisRide = isPassenger && currentUser && ride.passengers.some(p => p.userId === currentUser.id);
  const isRideOwnerDriver = isDriver && currentUser && ride.driverId === currentUser.id;


  const handleCall = () => {
    let phoneNumberToCall = '';
    if (isPassenger && ride.driverPhoneNumber) {
      phoneNumberToCall = ride.driverPhoneNumber;
    } else if (isRideOwnerDriver) {
      if (ride.passengers.length > 0 && ride.passengers[0].phoneNumber) {
        phoneNumberToCall = ride.passengers[0].phoneNumber;
      } else if (ride.passengers.length === 0) {
        toast({ title: "No Passengers", description: "There are no passengers to call for this ride." });
        return;
      } else {
         toast({ title: "Multiple Passengers", description: "Please use chat to communicate with multiple passengers or select one (feature coming soon)." });
        return;
      }
    }

    if (phoneNumberToCall) {
      // Ensure +91 prefix for Indian numbers if it's not already there
      const formattedPhoneNumber = phoneNumberToCall.startsWith('+91') ? phoneNumberToCall : `+91${phoneNumberToCall}`;
      window.location.href = `tel:${formattedPhoneNumber}`;
    } else {
      toast({ title: "Contact Unavailable", description: "Phone number not found for this contact." });
    }
  };


  const handleReserve = async () => {
    const success = await reserveSeat(ride.id);
    if (success) toast({ title: "Seat Reserved!" }); else toast({ title: "Reservation Failed", variant: "destructive" });
    setRide(getRideById(rideId)); 
  };

  const handleCancel = async () => {
    const success = await cancelReservation(ride.id);
    if (success) toast({ title: "Reservation Cancelled" }); else toast({ title: "Cancellation Failed", variant: "destructive" });
    setRide(getRideById(rideId));
  };

  const handleStart = async () => {
    const success = await updateRideStatus(ride.id, 'On Route', 10); 
    if (success) toast({ title: "Ride Started!" }); else toast({ title: "Failed to Start Ride", variant: "destructive" });
    setRide(getRideById(rideId));
  };

  const handleComplete = async () => {
    const success = await updateRideStatus(ride.id, 'Completed', 100); 
    if (success) toast({ title: "Ride Completed!" }); else toast({ title: "Failed to Complete Ride", variant: "destructive" });
    setRide(getRideById(rideId));
  };
  
  const handleAccept = async () => {
    const success = await acceptRideRequest(ride.id);
    if (success) toast({ title: "Request Accepted!" }); else toast({ title: "Failed to Accept", variant: "destructive" });
    setRide(getRideById(rideId));
  };

  const hasActions = (isPassenger && ride.status === 'Scheduled' && !passengerIsOnThisRide && ride.seatsAvailable > 0) ||
                     (isPassenger && passengerIsOnThisRide && (ride.status === 'Scheduled' || ride.status === 'About to Depart')) ||
                     (isDriver && ride.status === 'Requested' && !isRideOwnerDriver) ||
                     (isDriver && isRideOwnerDriver && ride.status === 'Scheduled') ||
                     (isDriver && isRideOwnerDriver && ride.status === 'On Route') ||
                     (isDriver && isRideOwnerDriver && (ride.status === 'Scheduled' || ride.status === 'About to Depart' || ride.status === 'On Route'));


  return (
    <div className="container mx-auto p-4">
      <Button onClick={() => router.back()} variant="outline" size="sm" className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>
      <Card className="shadow-xl rounded-xl overflow-hidden">
        <CardHeader className="bg-primary/10 p-6">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl md:text-2xl text-primary mb-1">
                {ride.origin} to {ride.destination}
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground flex items-center">
                <Clock className="mr-2 h-4 w-4" />
                {format(new Date(ride.departureTime), "PPp")}
              </CardDescription>
            </div>
            <span className={`px-3 py-1 text-xs font-semibold rounded-full text-white ${
              ride.status === 'Completed' ? 'bg-green-600' :
              ride.status === 'Cancelled' ? 'bg-red-600' :
              ride.status === 'On Route' ? 'bg-blue-600 animate-pulse' :
              ride.status === 'Requested' ? 'bg-orange-500' :
              'bg-yellow-600' // Default for Scheduled, About to Depart etc.
            }`}>
              {ride.status}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3 p-4 bg-secondary/30 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold text-primary flex items-center mb-2">
                <Car className="mr-2 h-5 w-5" />Driver Details
              </h3>
              {ride.driverName ? (
                <>
                  <p className="flex items-center text-sm"><User className="inline mr-2 h-4 w-4 text-muted-foreground"/>Name: {ride.driverName}</p>
                  <p className="flex items-center text-sm"><Phone className="inline mr-2 h-4 w-4 text-muted-foreground"/>Phone: {ride.driverPhoneNumber ? `+91 ${ride.driverPhoneNumber}` : 'N/A'}</p>
                </>
              ) : ride.status === 'Requested' ? (
                 <p className="text-sm text-muted-foreground">Awaiting driver assignment...</p>
              ) : (
                <p className="text-sm text-muted-foreground">Driver details not available.</p>
              )}
            </div>
            <div className="space-y-3 p-4 bg-secondary/30 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold text-primary flex items-center mb-2">
                <Users className="mr-2 h-5 w-5" />Ride Capacity
              </h3>
              <p className="text-sm">Seats Available: {ride.seatsAvailable} / {ride.totalSeats}</p>
              {ride.status !== 'Requested' && ride.passengers.length > 0 && (
                <div>
                    <h4 className="text-sm font-medium mt-2 mb-1 text-muted-foreground">Passengers ({ride.passengers.length}):</h4>
                    <ScrollArea className="max-h-24 text-sm">
                      <ul className="list-disc list-inside text-muted-foreground space-y-1">
                          {ride.passengers.map(p => <li key={p.userId}>{p.name}</li>)}
                      </ul>
                    </ScrollArea>
                </div>
              )}
              {ride.status === 'Requested' && ride.requestedBy && (
                <p className="text-sm text-muted-foreground">Requested by: A passenger</p> 
              )}
            </div>
          </div>
          
          {(isPassenger || (isRideOwnerDriver)) && ride.status !== 'Completed' && ride.status !== 'Cancelled' && (
             <div className="grid grid-cols-2 gap-3 pt-2">
                <Button 
                  variant="outline"
                  onClick={handleCall}
                  disabled={(isPassenger && !ride.driverPhoneNumber) || (isRideOwnerDriver && ride.passengers.length === 0)}
                ><Phone className="mr-2 h-4 w-4" /> Call {isPassenger ? (ride.driverName || 'Driver') : (ride.passengers.length > 0 ? 'Passenger(s)' : 'Driver')}</Button>
                <Button 
                  variant="outline"
                  onClick={handleOpenChatModal}
                ><MessageSquare className="mr-2 h-4 w-4" /> Chat</Button>
            </div>
          )}

        </CardContent>
        <CardFooter className={hasActions ? "p-4 border-t" : "p-6 bg-secondary/30"}>
          {/* Passenger Actions */}
          {isPassenger && ride.status === 'Scheduled' && !passengerIsOnThisRide && ride.seatsAvailable > 0 && (
            <Button onClick={handleReserve} className="w-full bg-accent text-accent-foreground hover:bg-accent/90"><CheckCircle className="mr-2 h-4 w-4" />Reserve Spot</Button>
          )}
          {isPassenger && passengerIsOnThisRide && (ride.status === 'Scheduled' || ride.status === 'About to Depart') && (
            <Button onClick={handleCancel} variant="destructive" className="w-full"><XCircle className="mr-2 h-4 w-4" />Cancel My Reservation</Button>
          )}

          {/* Driver Actions */}
          {isDriver && ride.status === 'Requested' && !isRideOwnerDriver && ( 
            <Button onClick={handleAccept} className="w-full bg-green-500 hover:bg-green-600 text-white"><CheckCircle className="mr-2 h-4 w-4" />Accept Ride Request</Button>
          )}
          {isDriver && isRideOwnerDriver && ride.status === 'Scheduled' && (
            <Button onClick={handleStart} className="w-full"><PlayCircle className="mr-2 h-4 w-4" />Start Ride</Button>
          )}
          {isDriver && isRideOwnerDriver && ride.status === 'On Route' && (
            <Button onClick={handleComplete} className="w-full"><Flag className="mr-2 h-4 w-4" />Complete Ride</Button>
          )}
          {isDriver && isRideOwnerDriver && (ride.status === 'Scheduled' || ride.status === 'About to Depart' || ride.status === 'On Route') && (
             <Button onClick={async () => {
                await updateRideStatus(ride.id, "Cancelled");
                toast({title: "Ride Cancelled", variant: "destructive"});
                setRide(getRideById(rideId));
             }} variant="destructive" className="w-full mt-2"><XCircle className="mr-2 h-4 w-4" />Cancel Entire Ride</Button>
          )}
          
          {(ride.status === 'Completed' || ride.status === 'Cancelled') && (
            <p className="text-center text-muted-foreground w-full">This ride is {ride.status.toLowerCase()}. No further actions available.</p>
          )}
        </CardFooter>
      </Card>
      {rideId && currentUser && (
        <ChatModal 
          isOpen={isChatModalOpen} 
          onClose={() => setIsChatModalOpen(false)} 
          rideId={rideId} 
          chatTitle={chatModalTitle}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}
