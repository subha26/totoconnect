
import type { Timestamp } from 'firebase/firestore';

export type UserRole = 'passenger' | 'driver' | null;

export interface User {
  id: string; // Corresponds to Firebase Auth UID or phone number for PIN-based
  phoneNumber: string;
  name: string;
  pin: string; // In a real app, this should be hashed and not directly compared (or use Firebase Auth for full session management)
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

// This interface represents the Ride object as used on the client-side,
// where departureTime is an ISO string.
export interface Ride {
  id: string; // Firestore document ID
  origin: string;
  destination: string;
  departureTime: string; // ISO string for client-side use
  seatsAvailable: number;
  totalSeats: number;
  status: RideStatus;
  driverId: string | null;
  driverName?: string;
  driverPhoneNumber?: string;
  passengers: RidePassenger[];
  currentLatitude?: number;
  currentLongitude?: number;
  progress?: number; // 0-100
  requestedBy?: string; // passengerId for requested rides
}

// This interface can be used when preparing data for Firestore,
// where departureTime is a Firestore Timestamp.
export interface RideFirestoreData extends Omit<Ride, 'id' | 'departureTime'> {
  departureTime: Timestamp;
}

export interface ChatMessage {
  id: string; // Firestore document ID
  senderId: string;
  senderName: string;
  text: string;
  timestamp: Timestamp; // Firestore Timestamp for ordering
}
