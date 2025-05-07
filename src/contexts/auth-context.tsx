"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { User, UserRole } from '@/lib/types';
import { auth, db } from '@/lib/firebase';
import { 
  onAuthStateChanged,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { TEST_PASSENGER_PHONE, TEST_PASSENGER_PIN, TEST_PASSENGER_NAME, TEST_DRIVER_PHONE, TEST_DRIVER_PIN, TEST_DRIVER_NAME } from '@/lib/constants';


interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  login: (phoneNumber: string, pin: string) => Promise<boolean>;
  logout: () => void;
  signup: (phoneNumber: string, name: string, pin: string, role: UserRole) => Promise<boolean>;
  firebaseUser: import('firebase/auth').User | null; // Expose Firebase user if needed for other integrations
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<import('firebase/auth').User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user); // Keep track of Firebase Auth state if any
      if (user) {
        // If a Firebase user session exists (e.g., from a previous OTP login or other Firebase auth method)
        // try to load app user profile from Firestore using UID.
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const appUser = userDocSnap.data() as User;
          setCurrentUser(appUser);
          localStorage.setItem('totoConnectUser', JSON.stringify(appUser));
        } else {
          // Firebase user exists but no corresponding Firestore profile.
          // This case is less likely with direct signup.
          setCurrentUser(null);
          localStorage.removeItem('totoConnectUser');
        }
      } else {
        // No active Firebase user session, rely on localStorage for PIN-based login session.
        try {
          const storedUser = localStorage.getItem('totoConnectUser');
          if (storedUser) {
            setCurrentUser(JSON.parse(storedUser));
          } else {
            setCurrentUser(null);
          }
        } catch (error) {
          console.error("Failed to parse user from localStorage", error);
          localStorage.removeItem('totoConnectUser');
          setCurrentUser(null);
        }
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);
  

  const login = async (phoneNumber: string, pin: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      // For direct PIN login, we use phoneNumber as the document ID in Firestore
      const userDocRef = doc(db, "users", phoneNumber);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        setIsLoading(false);
        return false; // User not found
      }

      const userData = userDocSnap.data() as User;
      if (userData.pin === pin) { // Direct PIN comparison (consider hashing in production)
        setCurrentUser(userData);
        localStorage.setItem('totoConnectUser', JSON.stringify(userData));
        setIsLoading(false);
        router.push(userData.role === 'driver' ? '/driver/home' : '/passenger/home');
        return true;
      }
    } catch (error) {
      console.error("Login error: ", error);
    }
    setIsLoading(false);
    return false;
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await firebaseSignOut(auth); // Sign out from Firebase if there was a session
    } catch (error) {
      console.error("Firebase sign out error: ", error);
    }
    setCurrentUser(null);
    setFirebaseUser(null); // Clear Firebase user state
    localStorage.removeItem('totoConnectUser');
    setIsLoading(false);
    router.push('/login');
  };

  const signup = async (phoneNumber: string, name: string, pin: string, role: UserRole): Promise<boolean> => {
    if (!role) {
      console.error("Role is required for signup.");
      return false;
    }
    setIsLoading(true);
    try {
      // Check if user with this phone number already exists
      const userDocRef = doc(db, "users", phoneNumber); // Use phone number as document ID
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        console.error("User with this phone number already exists.");
        setIsLoading(false);
        return false; // User already exists
      }

      const newUser: User = {
        id: phoneNumber, // Use phone number as the user ID
        phoneNumber,
        name,
        pin, // Store PIN (consider hashing in production)
        role,
      };
      
      await setDoc(userDocRef, newUser); // Create user document with phone number as ID
      
      setCurrentUser(newUser);
      localStorage.setItem('totoConnectUser', JSON.stringify(newUser));
      
      setIsLoading(false);
      router.push(newUser.role === 'driver' ? '/driver/home' : '/passenger/home');
      return true;
    } catch (error) {
      console.error("Signup error: ", error);
      setIsLoading(false);
      return false;
    }
  };
  
  // Seed mock users if they don't exist (for testing convenience)
  useEffect(() => {
    const seedMockUser = async (mockUser: User) => {
      const userRef = doc(db, "users", mockUser.phoneNumber); // Use phone number as ID
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        // Ensure the mockUser object itself has 'id' set to its 'phoneNumber'
        await setDoc(userRef, { ...mockUser, id: mockUser.phoneNumber }); 
        console.log(`Mock user ${mockUser.name} added to Firestore with ID ${mockUser.phoneNumber}.`);
      }
    };
    
    const passengerMockForDb: User = { id: TEST_PASSENGER_PHONE, phoneNumber: TEST_PASSENGER_PHONE, name: TEST_PASSENGER_NAME, pin: TEST_PASSENGER_PIN, role: 'passenger' };
    const driverMockForDb: User = { id: TEST_DRIVER_PHONE, phoneNumber: TEST_DRIVER_PHONE, name: TEST_DRIVER_NAME, pin: TEST_DRIVER_PIN, role: 'driver' };
    
    const seedMockUsers = async () => {
      await seedMockUser(passengerMockForDb);
      await seedMockUser(driverMockForDb);
    };
    // seedMockUsers(); // Uncomment to seed on app load during development

  }, []);


  return (
    <AuthContext.Provider value={{ 
      currentUser, 
      isLoading, 
      login, 
      logout, 
      signup,
      firebaseUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
