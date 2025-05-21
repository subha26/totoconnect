
import type { Timestamp } from 'firebase/firestore';

export type UserRole = 'passenger' | 'driver' | null;

export interface User {
  id: string;
  phoneNumber: string;
  name: string;
  pin: string;
  role: UserRole;
  profilePictureDataUrl?: string | null; // Changed from profilePictureUrl, will store Base64 Data URI
  phoneNumberLastUpdatedAt?: Timestamp | null;
  securityQuestion?: string;
  securityAnswer?: string;
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
  | 'Requested'
  | 'Expired'; // Added for unfulfilled past requests

export interface RidePassenger {
  userId: string;
  name: string;
  phoneNumber: string;
}

export type RideRequestType = 'sharing' | 'full_reserved';

export interface Ride {
  id: string;
  origin: string;
  destination: string;
  departureTime: string; // ISO String
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
  requestedBy?: string; // Passenger User ID who made the request
  requestType?: RideRequestType;
  maxPassengers?: number;
  wasCreatedAsRecurring?: boolean; // New field for recurring ride indicator
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
  requestType?: RideRequestType;
  maxPassengers?: number;
  wasCreatedAsRecurring?: boolean; // New field
}


export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: Timestamp;
}

