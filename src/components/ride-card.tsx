
"use client";

import type { Ride, UserRole } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Clock, MapPin, Users, Phone, MessageSquare, CheckCircle, XCircle, PlayCircle, Flag, Check, CircleDot, Hourglass, Car, Edit, Trash2, UserCheck, ShieldCheck, Lock, Repeat } from 'lucide-react';
import { format } from 'date-fns';
import { LOCATIONS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';

interface RideCardProps {
  ride: Ride;
  userRole: UserRole;
  onReserve?: (rideId: string) => void;
  onCancelReservation?: (rideId: string) => void;
  onViewDetails?: (rideId: string) => void;
  onStartRide?: (rideId: string) => void;
  onCompleteRide?: (rideId: string) => void;
  onAcceptRequest?: (rideId: string) => void;
  onConfirmBoarded?: (rideId: string) => void;
  onOpenChat?: (rideId: string, chatTitle: string) => void;
  onEditRide?: (rideId: string) => void;
  onDeleteRide?: (rideId: string) => void;
  onDeleteRequest?: (rideId: string) => void; 
  isCurrentRide?: boolean;
  className?: string;
}

const RideStatusIcon = ({ status }: { status: Ride['status'] }) => {
  switch (status) {
    case 'Scheduled': return <Clock className="w-4 h-4 text-blue-500" />;
    case 'About to Depart': return <Hourglass className="w-4 h-4 text-yellow-500" />;
    case 'On Route': return <Car className="w-4 h-4 text-green-500 animate-pulse" />;
    case 'Completed': return <CheckCircle className="w-4 h-4 text-green-700" />;
    case 'Cancelled': return <XCircle className="w-4 h-4 text-red-500" />;
    case 'Requested': return <Hourglass className="w-4 h-4 text-orange-500" />;
    case 'Arriving': return <Car className="w-4 h-4 text-lime-500" />;
    case 'At Source': return <MapPin className="w-4 h-4 text-teal-500" />;
    case 'Waiting': return <Hourglass className="w-4 h-4 text-amber-500" />;
    case 'Destination Reached': return <Flag className="w-4 h-4 text-emerald-600" />;
    case 'Expired': return <XCircle className="w-4 h-4 text-slate-500" />;
    default: return <CircleDot className="w-4 h-4 text-gray-500" />;
  }
};


export function RideCard({
  ride,
  userRole,
  onReserve,
  onCancelReservation,
  onViewDetails,
  onStartRide,
  onCompleteRide,
  onAcceptRequest,
  onConfirmBoarded,
  onOpenChat,
  onEditRide,
  onDeleteRide,
  onDeleteRequest, 
  isCurrentRide = false,
  className,
}: RideCardProps) {
  const { currentUser } = useAuth(); 
  const { toast } = useToast();
  const { id, origin, destination, departureTime, seatsAvailable, totalSeats, status, driverName, driverPhoneNumber, passengers, requestType, wasCreatedAsRecurring } = ride;

  const isPassenger = userRole === 'passenger';
  const isDriver = userRole === 'driver';
  
  const passengerIsOnThisRide = isPassenger && currentUser && passengers.some(p => p.userId === currentUser.id);
  const isRideRequestedByCurrentUser = currentUser && ride.requestedBy === currentUser.id;

  const handleCall = () => {
    let phoneNumberToCall = '';
    if (isPassenger && driverPhoneNumber) {
      phoneNumberToCall = driverPhoneNumber;
    } else if (isDriver && currentUser && ride.driverId === currentUser.id) {
      if (passengers.length > 0 && passengers[0].phoneNumber) {
        phoneNumberToCall = passengers[0].phoneNumber;
      } else {
        toast({ title: "No passenger to call", description: "There are no passengers on this ride yet.", variant: "default" });
        return;
      }
    }

    if (phoneNumberToCall) {
      // Ensure +91 prefix for Indian numbers if it's not already there
      const formattedPhoneNumber = phoneNumberToCall.startsWith('+91') ? phoneNumberToCall : `+91${phoneNumberToCall}`;
      window.location.href = `tel:${formattedPhoneNumber}`;
    } else {
      toast({ title: "Cannot make call", description: "Contact information is not available.", variant: "destructive" });
    }
  };

  const handleChat = () => {
    if (!onOpenChat) return;
    let chatTitle = "";
    if (isPassenger) {
      chatTitle = `Chat with Driver (${driverName || 'Driver'})`;
    } else if (isDriver && currentUser && ride.driverId === currentUser.id) {
      chatTitle = `Group Chat for ride to ${destination}`;
    }
    if (chatTitle) {
      onOpenChat(id, chatTitle);
    } else {
       toast({ title: "Chat Unavailable", description: "Cannot initiate chat for this ride.", variant: "default" });
    }
  };


  const renderPassengerActions = () => {
    if (status === 'Completed' || status === 'Cancelled' || status === 'Expired') return null;
    
    if (isCurrentRide && passengerIsOnThisRide) {
       return (
        <>
          {(status === 'On Route' || status === 'Arriving' || status === 'At Source' || status === 'Waiting') && onConfirmBoarded && (
            <Button onClick={() => onConfirmBoarded?.(id)} size="sm" variant="outline" className="w-full">
              <Check className="mr-2 h-4 w-4" /> Confirm Boarded
            </Button>
          )}
          { (status === 'Scheduled' || status === 'About to Depart') && onCancelReservation &&
            <Button onClick={() => onCancelReservation?.(id)} size="sm" variant="destructive" className="w-full mt-2">
                <XCircle className="mr-2 h-4 w-4" /> Cancel Seat
            </Button>
          }
        </>
      );
    }

    if (passengerIsOnThisRide) { 
      if ((status === 'Scheduled' || status === 'About to Depart') && onCancelReservation) {
        return (
            <Button onClick={() => onCancelReservation?.(id)} size="sm" variant="outline" className="w-full">
            <XCircle className="mr-2 h-4 w-4" /> Cancel Reservation
            </Button>
        );
      }
    }
    
    if (status === 'Scheduled' && onReserve && requestType !== 'full_reserved' && seatsAvailable > 0 && !isRideRequestedByCurrentUser) {
      return (
        <Button onClick={() => onReserve(id)} size="sm" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
          Reserve Spot
        </Button>
      );
    }
    if (status === 'Scheduled' && seatsAvailable <= 0 && !isRideRequestedByCurrentUser) {
        return <p className="text-sm text-muted-foreground text-center">Ride is full.</p>;
    }
    if (status === 'Scheduled' && requestType === 'full_reserved' && !isRideRequestedByCurrentUser) {
        return <p className="text-sm text-muted-foreground text-center flex items-center justify-center"><Lock className="w-3 h-3 mr-1"/> Private Ride</p>;
    }

    if (status === 'Requested' && isPassenger && isRideRequestedByCurrentUser && onDeleteRequest) {
      return (
        <Button onClick={() => onDeleteRequest(id)} size="sm" variant="destructive" className="w-full">
          <Trash2 className="mr-2 h-4 w-4" /> Delete Request
        </Button>
      );
    }
    return null; 
  };

  const renderDriverActions = () => {
    if (!currentUser) return null;

    if (status === 'Requested' && onAcceptRequest && isDriver && ride.driverId !== currentUser.id) { 
      return (
        <Button onClick={() => onAcceptRequest(id)} size="sm" className="w-full bg-green-500 hover:bg-green-600 text-white">
          <CheckCircle className="mr-2 h-4 w-4" /> Accept Request
        </Button>
      );
    }

    if (ride.driverId === currentUser.id) {
      if (status === 'Scheduled') {
        return (
          <div className="space-y-2">
            {onStartRide && (
              <Button 
                onClick={() => onStartRide(id)} 
                size="sm" 
                className="w-full bg-green-500 hover:bg-green-600 text-white"
              >
                <PlayCircle className="mr-2 h-4 w-4" /> Start Ride
              </Button>
            )}
            {(onEditRide || onDeleteRide) && !isCurrentRide && (
              <div className="grid grid-cols-2 gap-2">
                {onEditRide && (
                  <Button onClick={() => onEditRide(id)} variant="outline" size="sm" className="w-full">
                    <Edit className="mr-2 h-4 w-4" /> Edit
                  </Button>
                )}
                {onDeleteRide && (
                  <Button onClick={() => onDeleteRide(id)} variant="destructive" size="sm" className="w-full">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </Button>
                )}
              </div>
            )}
            {isCurrentRide && onCancelReservation && ( 
                 <Button onClick={() => onCancelReservation(id)} size="sm" variant="destructive" className="w-full mt-2">
                    <XCircle className="mr-2 h-4 w-4" /> Cancel Ride
                </Button>
            )}
          </div>
        );
      }
      if ((status === 'On Route' || status === 'Destination Reached') && onCompleteRide) {
        return (
          <Button onClick={() => onCompleteRide(id)} size="sm" className="w-full">
            <Flag className="mr-2 h-4 w-4" /> Complete Ride
          </Button>
        );
      }
      if (isCurrentRide && (status === 'About to Depart' || status === 'On Route') && onCancelReservation) {
           return (
            <Button onClick={() => onCancelReservation(id)} size="sm" variant="destructive" className="w-full">
                <XCircle className="mr-2 h-4 w-4" /> Cancel Ride
            </Button>
            );
      }
    }
    return null;
  };

  return (
    <Card className={cn("shadow-lg rounded-xl overflow-hidden", className, isCurrentRide ? "border-2 border-primary" : "")}>
      <CardHeader className="bg-primary/10 p-4">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg md:text-xl text-primary flex items-center">
            {origin} to {destination}
            {wasCreatedAsRecurring && <Repeat className="ml-2 h-4 w-4 text-primary/70" />}
          </CardTitle>
          <div className="flex items-center space-x-2 text-sm text-primary">
            <RideStatusIcon status={status} />
            <span>{status}</span>
          </div>
        </div>
        <CardDescription className="text-sm text-muted-foreground flex items-center">
          <Clock className="mr-2 h-4 w-4" />
          {format(new Date(departureTime), "PPp")}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        
        {isPassenger && driverName && status !== 'Requested' && (
          <p className="text-sm flex items-center"><Car className="mr-2 h-4 w-4 text-muted-foreground" /> Driver: {driverName}</p>
        )}
        {status === 'Requested' && (
            <div className="text-sm space-y-1">
                 <p className="flex items-center">
                    {requestType === 'full_reserved' ? <ShieldCheck className="mr-2 h-4 w-4 text-primary" /> : <Users className="mr-2 h-4 w-4 text-muted-foreground" />} 
                    Type: {requestType === 'full_reserved' ? 'Full Reserved (Private)' : 'Sharing'}
                </p>
                {isDriver && ride.requestedBy && (
                    <p className="flex items-center"><UserCheck className="mr-2 h-4 w-4 text-muted-foreground"/> Requested by a passenger</p>
                )}
                {isPassenger && isRideRequestedByCurrentUser && (
                     <p className="text-muted-foreground">Awaiting driver assignment...</p>
                )}
            </div>
        )}
        
        {status !== 'Requested' && (
            <div className="flex justify-between items-center text-sm">
            <div className="flex items-center">
                <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>
                {seatsAvailable} / {totalSeats} seats left
                </span>
            </div>
            {isDriver && currentUser && ride.driverId === currentUser.id && (
                <p className="text-sm">Passengers: {passengers.length}</p>
            )}
            </div>
        )}


        {isCurrentRide && (status === 'On Route' || status === 'Scheduled' || status === 'About to Depart' || status === 'Arriving' || status === 'At Source' || status === 'Waiting' || status === 'Destination Reached') && (currentUser && (passengerIsOnThisRide || (ride.driverId === currentUser.id && passengers.length > 0) )) && (
          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleCall}
              disabled={isDriver && ride.driverId === currentUser.id && passengers.length === 0 && !driverPhoneNumber}
            >
              <Phone className="mr-2 h-4 w-4" /> Call {isPassenger ? (driverName || 'Driver') : (passengers.length > 0 ? passengers[0].name.split(" ")[0] : 'Passenger')}
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleChat}
              disabled={!onOpenChat}
            >
              <MessageSquare className="mr-2 h-4 w-4" /> Chat
            </Button>
          </div>
        )}

      </CardContent>
      <CardFooter className="p-4 bg-secondary/30 space-y-2 flex flex-col items-stretch">
        {isPassenger && renderPassengerActions()}
        {isDriver && renderDriverActions()}
        
        {onViewDetails && (
            (!isCurrentRide && status !== 'Expired') ||
            (isCurrentRide && isPassenger && !passengerIsOnThisRide && status === 'Scheduled' && seatsAvailable > 0) ||
            (status === 'Requested' && currentUser && (isRideRequestedByCurrentUser || userRole === 'driver'))
        ) && (
          <Button onClick={() => onViewDetails(id)} variant="link" size="sm" className="w-full text-primary mt-2">
            View Details
          </Button>
        )}
         {status === 'Expired' && (
            <p className="text-xs text-center text-muted-foreground">This ride request has expired.</p>
        )}
      </CardFooter>
    </Card>
  );
}

