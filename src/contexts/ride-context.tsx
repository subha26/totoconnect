"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Ride, RideStatus, RidePassenger, User } from '@/lib/types';
import { LOCATIONS, DEFAULT_TOTAL_SEATS, MAIN_ROAD_COORDS, COLLEGE_COORDS } from '@/lib/constants';
import { useAuth } from './auth-context';

interface RideContextType {
  rides: Ride[];
  isLoading: boolean;
  fetchRides: () => void; // Generic fetch, could be filtered later
  requestRide: (departureTime: Date, origin: string, destination: string) => Promise<boolean>;
  reserveSeat: (rideId: string) => Promise<boolean>;
  cancelReservation: (rideId: string) => Promise<boolean>;
  postRide: (departureTime: Date, origin: string, destination: string, totalSeats: number) => Promise<boolean>;
  updateRideStatus: (rideId: string, status: RideStatus, progress?: number) => Promise<boolean>;
  acceptRideRequest: (rideId: string) => Promise<boolean>;
  getRideById: (rideId: string) => Ride | undefined;
  passengerUpcomingRides: Ride[];
  passengerPastRides: Ride[];
  driverUpcomingRides: Ride[];
  driverPastRides: Ride[];
  driverRideRequests: Ride[];
  currentPassengerRide: Ride | null;
  currentDriverRide: Ride | null;
}

const RideContext = createContext<RideContextType | undefined>(undefined);

// Mock ride database
const initialMockRides: Ride[] = [
  {
    id: 'ride-1',
    origin: LOCATIONS.MAIN_ROAD,
    destination: LOCATIONS.COLLEGE,
    departureTime: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(), // 1 hour from now
    seatsAvailable: 2,
    totalSeats: DEFAULT_TOTAL_SEATS,
    status: 'Scheduled',
    driverId: 'driver-1',
    driverName: 'Test Driver',
    driverPhoneNumber: '0987654321',
    passengers: [{ userId: 'passenger-temp1', name: 'Alice', phoneNumber: '1110001110' }],
    currentLatitude: MAIN_ROAD_COORDS.latitude,
    currentLongitude: MAIN_ROAD_COORDS.longitude,
    progress: 0,
  },
  {
    id: 'ride-2',
    origin: LOCATIONS.COLLEGE,
    destination: LOCATIONS.MAIN_ROAD,
    departureTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
    seatsAvailable: DEFAULT_TOTAL_SEATS,
    totalSeats: DEFAULT_TOTAL_SEATS,
    status: 'Scheduled',
    driverId: 'driver-1',
    driverName: 'Test Driver',
    driverPhoneNumber: '0987654321',
    passengers: [],
    progress: 0,
  },
   {
    id: 'ride-3-requested',
    origin: LOCATIONS.MAIN_ROAD,
    destination: LOCATIONS.COLLEGE,
    departureTime: new Date(Date.now() + 0.5 * 60 * 60 * 1000).toISOString(), // 30 mins from now
    seatsAvailable: DEFAULT_TOTAL_SEATS, // Seats for driver to potentially accept
    totalSeats: DEFAULT_TOTAL_SEATS,
    status: 'Requested',
    driverId: null,
    passengers: [], // Passenger will be added upon driver acceptance
    requestedBy: 'passenger-1', // Assuming passenger-1 exists
    progress: 0,
  },
];


