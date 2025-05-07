
"use client";

import type { Ride, UserRole } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Clock, MapPin, Users, Phone, MessageSquare, CheckCircle, XCircle, PlayCircle, Flag, Check, CircleDot, Hourglass, Car } from 'lucide-react';
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
  onOpenChat?: (rideId: string, chatTitle: string) => void; // New prop for opening chat
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
  isCurrentRide = false,
  className,
}: RideCardProps) {
  const { currentUser } = useAuth(); 
  const { toast } = useToast();
  const { id, origin, destination, departureTime, seatsAvailable, totalSeats, status, driverName, driverPhoneNumber, passengers, progress } = ride;

  const isPassenger = userRole === 'passenger';
  const isDriver = userRole === 'driver';
  
  const passengerIsOnThisRide = isPassenger && currentUser && passengers.some(p => p.userId === currentUser.id);

  const handleCall = () => {
    let phoneNumberToCall = '';
    let contactName = '';

    if (isPassenger && driverPhoneNumber) {
      phoneNumberToCall = driverPhoneNumber;
      contactName = driverName || 'Driver';
    } else if (isDriver && currentUser && ride.driverId === currentUser.id) {
      if (passengers.length > 0 && passengers[0].phoneNumber) {
        phoneNumberToCall = passengers[0].phoneNumber;
        contactName = passengers[0].name || 'Passenger';
      } else {
        toast({ title: "No passenger to call", description: "There are no passengers on this ride yet.", variant: "default" });
        return;
      }
    }

    if (phoneNumberToCall) {
      window.location.href = `tel:${phoneNumberToCall}`;
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
    if (status === 'Requested' || status === 'Completed' || status === 'Cancelled') return null;
    
    if (isCurrentRide && passengerIsOnThisRide) {
       return (
        <>
          {status !== 'On Route' && status !== 'Destination Reached' && (
            <Button onClick={() => onConfirmBoarded?.(id)} size="sm" variant="outline" className="w-full">
              <Check className="mr-2 h-4 w-4" /> Confirm Boarded
            </Button>
          )}
          { (status === 'Scheduled' || status === 'About to Depart') && 
            <Button onClick={() => onCancelReservation?.(id)} size="sm" variant="destructive" className="w-full mt-2">
                <XCircle className="mr-2 h-4 w-4" /> Cancel Seat
            </Button>
          }
        </>
      );
    }

    if (passengerIsOnThisRide) { 
      return (
        <Button onClick={() => onCancelReservation?.(id)} size="sm" variant="outline" className="w-full">
          <XCircle className="mr-2 h-4 w-4" /> Cancel Reservation
        </Button>
      );
    }

    if (seatsAvailable > 0 && status === 'Scheduled' && onReserve) {
      return (
        <Button onClick={() => onReserve(id)} size="sm" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
          Reserve Spot
        </Button>
      );
    }
    if (status === 'Scheduled' && seatsAvailable <= 0) {
        return <p className="text-sm text-muted-foreground">Ride is full.</p>;
    }
    return null; 
  };

  const renderDriverActions = () => {
    if (!currentUser || (ride.driverId !== currentUser.id && status !== 'Requested') ) {
        if (status === 'Requested' && onAcceptRequest && isDriver) {
             return (
                <Button onClick={() => onAcceptRequest(id)} size="sm" className="w-full bg-green-500 hover:bg-green-600 text-white">
                <CheckCircle className="mr-2 h-4 w-4" /> Accept Request
                </Button>
            );
        }
        return null; 
    }
    
    // Driver owns this ride or is considering accepting it
    if (ride.driverId === currentUser.id) {
        if (status === 'Scheduled' && onStartRide) {
        return (
            <Button onClick={() => onStartRide(id)} size="sm" className="w-full">
            <PlayCircle className="mr-2 h-4 w-4" /> Start Ride
            </Button>
        );
        }
        if ((status === 'On Route' || status === 'Destination Reached') && onCompleteRide) { 
        return (
            <Button onClick={() => onCompleteRide(id)} size="sm" className="w-full">
            <Flag className="mr-2 h-4 w-4" /> Complete Ride
            </Button>
        );
        }
        if (isCurrentRide && (status === 'Scheduled' || status === 'About to Depart' || status === 'On Route')) { 
        if(onCancelReservation) { // This is actually "Cancel Entire Ride" for driver
            return (
            <Button onClick={() => onCancelReservation(id)} size="sm" variant="destructive" className="w-full">
                <XCircle className="mr-2 h-4 w-4" /> Cancel Ride
                </Button>
            );
        }
        }
    }
    return null;
  };

  return (
    <Card className={cn("shadow-lg rounded-xl overflow-hidden", className, isCurrentRide ? "border-2 border-primary" : "")}>
      <CardHeader className="bg-primary/10 p-4">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg md:text-xl text-primary">
            {origin} to {destination}
          </CardTitle>
          <div className="flex items-center space-x-2 text-sm text-primary">
            <RideStatusIcon status={status} />
            <span>{status}</span>
          </div>
        </div>
        <CardDescription className="text-sm text-muted-foreground flex items-center">
          <Clock className="mr-2 h-4 w-4" />
          {format(new Date(departureTime), "PPpp")}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {isCurrentRide && (isPassenger || (isDriver && currentUser && ride.driverId === currentUser.id )) && (ride.status === 'On Route' || ride.status === 'Arriving' || ride.status === 'At Source' || ride.status === 'Waiting' || ride.status === 'Destination Reached') && (
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground">RIDE PROGRESS</Label>
            <div className="flex items-center space-x-2 text-sm">
              <MapPin className="h-4 w-4 text-primary" /> <span>{origin}</span>
              <Progress value={progress || 0} className="flex-1 h-2" />
              <MapPin className="h-4 w-4 text-primary" /> <span>{destination}</span>
            </div>
          </div>
        )}
        
        {isPassenger && driverName && (
          <p className="text-sm flex items-center"><Car className="mr-2 h-4 w-4 text-muted-foreground" /> Driver: {driverName}</p>
        )}
         {!driverName && status === 'Requested' && (
            <p className="text-sm text-muted-foreground">Awaiting driver assignment...</p>
        )}
        
        <div className="flex justify-between items-center text-sm">
          <div className="flex items-center">
            <Users className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>
              {status === 'Requested' ? 'Awaiting driver' : `${seatsAvailable} / ${totalSeats} seats left`}
            </span>
          </div>
          {isDriver && status !== 'Requested' && currentUser && ride.driverId === currentUser.id && (
            <p className="text-sm">Passengers: {passengers.length}</p>
          )}
        </div>

        {isCurrentRide && (status === 'On Route' || status === 'Scheduled' || status === 'About to Depart') && (currentUser && (passengerIsOnThisRide || (ride.driverId === currentUser.id && passengers.length > 0) )) && (
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
            (!isCurrentRide) ||
            (isCurrentRide && isPassenger && !passengerIsOnThisRide && status === 'Scheduled' && seatsAvailable > 0) ||
            (status === 'Requested' && currentUser && ride.requestedBy === currentUser.id)
        ) && (
          <Button onClick={() => onViewDetails(id)} variant="link" size="sm" className="w-full text-primary mt-2">
            View Details
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
