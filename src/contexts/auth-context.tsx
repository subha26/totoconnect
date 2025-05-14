
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
import { doc, setDoc, getDoc, updateDoc, deleteDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { TEST_PASSENGER_PHONE, TEST_PASSENGER_PIN, TEST_PASSENGER_NAME, TEST_DRIVER_PHONE, TEST_DRIVER_PIN, TEST_DRIVER_NAME } from '@/lib/constants';
import { isSameDay } from 'date-fns';


interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  login: (phoneNumber: string, pin: string) => Promise<boolean>;
  logout: () => void;
  signup: (phoneNumber: string, name: string, pin: string, role: UserRole) => Promise<boolean>;
  changeProfilePicture: () => Promise<void>;
  updateUserRole: (newRole: UserRole) => Promise<boolean>;
  updatePhoneNumber: (newPhoneNumber: string) => Promise<{ success: boolean; message: string }>;
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
        const userDocRef = doc(db, "users", user.uid); // Assuming UID is used if Firebase Auth is primary
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const appUser = userDocSnap.data() as User;
          setCurrentUser(appUser);
          localStorage.setItem('totoConnectUser', JSON.stringify(appUser));
        } else {
          // Fallback for mock auth or if user doc is identified by phone number
          const storedUser = localStorage.getItem('totoConnectUser');
          if (storedUser) {
            const parsedStoredUser: User = JSON.parse(storedUser);
             // For Firebase Auth, ID should match UID. For mock, it might be phone.
            if (parsedStoredUser.id === user.uid || parsedStoredUser.id === user.phoneNumber) {
                 setCurrentUser(parsedStoredUser);
            } else {
              // If Firebase Auth user and localStorage user ID don't match, prioritize Firebase Auth user
              // This block might need adjustment if a full Firebase Auth (non-mock) user is created without a Firestore doc yet
              setCurrentUser(null); 
              localStorage.removeItem('totoConnectUser');
            }
          } else {
            setCurrentUser(null);
            localStorage.removeItem('totoConnectUser');
          }
        }
      } else {
        // No Firebase Auth user
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
      const userDocRef = doc(db, "users", phoneNumber); 
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        console.error("User with this phone number already exists.");
        setIsLoading(false);
        return false; 
      }

      const newUser: User = {
        id: phoneNumber, 
        phoneNumber,
        name,
        pin, 
        role,
        profileImageVersion: 0,
        phoneNumberLastUpdatedAt: null,
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

  const updatePhoneNumber = async (newPhoneNumber: string): Promise<{ success: boolean; message: string }> => {
    if (!currentUser) return { success: false, message: "User not logged in." };
    if (newPhoneNumber.length !== 10 || !/^\d{10}$/.test(newPhoneNumber)) {
      return { success: false, message: "Invalid phone number format. Must be 10 digits." };
    }
    if (newPhoneNumber === currentUser.phoneNumber) {
        return { success: false, message: "New phone number is the same as the current one." };
    }

    setIsLoading(true);

    try {
      // Check rate limit
      if (currentUser.phoneNumberLastUpdatedAt) {
        const lastUpdateDate = (currentUser.phoneNumberLastUpdatedAt as Timestamp).toDate();
        if (isSameDay(lastUpdateDate, new Date())) {
          setIsLoading(false);
          return { success: false, message: "Phone number can only be updated once per day." };
        }
      }

      // Check if new phone number already exists for another user
      const newPhoneUserDocRef = doc(db, "users", newPhoneNumber);
      const newPhoneUserDocSnap = await getDoc(newPhoneUserDocRef);
      if (newPhoneUserDocSnap.exists()) {
        setIsLoading(false);
        return { success: false, message: "This phone number is already registered to another account." };
      }

      // Get current user data
      const oldUserDocRef = doc(db, "users", currentUser.id);
      const oldUserDocSnap = await getDoc(oldUserDocRef);
      if (!oldUserDocSnap.exists()) {
        setIsLoading(false);
        return { success: false, message: "Current user data not found." };
      }
      const oldUserData = oldUserDocSnap.data() as User;

      // Prepare new user data
      const updatedUserData: User = {
        ...oldUserData,
        id: newPhoneNumber, // New document ID will be the new phone number
        phoneNumber: newPhoneNumber,
        phoneNumberLastUpdatedAt: serverTimestamp() as Timestamp, // This will be resolved by Firestore
      };
      
      // Create new document and delete old one (simulating ID change)
      await setDoc(newPhoneUserDocRef, updatedUserData);
      await deleteDoc(oldUserDocRef);

      // Update local state and localStorage
      // For immediate UI update, we can create a temporary User object with a JS Date for phoneNumberLastUpdatedAt
      const displayUserData: User = {
        ...updatedUserData,
        // Firestore serverTimestamp is not immediately available client-side.
        // For UI, we can use a client-side timestamp or refetch.
        // Here, we'll set it to a JS Date object for local state.
        // The actual value in Firestore will be a server timestamp.
        phoneNumberLastUpdatedAt: Timestamp.now(), 
      };
      setCurrentUser(displayUserData);
      localStorage.setItem('totoConnectUser', JSON.stringify(displayUserData));
      
      setIsLoading(false);
      return { success: true, message: "Phone number updated successfully." };

    } catch (error) {
      console.error("Error updating phone number:", error);
      setIsLoading(false);
      return { success: false, message: "An error occurred while updating phone number." };
    }
  };
  
  useEffect(() => {
    const seedMockUser = async (mockUser: User) => {
      const userRef = doc(db, "users", mockUser.phoneNumber); 
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        // Add phoneNumberLastUpdatedAt: null during seeding
        await setDoc(userRef, { ...mockUser, id: mockUser.phoneNumber, profileImageVersion: 0, phoneNumberLastUpdatedAt: null }); 
        console.log(`Mock user ${mockUser.name} added to Firestore with ID ${mockUser.phoneNumber}.`);
      }
    };
    
    const passengerMockForDb: User = { id: TEST_PASSENGER_PHONE, phoneNumber: TEST_PASSENGER_PHONE, name: TEST_PASSENGER_NAME, pin: TEST_PASSENGER_PIN, role: 'passenger', profileImageVersion: 0, phoneNumberLastUpdatedAt: null };
    const driverMockForDb: User = { id: TEST_DRIVER_PHONE, phoneNumber: TEST_DRIVER_PHONE, name: TEST_DRIVER_NAME, pin: TEST_DRIVER_PIN, role: 'driver', profileImageVersion: 0, phoneNumberLastUpdatedAt: null };
    
    // const seedMockUsers = async () => {
    //   await seedMockUser(passengerMockForDb);
    //   await seedMockUser(driverMockForDb);
    // };
    // seedMockUsers(); // Commented out to prevent re-seeding. Enable for initial setup.
  }, []);


  return (
    <AuthContext.Provider value={{ 
      currentUser, 
      isLoading, 
      login, 
      logout, 
      signup,
      changeProfilePicture,
      updateUserRole,
      updatePhoneNumber,
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

// For RideFirestoreData in ride-context.tsx, it typically won't need phoneNumberLastUpdatedAt
// unless rides directly query/store that piece of user info, which is unlikely.
// The User type is the source of truth for user properties.
