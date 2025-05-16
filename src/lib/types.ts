
import type { Timestamp } from 'firebase/firestore';

export type UserRole = 'passenger' | 'driver' | null;

export interface User {
  id: string;
  phoneNumber: string;
  name: string;
  pin: string;
  role: UserRole;
  profileImageVersion?: number;
  phoneNumberLastUpdatedAt?: Timestamp | null;
  securityQuestion?: string; // Added
  securityAnswer?: string;   // Added
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
  | 'Requested';

export interface RidePassenger {
  userId: string;
  name: string;
  phoneNumber: string;
}

export interface Ride {
  id: string;
  origin: string;
  destination: string;
  departureTime: string;
  seatsAvailable: number;
  totalSeats: number;
  status: RideStatus;
  driverId: string | null;
  driverName?: string;
  driverPhoneNumber?: string;
  passengers: RidePassenger[];
  currentLatitude?: number;
  currentLongitude?: number;
  progress?: number;
  requestedBy?: string;
}

export interface RideFirestoreData {
  origin?: string;
  destination?: string;
  departureTime?: Timestamp;
  seatsAvailable?: number;
  totalSeats?: number;
  status?: RideStatus;
  driverId?: string | null;
  driverName?: string;
  driverPhoneNumber?: string;
  passengers?: RidePassenger[];
  currentLatitude?: number;
  currentLongitude?: number;
  progress?: number;
  requestedBy?: string;
}


export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: Timestamp;
}
