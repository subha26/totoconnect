
"use client";

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useRides } from '@/contexts/ride-context';
import { useAuth } from '@/contexts/auth-context';
import type { Ride } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { MapPin, Clock, Users, User, Phone, MessageSquare, Car, ArrowLeft, ShieldAlert, CheckCircle, XCircle, PlayCircle, Flag } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

export default function RideDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rideId = typeof params.id === 'string' ? params.id : '';
  
  const { getRideById, isLoading: ridesLoading, reserveSeat, cancelReservation, updateRideStatus, acceptRideRequest } = useRides();
  const { currentUser, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [ride, setRide] = useState<Ride | null | undefined>(undefined); // undefined for initial loading, null if not found

  useEffect(() => {
    if (rideId) {
      const foundRide = getRideById(rideId);
      setRide(foundRide);
    }
  }, [rideId, getRideById, ridesLoading, currentUser]); // Re-fetch if ridesLoading changes or current user changes (for actions)

  const isLoading = ridesLoading || authLoading || ride === undefined;

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 space-y-4">
        <Skeleton className="h-8 w-24 mb-4" />
        <Card className="shadow-xl rounded-xl">
          <CardHeader><Skeleton className="h-8 w-3/4" /><Skeleton className="h-4 w-1/2 mt-2" /></CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-4 w-full" />
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


  const handleReserve = async () => {
    const success = await reserveSeat(ride.id);
    if (success) toast({ title: "Seat Reserved!" }); else toast({ title: "Reservation Failed", variant: "destructive" });
    setRide(getRideById(rideId)); // Refresh ride details
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

  return (
    <div className="container mx-auto p-4">
      <Button onClick={() => router.back()} variant="outline" size="sm" className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>
      <Card className="shadow-xl rounded-xl overflow-hidden">
        <CardHeader className="bg-primary/10 p-6">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl text-primary mb-1">
                {ride.origin} to {ride.destination}
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground flex items-center">
                <Clock className="mr-2 h-4 w-4" />
                {format(new Date(ride.departureTime), "PPpp")}
              </CardDescription>
            </div>
            <span className={`px-3 py-1 text-xs font-semibold rounded-full text-white ${
              ride.status === 'Completed' ? 'bg-green-600' :
              ride.status === 'Cancelled' ? 'bg-red-600' :
              ride.status === 'On Route' ? 'bg-blue-600 animate-pulse' :
              ride.status === 'Requested' ? 'bg-orange-500' :
              'bg-yellow-600'
            }`}>
              {ride.status}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {ride.status === 'On Route' && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-muted-foreground">RIDE PROGRESS</Label>
              <div className="flex items-center space-x-3 text-sm">
                <MapPin className="h-5 w-5 text-primary" /> <span className="truncate w-1/3">{ride.origin}</span>
                <Progress value={ride.progress || 0} className="flex-1 h-3" />
                <MapPin className="h-5 w-5 text-primary" /> <span className="truncate w-1/3 text-right">{ride.destination}</span>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground flex items-center"><Car className="mr-2 h-5 w-5 text-primary" />Driver Details</h3>
              {ride.driverName ? (
                <>
                  <p><User className="inline mr-2 h-4 w-4 text-muted-foreground"/>Name: {ride.driverName}</p>
                  <p><Phone className="inline mr-2 h-4 w-4 text-muted-foreground"/>Phone: {ride.driverPhoneNumber || 'N/A'}</p>
                </>
              ) : ride.status === 'Requested' ? (
                 <p className="text-muted-foreground">Awaiting driver assignment...</p>
              ) : (
                <p className="text-muted-foreground">Driver details not available.</p>
              )}
            </div>
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground flex items-center"><Users className="mr-2 h-5 w-5 text-primary" />Ride Capacity</h3>
              <p>Seats Available: {ride.seatsAvailable} / {ride.totalSeats}</p>
              {ride.status !== 'Requested' && ride.passengers.length > 0 && (
                <div>
                    <h4 className="text-sm font-medium mt-2 mb-1">Passengers ({ride.passengers.length}):</h4>
                    <ul className="list-disc list-inside text-sm text-muted-foreground max-h-24 overflow-y-auto">
                        {ride.passengers.map(p => <li key={p.userId}>{p.name}</li>)}
                    </ul>
                </div>
              )}
              {ride.status === 'Requested' && ride.requestedBy && (
                <p className="text-sm text-muted-foreground">Requested by: A passenger</p> 
              )}
            </div>
          </div>
          
          {(isPassenger || (isDriver && isRideOwnerDriver)) && ride.status !== 'Completed' && ride.status !== 'Cancelled' && (
             <div className="grid grid-cols-2 gap-3 pt-4 border-t mt-4">
                <Button 
                  variant="outline"
                  onClick={() => toast({ title: "Simulated Call", description: `Calling ${isPassenger ? (ride.driverName || 'Driver') : 'Passengers'}... (Simulated)`})}
                ><Phone className="mr-2 h-4 w-4" /> Call {isPassenger ? (ride.driverName || 'Driver') : 'Passengers'}</Button>
                <Button 
                  variant="outline"
                  onClick={() => toast({ title: "Simulated Chat", description: `Opening chat with ${isPassenger ? (ride.driverName || 'Driver') : 'Passengers'}... (Simulated)`})}
                ><MessageSquare className="mr-2 h-4 w-4" /> Chat</Button>
            </div>
          )}

        </CardContent>
        <CardFooter className="p-6 bg-secondary/30">
          {/* Passenger Actions */}
          {isPassenger && ride.status === 'Scheduled' && !passengerIsOnThisRide && ride.seatsAvailable > 0 && (
            <Button onClick={handleReserve} className="w-full bg-accent text-accent-foreground hover:bg-accent/90"><CheckCircle className="mr-2 h-4 w-4" />Reserve Spot</Button>
          )}
          {isPassenger && passengerIsOnThisRide && (ride.status === 'Scheduled' || ride.status === 'About to Depart') && (
            <Button onClick={handleCancel} variant="destructive" className="w-full"><XCircle className="mr-2 h-4 w-4" />Cancel My Reservation</Button>
          )}

          {/* Driver Actions */}
          {isDriver && ride.status === 'Requested' && !isRideOwnerDriver && ( // Ensure driver is not the one who posted this requested ride (if logic allows)
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
    </div>
  );
}