export const RideProvider = ({ children }: { children: ReactNode }) => {
  const { currentUser } = useAuth();
  const [rides, setRides] = useState<Ride[]>(initialMockRides);
  const [isLoading, setIsLoading] = useState(false);

  const fetchRides = useCallback(() => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      // In a real app, filter based on user, location, etc.
      setRides(initialMockRides); // Or update from a persisted source
      setIsLoading(false);
    }, 500);
  }, []);

  useEffect(() => {
    fetchRides();
  }, [fetchRides]);

  const requestRide = async (departureTime: Date, origin: string, destination: string): Promise<boolean> => {
    if (!currentUser || currentUser.role !== 'passenger') return false;
    setIsLoading(true);
    const newRide: Ride = {
      id: `ride-${Date.now()}`,
      origin,
      destination,
      departureTime: departureTime.toISOString(),
      seatsAvailable: DEFAULT_TOTAL_SEATS, // Placeholder
      totalSeats: DEFAULT_TOTAL_SEATS,
      status: 'Requested',
      driverId: null,
      passengers: [],
      requestedBy: currentUser.id,
      progress: 0,
    };
    setRides(prevRides => [newRide, ...prevRides]);
    setIsLoading(false);
    return true;
  };

  const reserveSeat = async (rideId: string): Promise<boolean> => {
    if (!currentUser || currentUser.role !== 'passenger') return false;
    setIsLoading(true);
    setRides(prevRides =>
      prevRides.map(ride => {
        if (ride.id === rideId && ride.seatsAvailable > 0 && !ride.passengers.find(p => p.userId === currentUser.id)) {
          return {
            ...ride,
            seatsAvailable: ride.seatsAvailable - 1,
            passengers: [...ride.passengers, { userId: currentUser.id, name: currentUser.name, phoneNumber: currentUser.phoneNumber }],
          };
        }
        return ride;
      })
    );
    setIsLoading(false);
    return true;
  };
  
  const cancelReservation = async (rideId: string): Promise<boolean> => {
    if (!currentUser || currentUser.role !== 'passenger') return false;
    setIsLoading(true);
    setRides(prevRides =>
      prevRides.map(ride => {
        if (ride.id === rideId && ride.passengers.find(p => p.userId === currentUser.id)) {
          return {
            ...ride,
            seatsAvailable: ride.seatsAvailable + 1,
            passengers: ride.passengers.filter(p => p.userId !== currentUser.id),
          };
        }
        return ride;
      })
    );
    setIsLoading(false);
    return true;
  };

  const postRide = async (departureTime: Date, origin: string, destination: string, totalSeats: number): Promise<boolean> => {
    if (!currentUser || currentUser.role !== 'driver') return false;
    setIsLoading(true);
    const newRide: Ride = {
      id: `ride-${Date.now()}`,
      origin,
      destination,
      departureTime: departureTime.toISOString(),
      seatsAvailable: totalSeats,
      totalSeats,
      status: 'Scheduled',
      driverId: currentUser.id,
      driverName: currentUser.name,
      driverPhoneNumber: currentUser.phoneNumber,
      passengers: [],
      progress: 0,
    };
    setRides(prevRides => [newRide, ...prevRides]);
    setIsLoading(false);
    return true;
  };

  const updateRideStatus = async (rideId: string, status: RideStatus, progress?: number): Promise<boolean> => {
     // Add permission checks if needed (e.g., only driver can update certain statuses)
    setIsLoading(true);
    setRides(prevRides =>
      prevRides.map(ride =>
        ride.id === rideId ? { ...ride, status, progress: progress !== undefined ? progress : ride.progress } : ride
      )
    );
    setIsLoading(false);
    return true;
  };

  const acceptRideRequest = async (rideId: string): Promise<boolean> => {
    if (!currentUser || currentUser.role !== 'driver') return false;
    setIsLoading(true);
    let success = false;
    setRides(prevRides =>
      prevRides.map(ride => {
        if (ride.id === rideId && ride.status === 'Requested' && ride.requestedBy) {
          // Find the requesting passenger from mockUsers or context if available
          // For now, mock passenger details if not easily accessible
          const passengerName = initialMockRides.find(r => r.id === rideId)?.passengers[0]?.name || "Requested User";
          const passengerPhoneNumber = initialMockRides.find(r => r.id === rideId)?.passengers[0]?.phoneNumber || "0000000000";
          
          success = true;
          return {
            ...ride,
            status: 'Scheduled',
            driverId: currentUser.id,
            driverName: currentUser.name,
            driverPhoneNumber: currentUser.phoneNumber,
            // Add the requester as a passenger
            passengers: [{ userId: ride.requestedBy!, name: passengerName, phoneNumber: passengerPhoneNumber }],
            seatsAvailable: ride.totalSeats - 1, 
          };
        }
        return ride;
      })
    );
    setIsLoading(false);
    return success;
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
      ride.passengers.some(p => p.userId === currentUser?.id) && activeStatuses.includes(ride.status)
  ) || null;

  const currentDriverRide = rides.find(ride =>
      ride.driverId === currentUser?.id && activeStatuses.includes(ride.status)
  ) || null;


  return (
    <RideContext.Provider value={{ 
        rides, isLoading, fetchRides, requestRide, reserveSeat, cancelReservation, postRide, updateRideStatus, acceptRideRequest, getRideById,
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
