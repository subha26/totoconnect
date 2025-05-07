
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Ride, RideStatus, User } from '@/lib/types';
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
  arrayRemove
} from 'firebase/firestore';

interface RideContextType {
  rides: Ride[];
  isLoading: boolean;
  // fetchRides: () => void; // Replaced by real-time listener
  requestRide: (departureTime: Date, origin: string, destination: string) => Promise<string | null>;
  reserveSeat: (rideId: string) => Promise<boolean>;
  cancelReservation: (rideId: string) => Promise<boolean>;
  postRide: (departureTime: Date, origin: string, destination: string, totalSeats: number) => Promise<string | null>;
  updateRideStatus: (rideId: string, status: RideStatus, progress?: number) => Promise<boolean>;
  acceptRideRequest: (rideId: string) => Promise<boolean>;
  getRideById: (rideId: string) => Ride | undefined; // Still useful for synchronous access if needed
  passengerUpcomingRides: Ride[];
  passengerPastRides: Ride[];
  driverUpcomingRides: Ride[];
  driverPastRides: Ride[];
  driverRideRequests: Ride[];
  currentPassengerRide: Ride | null;
  currentDriverRide: Ride | null;
}

const RideContext = createContext<RideContextType | undefined>(undefined);

const RIDES_COLLECTION = "rides";

export const RideProvider = ({ children }: { children: ReactNode }) => {
  const { currentUser } = useAuth();
  const [rides, setRides] = useState<Ride[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const ridesQuery = query(collection(db, RIDES_COLLECTION), orderBy("departureTime", "desc"));
    
    const unsubscribe = onSnapshot(ridesQuery, (querySnapshot) => {
      const fetchedRides: Ride[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        fetchedRides.push({ 
          ...data, 
          id: doc.id,
          // Convert Firestore Timestamp to ISO string if necessary, or Date object
          // Assuming departureTime is stored as Firestore Timestamp
          departureTime: (data.departureTime as Timestamp).toDate().toISOString(),
        } as Ride);
      });
      setRides(fetchedRides);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching rides: ", error);
      setIsLoading(false);
    });

    return () => unsubscribe(); // Cleanup listener on unmount
  }, []);


  const requestRide = async (departureTime: Date, origin: string, destination: string): Promise<string|null> => {
    if (!currentUser || currentUser.role !== 'passenger') return null;
    setIsLoading(true);
    try {
      const newRideData = {
        origin,
        destination,
        departureTime: Timestamp.fromDate(departureTime),
        seatsAvailable: DEFAULT_TOTAL_SEATS, // Placeholder, driver might set this upon acceptance or offer fixed
        totalSeats: DEFAULT_TOTAL_SEATS,
        status: 'Requested' as RideStatus,
        driverId: null,
        passengers: [], // Passenger will be added upon driver acceptance if they are the requester
        requestedBy: currentUser.id,
        progress: 0,
        // Add currentLatitude, currentLongitude if available from passenger
      };
      const docRef = await addDoc(collection(db, RIDES_COLLECTION), newRideData);
      setIsLoading(false);
      return docRef.id;
    } catch (error) {
      console.error("Error requesting ride: ", error);
      setIsLoading(false);
      return null;
    }
  };

  const reserveSeat = async (rideId: string): Promise<boolean> => {
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
      if (rideData.seatsAvailable <= 0 || rideData.passengers.find(p => p.userId === currentUser.id)) {
        setIsLoading(false);
        return false; // No seats or already reserved
      }

      await updateDoc(rideRef, {
        seatsAvailable: rideData.seatsAvailable - 1,
        passengers: arrayUnion({ userId: currentUser.id, name: currentUser.name, phoneNumber: currentUser.phoneNumber }),
      });
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error("Error reserving seat: ", error);
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
         return false; // Passenger not on this ride
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
      const newRideData = {
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
        // Add driver's currentLatitude, currentLongitude if starting immediately
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
      // Add logic for currentLatitude, currentLongitude updates if status is 'On Route'
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
    setIsLoading(true);
    const rideRef = doc(db, RIDES_COLLECTION, rideId);
    try {
      const rideSnap = await getDoc(rideRef);
      if (!rideSnap.exists()) {
        setIsLoading(false);
        return false;
      }
      const rideData = rideSnap.data() as Ride;
      if (rideData.status !== 'Requested' || !rideData.requestedBy) {
         setIsLoading(false);
         return false; // Not a valid request or no requester
      }

      // Fetch requester's details to add them as a passenger
      const requesterUserDoc = await getDoc(doc(db, "users", rideData.requestedBy));
      if (!requesterUserDoc.exists()) {
        setIsLoading(false);
        console.error("Requester user not found in DB");
        return false;
      }
      const requesterUserData = requesterUserDoc.data() as User;
      
      await updateDoc(rideRef, {
        status: 'Scheduled' as RideStatus,
        driverId: currentUser.id,
        driverName: currentUser.name,
        driverPhoneNumber: currentUser.phoneNumber,
        passengers: arrayUnion({ userId: requesterUserData.id, name: requesterUserData.name, phoneNumber: requesterUserData.phoneNumber }),
        seatsAvailable: rideData.totalSeats - 1, // Assuming request is for 1 seat
      });
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error("Error accepting ride request: ", error);
      setIsLoading(false);
      return false;
    }
  };
  
  const getRideById = (rideId: string): Ride | undefined => {
    return rides.find(ride => ride.id === rideId);
  };

  const now = new Date();

  const passengerUpcomingRides = rides.filter(ride => 
    ride.passengers.some(p => p.userId === currentUser?.id) && new Date(ride.departureTime) >= now && ride.status !== 'Completed' && ride.status !== 'Cancelled'
  ).sort((a,b) => new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime());

  const passengerPastRides = rides.filter(ride => 
    ride.passengers.some(p => p.userId === currentUser?.id) && (new Date(ride.departureTime) < now || ride.status === 'Completed' || ride.status === 'Cancelled')
  ).sort((a,b) => new Date(b.departureTime).getTime() - new Date(a.departureTime).getTime());

  const driverUpcomingRides = rides.filter(ride =>
    ride.driverId === currentUser?.id && new Date(ride.departureTime) >= now && ride.status !== 'Completed' && ride.status !== 'Cancelled' && ride.status !== 'Requested'
  ).sort((a,b) => new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime());
  
  const driverPastRides = rides.filter(ride =>
    ride.driverId === currentUser?.id && (new Date(ride.departureTime) < now || ride.status === 'Completed' || ride.status === 'Cancelled') && ride.status !== 'Requested'
  ).sort((a,b) => new Date(b.departureTime).getTime() - new Date(a.departureTime).getTime());

  const driverRideRequests = rides.filter(ride => ride.status === 'Requested' && currentUser?.role === 'driver')
    .sort((a,b) => new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime());

  const activeStatuses: RideStatus[] = ['About to Depart', 'On Route', 'Arriving', 'At Source', 'Waiting'];
  
  const currentPassengerRide = rides.find(ride => 
      currentUser && ride.passengers.some(p => p.userId === currentUser.id) && activeStatuses.includes(ride.status)
  ) || null;

  const currentDriverRide = rides.find(ride =>
      currentUser && ride.driverId === currentUser.id && activeStatuses.includes(ride.status)
  ) || null;


  return (
    <RideContext.Provider value={{ 
        rides, isLoading, requestRide, reserveSeat, cancelReservation, postRide, updateRideStatus, acceptRideRequest, getRideById,
        passengerUpcomingRides, passengerPastRides, driverUpcomingRides, driverPastRides, driverRideRequests,
        currentPassengerRide, currentDriverRide
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
