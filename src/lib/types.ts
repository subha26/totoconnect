export type UserRole = 'passenger' | 'driver' | null;

export interface User {
  id: string;
  phoneNumber: string;
  name: string;
  pin: string; // In a real app, this should be hashed and never stored client-side directly
  role: UserRole;
}

export type RideStatus =
  | 'Scheduled'
  | 'About to Depart'
  | 'On Route'
  | 'Completed'
  | 'Cancelled'
  | 'Arriving'
  | 'At Source'
  | 'Waiting'
  | 'Destination Reached'
  | 'Requested'; // For passenger requests

export interface RidePassenger {
  userId: string;
  name: string;
  phoneNumber: string;
}

export interface Ride {
  id: string;
  origin: string;
  destination: string;
  departureTime: string; // ISO string
  seatsAvailable: number;
  totalSeats: number;
  status: RideStatus;
  driverId: string | null;
  driverName?: string;
  driverPhoneNumber?: string;
  passengers: RidePassenger[];
  // For tracking simulation
  currentLatitude?: number;
  currentLongitude?: number;
  progress?: number; // 0-100
  requestedBy?: string; // passengerId for requested rides
}
