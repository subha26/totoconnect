
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
import { addDays, format, getDay } from 'date-fns';

interface RideContextType {
  rides: Ride[];
  isLoading: boolean;
  requestRide: (departureTime: Date, origin: string, destination: string, requestType: RideRequestType) => Promise<{success: boolean; rideId: string | null; message?: string}>;
  reserveSeat: (rideId: string) => Promise<boolean>;
  cancelReservation: (rideId: string) => Promise<boolean>;
  postRide: (
    departureDateTime: Date, 
    origin: string, 
    destination: string, 
    totalSeats: number,
    selectedDays: number[] // Changed from repeatForWeek: boolean
  ) => Promise<{success: boolean; message: string; createdRideIds: string[]}>;
  updateRideStatus: (rideId: string, status: RideStatus, progress?: number) => Promise<boolean>;
  acceptRideRequest: (rideId: string) => Promise<boolean>;
  getRideById: (rideId: string) => Ride | undefined;
  updateRideDetails: (rideId: string, details: Partial<RideFirestoreData>) => Promise<boolean>;
  deleteRide: (rideId: string) => Promise<boolean>;
  deleteRideRequest: (rideId: string) => Promise<boolean>;
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
  const prevRidesRef = useRef<Ride[]>([]); 

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

        if (ride.status === 'Requested' && new Date(ride.departureTime) < new Date() && ride.status !== 'Expired') {
          // Client-side filtering for display, backend should ideally update status
        } else {
          fetchedRides.push(ride);
        }
      });

      if (currentUser && prevRidesRef.current.length > 0) {
        const oldDriverRequests = prevRidesRef.current.filter(r => r.status === 'Requested' && new Date(r.departureTime) >= new Date());
        const newDriverRequests = fetchedRides.filter(r => r.status === 'Requested' && new Date(r.departureTime) >= new Date());
        if (newDriverRequests.length > oldDriverRequests.length) {
           const newReq = newDriverRequests.find(nr => !oldDriverRequests.some(or => or.id === nr.id));
           if(newReq && newReq.driverId !== currentUser.id && currentUser.role === 'driver') { 
             toast({ title: "New Ride Request", description: `A new ride from ${newReq.origin} to ${newReq.destination} has been requested.` });
           }
        }

        const passengerOldRequests = prevRidesRef.current.filter(r => r.requestedBy === currentUser.id && r.status === 'Requested');
        passengerOldRequests.forEach(oldReq => {
          const correspondingNewRide = fetchedRides.find(newRide => newRide.id === oldReq.id);
          if (correspondingNewRide && correspondingNewRide.status === 'Scheduled' && oldReq.status === 'Requested' && currentUser.role === 'passenger') {
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
  }, [currentUser, toast]); 


  const requestRide = async (departureTime: Date, origin: string, destination: string, requestType: RideRequestType): Promise<{success: boolean; rideId: string | null; message?: string}> => {
    if (!currentUser || currentUser.role !== 'passenger') return {success: false, rideId: null, message: "User must be a passenger."};
    
    const passengerActiveRideRequests = rides.filter(
      ride => ride.requestedBy === currentUser.id && ride.status === 'Requested' && new Date(ride.departureTime) >= new Date()
    );
    if (passengerActiveRideRequests.length >= 2) {
      return {success: false, rideId: null, message: "You can only have a maximum of 2 active ride requests."};
    }

    if (departureTime < new Date()) {
        return {success: false, rideId: null, message: "Departure time cannot be in the past."};
    }

    try {
      let rideTotalSeats: number;
      let rideMaxPassengers: number;
      let rideSeatsAvailable: number;

      if (requestType === 'full_reserved') {
        rideTotalSeats = 1;
        rideMaxPassengers = 1;
        rideSeatsAvailable = 1; 
      } else { 
        rideTotalSeats = 4; 
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
      return {success: true, rideId: docRef.id};
    } catch (error) {
      console.error("Error requesting ride: ", error);
      return {success: false, rideId: null, message: "Server error while requesting ride."};
    }
  };

  const reserveSeat = async (rideId: string): Promise<boolean> => {
    if (!currentUser || currentUser.role !== 'passenger') return false;
    
    const rideRef = doc(db, RIDES_COLLECTION, rideId);
    try {
      const rideSnap = await getDoc(rideRef);
      if (!rideSnap.exists()) {
        toast({ title: "Ride not found", variant: "destructive"});
        return false;
      }
      const rideData = rideSnap.data() as Ride;

      if (rideData.status !== 'Scheduled') {
        toast({ title: "Cannot Reserve", description: "This ride is not available for reservation.", variant: "destructive"});
        return false;
      }

      if (rideData.passengers.find(p => p.userId === currentUser.id)) {
        toast({ title: "Already Reserved", description: "You have already reserved a seat on this ride.", variant: "destructive"});
        return false; 
      }

      if (rideData.requestType === 'full_reserved') {
         toast({ title: "Private Ride", description: "This is a fully reserved private ride.", variant: "destructive"});
         return false;
      }
      
      if (rideData.seatsAvailable <= 0) {
        toast({ title: "Ride Full", description: "No more seats available on this ride.", variant: "destructive"});
        return false; 
      }
      
      if (rideData.passengers.length >= rideData.totalSeats) {
         toast({ title: "Ride Full", description: "This ride has reached its maximum passenger capacity.", variant: "destructive"});
         return false;
      }

      await updateDoc(rideRef, {
        seatsAvailable: rideData.seatsAvailable - 1,
        passengers: arrayUnion({ userId: currentUser.id, name: currentUser.name, phoneNumber: currentUser.phoneNumber }),
      });
      return true;
    } catch (error) {
      console.error("Error reserving seat: ", error);
      toast({ title: "Reservation Error", description: "Could not reserve seat.", variant: "destructive"});
      return false;
    }
  };
  
  const cancelReservation = async (rideId: string): Promise<boolean> => {
    if (!currentUser || currentUser.role !== 'passenger') return false;
    const rideRef = doc(db, RIDES_COLLECTION, rideId);
    try {
      const rideSnap = await getDoc(rideRef);
      if (!rideSnap.exists()) {
        return false;
      }
      const rideData = rideSnap.data() as Ride;
      const passengerToRemove = rideData.passengers.find(p => p.userId === currentUser.id);

      if (!passengerToRemove) {
         return false; 
      }
      if (rideData.status !== 'Scheduled' && rideData.status !== 'About to Depart') {
        toast({ title: "Cancellation Not Allowed", description: "You can only cancel scheduled or about to depart rides.", variant: "destructive"});
        return false;
      }

      await updateDoc(rideRef, {
        seatsAvailable: rideData.seatsAvailable + 1,
        passengers: arrayRemove(passengerToRemove),
      });
      return true;
    } catch (error) {
      console.error("Error cancelling reservation: ", error);
      return false;
    }
  };

  const postRide = async (
    departureDateTime: Date, 
    origin: string, 
    destination: string, 
    totalSeats: number,
    selectedDays: number[] // Array of day indices (0 for Sun, ..., 6 for Sat)
  ): Promise<{success: boolean; message: string; createdRideIds: string[]}> => {
    if (!currentUser || currentUser.role !== 'driver') {
      return { success: false, message: "User must be a driver.", createdRideIds: [] };
    }

    const createdRideIds: string[] = [];
    let successes = 0;
    let failures = 0;
    let duplicateCount = 0;

    const ridesToAttemptDetails: { 
      departureTime: Date, 
      origin: string, 
      destination: string, 
      totalSeats: number, 
      wasCreatedAsRecurring: boolean 
    }[] = [];

    if (selectedDays.length === 0) {
      // Single ride posting
      ridesToAttemptDetails.push({ departureTime: departureDateTime, origin, destination, totalSeats, wasCreatedAsRecurring: false });
    } else {
      // Recurring rides for selected days of the week
      selectedDays.forEach(dayIndex => { // dayIndex is 0 for Sun, 1 for Mon, ...
        let actualOccurrenceDate = new Date(departureDateTime); // Start with the user's chosen date for day calculation
        actualOccurrenceDate.setHours(0, 0, 0, 0); // Normalize to start of the day

        // Advance actualOccurrenceDate to the first instance of dayIndex that is on or after departureDateTime's date part
        let daysToAdd = (dayIndex - getDay(actualOccurrenceDate) + 7) % 7;
        actualOccurrenceDate = addDays(actualOccurrenceDate, daysToAdd);
        
        // Combine with original time from user's input
        const rideDateTime = new Date(actualOccurrenceDate);
        rideDateTime.setHours(departureDateTime.getHours(), departureDateTime.getMinutes(), 0, 0);

        ridesToAttemptDetails.push({ 
          departureTime: rideDateTime, 
          origin, 
          destination, 
          totalSeats, 
          wasCreatedAsRecurring: true 
        });
      });
    }
    
    for (const detail of ridesToAttemptDetails) {
      const ridesRef = collection(db, RIDES_COLLECTION);
      const q = query(ridesRef, 
        where("driverId", "==", currentUser.id),
        where("origin", "==", detail.origin),
        where("destination", "==", detail.destination),
        where("departureTime", "==", Timestamp.fromDate(detail.departureTime)),
        where("status", "==", 'Scheduled')
      );

      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        console.warn(`Duplicate ride found for ${format(detail.departureTime, "PPp")}. Skipping.`);
        duplicateCount++;
        failures++;
        continue; 
      }

      const newRideData: RideFirestoreData = {
        origin: detail.origin,
        destination: detail.destination,
        departureTime: Timestamp.fromDate(detail.departureTime),
        seatsAvailable: detail.totalSeats,
        totalSeats: detail.totalSeats,
        status: 'Scheduled' as RideStatus,
        driverId: currentUser.id,
        driverName: currentUser.name,
        driverPhoneNumber: currentUser.phoneNumber,
        passengers: [],
        progress: 0,
        requestType: 'sharing', 
        maxPassengers: detail.totalSeats,
        wasCreatedAsRecurring: detail.wasCreatedAsRecurring,
      };
      try {
        const docRef = await addDoc(collection(db, RIDES_COLLECTION), newRideData);
        createdRideIds.push(docRef.id);
        successes++;
      } catch (error) {
        console.error("Error posting individual ride: ", error);
        failures++;
      }
    }
    
    let message = "";
    if (successes > 0 && failures === 0) {
      message = `${successes} ride(s) posted successfully.`;
    } else if (successes > 0 && failures > 0) {
      message = `${successes} ride(s) posted. ${failures} ride(s) failed (duplicates or error).`;
    } else if (successes === 0 && failures > 0) {
      message = `No rides posted. ${failures} ride(s) failed (all were duplicates or errors).`;
    } else if (successes === 0 && ridesToAttemptDetails.length === 0 ) {
       message = "No rides were scheduled to be posted."; // Should not happen if logic is correct
    } else {
       message = "No rides posted or attempted.";
    }
    
    return { success: successes > 0, message, createdRideIds };
  };

  const updateRideStatus = async (rideId: string, status: RideStatus, progress?: number): Promise<boolean> => {
    const rideRef = doc(db, RIDES_COLLECTION, rideId);
    try {
      const updateData: Partial<Ride> = { status };
      if (progress !== undefined) {
        updateData.progress = progress;
      }
      await updateDoc(rideRef, updateData);
      return true;
    } catch (error) {
      console.error("Error updating ride status: ", error);
      return false;
    }
  };

  const acceptRideRequest = async (rideId: string): Promise<boolean> => {
    if (!currentUser || currentUser.role !== 'driver') return false;
    
    const rideRef = doc(db, RIDES_COLLECTION, rideId);
    try {
      const rideSnap = await getDoc(rideRef);
      if (!rideSnap.exists()) {
        toast({ title: "Request Not Found", variant: "destructive" });
        return false;
      }
      const rideData = rideSnap.data() as Ride;

      if (rideData.status !== 'Requested') {
         toast({ title: "Already Handled", description: "This request is no longer active.", variant: "destructive" });
         return false; 
      }
      if (new Date(rideData.departureTime) < new Date()) {
        toast({ title: "Expired Request", description: "This ride request has expired.", variant: "destructive" });
        await updateDoc(rideRef, { status: 'Expired' });
        return false;
      }
      if (!rideData.requestedBy) {
         toast({ title: "Invalid Request", description: "Requester information missing.", variant: "destructive" });
         return false;
      }

      const requesterUserDoc = await getDoc(doc(db, "users", rideData.requestedBy));
      if (!requesterUserDoc.exists()) {
        toast({ title: "Requester Not Found", variant: "destructive" });
        return false;
      }
      const requesterUserData = requesterUserDoc.data() as User;
      
      const passengerToAdd: RidePassenger = { userId: requesterUserData.id, name: requesterUserData.name, phoneNumber: requesterUserData.phoneNumber };
      
      let finalTotalSeats = rideData.totalSeats;
      let finalSeatsAvailable = rideData.seatsAvailable;

      if (rideData.requestType === 'full_reserved') {
        finalTotalSeats = 1;
        finalSeatsAvailable = 0; 
      } else { 
        finalTotalSeats = rideData.maxPassengers || DEFAULT_TOTAL_SEATS; 
        finalSeatsAvailable = finalTotalSeats - 1; 
      }

      await updateDoc(rideRef, {
        status: 'Scheduled' as RideStatus,
        driverId: currentUser.id,
        driverName: currentUser.name,
        driverPhoneNumber: currentUser.phoneNumber,
        passengers: arrayUnion(passengerToAdd),
        seatsAvailable: finalSeatsAvailable,
        totalSeats: finalTotalSeats, 
        maxPassengers: rideData.requestType === 'full_reserved' ? 1 : (rideData.maxPassengers || DEFAULT_TOTAL_SEATS),
      });
      return true;
    } catch (error) {
      console.error("Error accepting ride request: ", error);
      toast({ title: "Acceptance Error", description: "Could not accept the request.", variant: "destructive" });
      return false;
    }
  };

  const updateRideDetails = async (rideId: string, details: Partial<RideFirestoreData>): Promise<boolean> => {
    if (!currentUser || currentUser.role !== 'driver') return false;
    const rideRef = doc(db, RIDES_COLLECTION, rideId);
    try {
      const rideSnap = await getDoc(rideRef);
      if (!rideSnap.exists() || rideSnap.data().driverId !== currentUser.id) {
        return false;
      }
      await updateDoc(rideRef, details);
      return true;
    } catch (error) {
      console.error("Error updating ride details:", error);
      return false;
    }
  };

  const deleteRide = async (rideId: string): Promise<boolean> => {
    if (!currentUser || currentUser.role !== 'driver') return false;
    const rideRef = doc(db, RIDES_COLLECTION, rideId);
    try {
      const rideSnap = await getDoc(rideRef);
      if (!rideSnap.exists() || rideSnap.data().driverId !== currentUser.id) {
        toast({ title: "Error", description: "Ride not found or you're not authorized.", variant: "destructive" });
        return false; 
      }
      if (rideSnap.data().passengers && rideSnap.data().passengers.length > 0) {
        toast({ title: "Cannot Delete", description: "This ride has passengers. Please cancel it instead or remove passengers first.", variant: "destructive" });
        return false;
      }
      await deleteDoc(rideRef);
      // Toast is shown by component now
      return true;
    } catch (error) {
      console.error("Error deleting ride: ", error);
      toast({ title: "Deletion Failed", description: "Could not delete the ride.", variant: "destructive" });
      return false;
    }
  };
  
  const deleteRideRequest = async (rideId: string): Promise<boolean> => {
    if (!currentUser || currentUser.role !== 'passenger') {
      toast({ title: "Unauthorized", description: "Only passengers can delete their requests.", variant: "destructive" });
      return false;
    }
    const rideRef = doc(db, RIDES_COLLECTION, rideId);
    try {
      const rideSnap = await getDoc(rideRef);
      if (!rideSnap.exists()) {
        toast({ title: "Request Not Found", variant: "destructive" });
        return false;
      }
      const rideData = rideSnap.data() as Ride;
      if (rideData.requestedBy !== currentUser.id || rideData.status !== 'Requested') {
        toast({ title: "Cannot Delete", description: "This request cannot be deleted or does not belong to you.", variant: "destructive" });
        return false;
      }
      await deleteDoc(rideRef);
      toast({ title: "Request Deleted", description: "Your ride request has been successfully deleted." });
      return true;
    } catch (error) {
      console.error("Error deleting ride request:", error);
      toast({ title: "Deletion Failed", description: "Could not delete the ride request.", variant: "destructive" });
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
    ride.status !== 'Completed' && ride.status !== 'Cancelled' && ride.status !== 'Expired' && ride.status !== 'Requested'
  ).sort((a,b) => new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime());

  const passengerPastRides = rides.filter(ride => 
    currentUser && ride.passengers.some(p => p.userId === currentUser.id) && 
    (new Date(ride.departureTime) < now || ['Completed', 'Cancelled', 'Expired'].includes(ride.status))
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
    ((new Date(ride.departureTime) < now && ride.status !== 'Requested') || ['Completed', 'Cancelled', 'Expired'].includes(ride.status))
  ).sort((a,b) => new Date(b.departureTime).getTime() - new Date(a.departureTime).getTime());

  const driverRideRequests = rides.filter(ride => 
    ride.status === 'Requested' && 
    currentUser?.role === 'driver' && 
    new Date(ride.departureTime) >= now 
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
        updateRideDetails, deleteRide, deleteRideRequest,
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

