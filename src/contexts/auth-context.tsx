
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
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { TEST_PASSENGER_PHONE, TEST_PASSENGER_PIN, TEST_PASSENGER_NAME, TEST_DRIVER_PHONE, TEST_DRIVER_PIN, TEST_DRIVER_NAME } from '@/lib/constants';


interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  login: (phoneNumber: string, pin: string) => Promise<boolean>;
  logout: () => void;
  signup: (phoneNumber: string, name: string, pin: string, role: UserRole) => Promise<boolean>;
  changeProfilePicture: () => Promise<void>;
  updateUserRole: (newRole: UserRole) => Promise<boolean>; // Added for role update
  firebaseUser: import('firebase/auth').User | null; 
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
      setFirebaseUser(user); 
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const appUser = userDocSnap.data() as User;
          setCurrentUser(appUser);
          localStorage.setItem('totoConnectUser', JSON.stringify(appUser));
        } else {
          // This case might happen if user exists in Firebase Auth but not Firestore
          // Attempt to load from localStorage, or clear if inconsistent
          const storedUser = localStorage.getItem('totoConnectUser');
          if (storedUser) {
            const parsedStoredUser: User = JSON.parse(storedUser);
            // A basic check to see if the localStorage user matches the Firebase Auth user
            // This example assumes phone number is unique ID in Firestore for non-Firebase Auth users.
            // For Firebase Auth users, uid is the key.
            // If using phone number as ID for mock users:
            // if (user.phoneNumber && parsedStoredUser.id === user.phoneNumber) {
            //   setCurrentUser(parsedStoredUser);
            // } else 
            if (parsedStoredUser.id === user.uid) { // Assuming user.id in Firestore matches Firebase Auth uid
                 setCurrentUser(parsedStoredUser);
            } else {
              setCurrentUser(null);
              localStorage.removeItem('totoConnectUser');
            }
          } else {
            setCurrentUser(null);
            localStorage.removeItem('totoConnectUser');
          }
        }
      } else {
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
      // Using phoneNumber as document ID for mock login
      const userDocRef = doc(db, "users", phoneNumber);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        setIsLoading(false);
        return false; 
      }

      const userData = userDocSnap.data() as User;
      if (userData.pin === pin) { 
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
      await firebaseSignOut(auth); 
    } catch (error) {
      console.error("Firebase sign out error: ", error);
    }
    setCurrentUser(null);
    setFirebaseUser(null); 
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
      // Using phoneNumber as document ID for mock signup
      const userDocRef = doc(db, "users", phoneNumber); 
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        console.error("User with this phone number already exists.");
        setIsLoading(false);
        return false; 
      }

      const newUser: User = {
        id: phoneNumber, // Using phone number as ID for mock system
        phoneNumber,
        name,
        pin, 
        role,
        profileImageVersion: 0,
      };
      
      await setDoc(userDocRef, newUser); 
      
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

  const changeProfilePicture = async (): Promise<void> => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const newVersion = (currentUser.profileImageVersion || 0) + 1;
      const userDocRef = doc(db, "users", currentUser.id);
      await updateDoc(userDocRef, { profileImageVersion: newVersion });

      setCurrentUser(prevUser => {
        if (!prevUser) return null;
        const updatedUser = { ...prevUser, profileImageVersion: newVersion };
        localStorage.setItem('totoConnectUser', JSON.stringify(updatedUser));
        return updatedUser;
      });
    } catch (error) {
      console.error("Error changing profile picture:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserRole = async (newRole: UserRole): Promise<boolean> => {
    if (!currentUser || !newRole) return false;
    setIsLoading(true);
    try {
      const userDocRef = doc(db, "users", currentUser.id);
      await updateDoc(userDocRef, { role: newRole });

      setCurrentUser(prevUser => {
        if (!prevUser) return null;
        const updatedUser = { ...prevUser, role: newRole };
        localStorage.setItem('totoConnectUser', JSON.stringify(updatedUser));
        return updatedUser;
      });
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error("Error updating user role:", error);
      setIsLoading(false);
      return false;
    }
  };
  
  useEffect(() => {
    const seedMockUser = async (mockUser: User) => {
      const userRef = doc(db, "users", mockUser.phoneNumber); 
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        await setDoc(userRef, { ...mockUser, id: mockUser.phoneNumber, profileImageVersion: 0 }); 
        console.log(`Mock user ${mockUser.name} added to Firestore with ID ${mockUser.phoneNumber}.`);
      }
    };
    
    const passengerMockForDb: User = { id: TEST_PASSENGER_PHONE, phoneNumber: TEST_PASSENGER_PHONE, name: TEST_PASSENGER_NAME, pin: TEST_PASSENGER_PIN, role: 'passenger', profileImageVersion: 0 };
    const driverMockForDb: User = { id: TEST_DRIVER_PHONE, phoneNumber: TEST_DRIVER_PHONE, name: TEST_DRIVER_NAME, pin: TEST_DRIVER_PIN, role: 'driver', profileImageVersion: 0 };
    
    const seedMockUsers = async () => {
      await seedMockUser(passengerMockForDb);
      await seedMockUser(driverMockForDb);
    };
    // seedMockUsers(); // Commented out to prevent re-seeding on every load, enable if needed for initial setup
  }, []);


  return (
    <AuthContext.Provider value={{ 
      currentUser, 
      isLoading, 
      login, 
      logout, 
      signup,
      changeProfilePicture,
      updateUserRole, // Expose new function
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
