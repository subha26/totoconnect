
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { Ride, RideStatus, User, RidePassenger, RideFirestoreData, RideRequestType } from '@/lib/types';
import { LOCATIONS, DEFAULT_TOTAL_SEATS } from '@/lib/constants';
import { useAuth } from './auth-context';
import { db } from '@/lib/firebase';
import { 
  collection, 
  addDoc, 
  doc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  Timestamp,
  onSnapshot,
  arrayUnion,
  arrayRemove,
  writeBatch
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface RideContextType {
  rides: Ride[];
  isLoading: boolean;
  requestRide: (departureTime: Date, origin: string, destination: string, requestType: RideRequestType) => Promise<{success: boolean; rideId: string | null; message?: string}>;
  reserveSeat: (rideId: string) => Promise<boolean>;
  cancelReservation: (rideId: string) => Promise<boolean>;
  postRide: (departureTime: Date, origin: string, destination: string, totalSeats: number) => Promise<string | null>;
  updateRideStatus: (rideId: string, status: RideStatus, progress?: number) => Promise<boolean>;
  acceptRideRequest: (rideId: string) => Promise<boolean>;
  getRideById: (rideId: string) => Ride | undefined;
  updateRideDetails: (rideId: string, details: Partial<RideFirestoreData>) => Promise<boolean>;
  deleteRide: (rideId: string) => Promise<boolean>;
  passengerUpcomingRides: Ride[];
  passengerPastRides: Ride[];
  driverUpcomingRides: Ride[];
  driverPastRides: Ride[];
  driverRideRequests: Ride[];
  currentPassengerRide: Ride | null;
  currentDriverRide: Ride | null;
  passengerActiveRequests: Ride[];
}

const RideContext = createContext<RideContextType | undefined>(undefined);

const RIDES_COLLECTION = "rides";

export const RideProvider = ({ children }: { children: ReactNode }) => {
  const { currentUser } = useAuth();
  const [rides, setRides] = useState<Ride[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const prevRidesRef = useRef<Ride[]>([]); // For notification logic

  useEffect(() => {
    setIsLoading(true);
    const ridesQuery = query(collection(db, RIDES_COLLECTION), orderBy("departureTime", "desc"));
    
    const unsubscribe = onSnapshot(ridesQuery, (querySnapshot) => {
      const fetchedRides: Ride[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const ride = { 
          ...data, 
          id: docSnap.id,
          departureTime: (data.departureTime as Timestamp).toDate().toISOString(),
        } as Ride;

        // Rule 3c: Filter out expired 'Requested' rides (client-side representation)
        // Or, if backend could update them to 'Expired', that would be better.
        if (ride.status === 'Requested' && new Date(ride.departureTime) < new Date()) {
          // Consider this ride 'Expired' for display purposes or further actions.
          // Optionally, update its status in DB if it makes sense for your flow.
          // For now, we just filter or handle it in derived state.
          // This ride might be "deleted" from user view by not including it in lists like driverRideRequests below.
          // Actual deletion might be better as a backend task.
        } else {
          fetchedRides.push(ride);
        }
      });

      // Notification logic
      if (currentUser && prevRidesRef.current.length > 0) {
        // Driver: New ride request
        const oldDriverRequests = prevRidesRef.current.filter(r => r.status === 'Requested' && new Date(r.departureTime) >= new Date());
        const newDriverRequests = fetchedRides.filter(r => r.status === 'Requested' && new Date(r.departureTime) >= new Date());
        if (newDriverRequests.length > oldDriverRequests.length) {
           const newReq = newDriverRequests.find(nr => !oldDriverRequests.some(or => or.id === nr.id));
           if(newReq && newReq.driverId !== currentUser.id) { // Don't notify driver if they requested it somehow (not typical)
             toast({ title: "New Ride Request", description: `A new ride from ${newReq.origin} to ${newReq.destination} has been requested.` });
           }
        }

        // Passenger: Ride request accepted
        const passengerOldRequests = prevRidesRef.current.filter(r => r.requestedBy === currentUser.id && r.status === 'Requested');
        passengerOldRequests.forEach(oldReq => {
          const correspondingNewRide = fetchedRides.find(newRide => newRide.id === oldReq.id);
          if (correspondingNewRide && correspondingNewRide.status === 'Scheduled' && oldReq.status === 'Requested') {
            toast({ title: "Ride Request Accepted!", description: `Your ride from ${correspondingNewRide.origin} to ${correspondingNewRide.destination} is now scheduled.` });
          }
        });
      }
      prevRidesRef.current = fetchedRides;


      setRides(fetchedRides);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching rides: ", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, toast]); // Added toast to dependencies


  const requestRide = async (departureTime: Date, origin: string, destination: string, requestType: RideRequestType): Promise<{success: boolean; rideId: string | null; message?: string}> => {
    if (!currentUser || currentUser.role !== 'passenger') return {success: false, rideId: null, message: "User must be a passenger."};
    
    // Rule 3b: Passenger can post a maximum of 2 active ride requests
    const passengerActiveRideRequests = rides.filter(
      ride => ride.requestedBy === currentUser.id && ride.status === 'Requested' && new Date(ride.departureTime) >= new Date()
    );
    if (passengerActiveRideRequests.length >= 2) {
      return {success: false, rideId: null, message: "You can only have a maximum of 2 active ride requests."};
    }

    // Rule 3a: is handled on client page, but double check here
    if (departureTime < new Date()) {
        return {success: false, rideId: null, message: "Departure time cannot be in the past."};
    }

    setIsLoading(true);
    try {
      let rideTotalSeats: number;
      let rideMaxPassengers: number;
      let rideSeatsAvailable: number;

      if (requestType === 'full_reserved') {
        rideTotalSeats = 1;
        rideMaxPassengers = 1;
        rideSeatsAvailable = 1;
      } else { // 'sharing'
        rideTotalSeats = 4; // As per requirement for sharing
        rideMaxPassengers = 4;
        rideSeatsAvailable = 4;
      }

      const newRideData: RideFirestoreData = { 
        origin,
        destination,
        departureTime: Timestamp.fromDate(departureTime),
        seatsAvailable: rideSeatsAvailable, 
        totalSeats: rideTotalSeats,
        status: 'Requested' as RideStatus,
        driverId: null,
        passengers: [], 
        requestedBy: currentUser.id,
        requestType: requestType,
        maxPassengers: rideMaxPassengers,
        progress: 0,
      };
      const docRef = await addDoc(collection(db, RIDES_COLLECTION), newRideData);
      setIsLoading(false);
      return {success: true, rideId: docRef.id};
    } catch (error) {
      console.error("Error requesting ride: ", error);
      setIsLoading(false);
      return {success: false, rideId: null, message: "Server error while requesting ride."};
    }
  };

  const reserveSeat = async (rideId: string): Promise<boolean> => {
    if (!currentUser || currentUser.role !== 'passenger') return false;
    
    const rideRef = doc(db, RIDES_COLLECTION, rideId);
    try {
      setIsLoading(true);
      const rideSnap = await getDoc(rideRef);
      if (!rideSnap.exists()) {
        toast({ title: "Ride not found", variant: "destructive"});
        setIsLoading(false);
        return false;
      }
      const rideData = rideSnap.data() as Ride;

      if (rideData.status !== 'Scheduled') {
        toast({ title: "Cannot Reserve", description: "This ride is not available for reservation.", variant: "destructive"});
        setIsLoading(false);
        return false;
      }

      if (rideData.passengers.find(p => p.userId === currentUser.id)) {
        toast({ title: "Already Reserved", description: "You have already reserved a seat on this ride.", variant: "destructive"});
        setIsLoading(false);
        return false; 
      }

      if (rideData.requestType === 'full_reserved') {
         toast({ title: "Private Ride", description: "This is a fully reserved private ride.", variant: "destructive"});
         setIsLoading(false);
         return false;
      }
      
      if (rideData.seatsAvailable <= 0) {
        toast({ title: "Ride Full", description: "No more seats available on this ride.", variant: "destructive"});
        setIsLoading(false);
        return false; 
      }
      
      // For sharing, maxPassengers is either totalSeats or a specific value like 4.
      // Assuming totalSeats already reflects the intended capacity (e.g., 4 for sharing).
      if (rideData.passengers.length >= rideData.totalSeats) {
         toast({ title: "Ride Full", description: "This ride has reached its maximum passenger capacity.", variant: "destructive"});
         setIsLoading(false);
         return false;
      }


      await updateDoc(rideRef, {
        seatsAvailable: rideData.seatsAvailable - 1,
        passengers: arrayUnion({ userId: currentUser.id, name: currentUser.name, phoneNumber: currentUser.phoneNumber }),
      });
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error("Error reserving seat: ", error);
      toast({ title: "Reservation Error", description: "Could not reserve seat.", variant: "destructive"});
      setIsLoading(false);
      return false;
    }
  };
  
  const cancelReservation = async (rideId: string): Promise<boolean> => {
    if (!currentUser || currentUser.role !== 'passenger') return false;
    setIsLoading(true);
    const rideRef = doc(db, RIDES_COLLECTION, rideId);
    try {
      const rideSnap = await getDoc(rideRef);
      if (!rideSnap.exists()) {
        setIsLoading(false);
        return false;
      }
      const rideData = rideSnap.data() as Ride;
      const passengerToRemove = rideData.passengers.find(p => p.userId === currentUser.id);

      if (!passengerToRemove) {
         setIsLoading(false);
         return false; 
      }
      // Passengers can only cancel if ride is 'Scheduled' or 'About to Depart'
      if (rideData.status !== 'Scheduled' && rideData.status !== 'About to Depart') {
        toast({ title: "Cancellation Not Allowed", description: "You can only cancel scheduled or about to depart rides.", variant: "destructive"});
        setIsLoading(false);
        return false;
      }

      await updateDoc(rideRef, {
        seatsAvailable: rideData.seatsAvailable + 1,
        passengers: arrayRemove(passengerToRemove),
      });
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error("Error cancelling reservation: ", error);
      setIsLoading(false);
      return false;
    }
  };

  const postRide = async (departureTime: Date, origin: string, destination: string, totalSeats: number): Promise<string|null> => {
    if (!currentUser || currentUser.role !== 'driver') return null;
    setIsLoading(true);

    try {
      const ridesRef = collection(db, RIDES_COLLECTION);
      const q = query(ridesRef, 
        where("driverId", "==", currentUser.id),
        where("origin", "==", origin),
        where("destination", "==", destination),
        where("departureTime", "==", Timestamp.fromDate(departureTime)),
        where("status", "==", 'Scheduled')
      );

      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        toast({
          title: "Duplicate Ride",
          description: "You have already posted an identical ride that is currently scheduled.",
          variant: "destructive",
        });
        setIsLoading(false);
        return null;
      }

      const newRideData: RideFirestoreData = {
        origin,
        destination,
        departureTime: Timestamp.fromDate(departureTime),
        seatsAvailable: totalSeats,
        totalSeats,
        status: 'Scheduled' as RideStatus,
        driverId: currentUser.id,
        driverName: currentUser.name,
        driverPhoneNumber: currentUser.phoneNumber,
        passengers: [],
        progress: 0,
        requestType: 'sharing', // Driver posted rides are by default sharing
        maxPassengers: totalSeats, // For driver posted rides, max passengers is total seats
      };
      const docRef = await addDoc(collection(db, RIDES_COLLECTION), newRideData);
      setIsLoading(false);
      return docRef.id;
    } catch (error) {
      console.error("Error posting ride: ", error);
      setIsLoading(false);
      return null;
    }
  };

  const updateRideStatus = async (rideId: string, status: RideStatus, progress?: number): Promise<boolean> => {
    setIsLoading(true);
    const rideRef = doc(db, RIDES_COLLECTION, rideId);
    try {
      const updateData: Partial<Ride> = { status };
      if (progress !== undefined) {
        updateData.progress = progress;
      }
      await updateDoc(rideRef, updateData);
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error("Error updating ride status: ", error);
      setIsLoading(false);
      return false;
    }
  };

  const acceptRideRequest = async (rideId: string): Promise<boolean> => {
    if (!currentUser || currentUser.role !== 'driver') return false;
    
    const rideRef = doc(db, RIDES_COLLECTION, rideId);
    try {
      setIsLoading(true);
      const rideSnap = await getDoc(rideRef);
      if (!rideSnap.exists()) {
        toast({ title: "Request Not Found", variant: "destructive" });
        setIsLoading(false);
        return false;
      }
      const rideData = rideSnap.data() as Ride;

      if (rideData.status !== 'Requested') {
         toast({ title: "Already Handled", description: "This request is no longer active.", variant: "destructive" });
         setIsLoading(false);
         return false; 
      }
      if (new Date(rideData.departureTime) < new Date()) {
        toast({ title: "Expired Request", description: "This ride request has expired.", variant: "destructive" });
        // Optionally update status to 'Expired'
        await updateDoc(rideRef, { status: 'Expired' });
        setIsLoading(false);
        return false;
      }
      if (!rideData.requestedBy) {
         toast({ title: "Invalid Request", description: "Requester information missing.", variant: "destructive" });
         setIsLoading(false);
         return false;
      }

      const requesterUserDoc = await getDoc(doc(db, "users", rideData.requestedBy));
      if (!requesterUserDoc.exists()) {
        toast({ title: "Requester Not Found", variant: "destructive" });
        setIsLoading(false);
        return false;
      }
      const requesterUserData = requesterUserDoc.data() as User;
      
      const passengerToAdd: RidePassenger = { userId: requesterUserData.id, name: requesterUserData.name, phoneNumber: requesterUserData.phoneNumber };
      
      // Determine total seats based on request type
      let finalTotalSeats = rideData.totalSeats; // Default to what was set during request
      let finalSeatsAvailable = rideData.seatsAvailable;

      if (rideData.requestType === 'full_reserved') {
        finalTotalSeats = 1;
        finalSeatsAvailable = 0; // Only the requester
      } else { // 'sharing'
        finalTotalSeats = rideData.maxPassengers || 4; // Default to 4 for sharing or what was set
        finalSeatsAvailable = finalTotalSeats - 1; // One seat for the requester
      }


      await updateDoc(rideRef, {
        status: 'Scheduled' as RideStatus,
        driverId: currentUser.id,
        driverName: currentUser.name,
        driverPhoneNumber: currentUser.phoneNumber,
        passengers: arrayUnion(passengerToAdd),
        seatsAvailable: finalSeatsAvailable,
        totalSeats: finalTotalSeats, // Ensure totalSeats matches the accepted type
        maxPassengers: rideData.requestType === 'full_reserved' ? 1 : (rideData.maxPassengers || 4),
      });
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error("Error accepting ride request: ", error);
      toast({ title: "Acceptance Error", description: "Could not accept the request.", variant: "destructive" });
      setIsLoading(false);
      return false;
    }
  };

  const updateRideDetails = async (rideId: string, details: Partial<RideFirestoreData>): Promise<boolean> => {
    if (!currentUser || currentUser.role !== 'driver') return false;
    setIsLoading(true);
    const rideRef = doc(db, RIDES_COLLECTION, rideId);
    try {
      const rideSnap = await getDoc(rideRef);
      if (!rideSnap.exists() || rideSnap.data().driverId !== currentUser.id) {
        setIsLoading(false);
        return false;
      }
      await updateDoc(rideRef, details);
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error("Error updating ride details:", error);
      setIsLoading(false);
      return false;
    }
  };

  const deleteRide = async (rideId: string): Promise<boolean> => {
    if (!currentUser || currentUser.role !== 'driver') return false;
    setIsLoading(true);
    const rideRef = doc(db, RIDES_COLLECTION, rideId);
    try {
      const rideSnap = await getDoc(rideRef);
      if (!rideSnap.exists() || rideSnap.data().driverId !== currentUser.id) {
        setIsLoading(false);
        return false; 
      }
      if (rideSnap.data().passengers && rideSnap.data().passengers.length > 0) {
        toast({ title: "Cannot Delete", description: "This ride has passengers. Please cancel it instead or remove passengers first.", variant: "destructive" });
        setIsLoading(false);
        return false;
      }
      await deleteDoc(rideRef);
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error("Error deleting ride: ", error);
      setIsLoading(false);
      return false;
    }
  };
  
  const getRideById = (rideId: string): Ride | undefined => {
    return rides.find(ride => ride.id === rideId);
  };

  const now = new Date();

  const passengerUpcomingRides = rides.filter(ride => 
    currentUser && ride.passengers.some(p => p.userId === currentUser.id) && 
    new Date(ride.departureTime) >= now && 
    ride.status !== 'Completed' && ride.status !== 'Cancelled' && ride.status !== 'Expired'
  ).sort((a,b) => new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime());

  const passengerPastRides = rides.filter(ride => 
    currentUser && ride.passengers.some(p => p.userId === currentUser.id) && 
    (new Date(ride.departureTime) < now || ride.status === 'Completed' || ride.status === 'Cancelled' || ride.status === 'Expired')
  ).sort((a,b) => new Date(b.departureTime).getTime() - new Date(a.departureTime).getTime());
  
  const passengerActiveRequests = rides.filter(ride => 
    currentUser && ride.requestedBy === currentUser.id && ride.status === 'Requested' && new Date(ride.departureTime) >= now
  ).sort((a,b) => new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime());


  const driverUpcomingRides = rides.filter(ride =>
    currentUser && ride.driverId === currentUser.id && 
    new Date(ride.departureTime) >= now && 
    ride.status !== 'Completed' && ride.status !== 'Cancelled' && ride.status !== 'Requested' && ride.status !== 'Expired'
  ).sort((a,b) => new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime());
  
  const driverPastRides = rides.filter(ride =>
    currentUser && ride.driverId === currentUser.id && 
    (new Date(ride.departureTime) < now || ride.status === 'Completed' || ride.status === 'Cancelled' || ride.status === 'Expired') &&
    ride.status !== 'Requested'
  ).sort((a,b) => new Date(b.departureTime).getTime() - new Date(a.departureTime).getTime());

  const driverRideRequests = rides.filter(ride => 
    ride.status === 'Requested' && 
    currentUser?.role === 'driver' && 
    new Date(ride.departureTime) >= now // Rule 3c: Don't show expired requests to driver
  ).sort((a,b) => new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime());


  const activeStatuses: RideStatus[] = ['About to Depart', 'On Route', 'Arriving', 'At Source', 'Waiting', 'Destination Reached'];
  
  const currentPassengerRide = rides.find(ride => 
      currentUser && ride.passengers.some(p => p.userId === currentUser.id) && activeStatuses.includes(ride.status)
  ) || null;

  const currentDriverRide = rides.find(ride =>
      currentUser && ride.driverId === currentUser.id && activeStatuses.includes(ride.status)
  ) || null;


  return (
    <RideContext.Provider value={{ 
        rides, isLoading, requestRide, reserveSeat, cancelReservation, postRide, updateRideStatus, acceptRideRequest, getRideById,
        updateRideDetails, deleteRide,
        passengerUpcomingRides, passengerPastRides, driverUpcomingRides, driverPastRides, driverRideRequests,
        currentPassengerRide, currentDriverRide,
        passengerActiveRequests
      }}>
      {children}
    </RideContext.Provider>
  );
};

export const useRides = (): RideContextType => {
  const context = useContext(RideContext);
  if (context === undefined) {
    throw new Error('useRides must be used within a RideProvider');
  }
  return context;
};
