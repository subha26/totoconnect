
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { User, UserRole } from '@/lib/types';
import { auth, db, storage } from '@/lib/firebase'; // Import storage
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, deleteDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage"; // Firebase Storage functions
import { TEST_PASSENGER_PHONE, TEST_PASSENGER_PIN, TEST_PASSENGER_NAME, TEST_DRIVER_PHONE, TEST_DRIVER_PIN, TEST_DRIVER_NAME, SECURITY_QUESTIONS } from '@/lib/constants';
import { isSameDay } from 'date-fns';
import { useToast } from '@/hooks/use-toast'; // Import useToast


interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  login: (phoneNumber: string, pin: string) => Promise<boolean>;
  logout: () => void;
  signup: (phoneNumber: string, name: string, pin: string, role: UserRole, securityQuestion: string, securityAnswer: string) => Promise<boolean>;
  changeProfilePicture: (file: File) => Promise<boolean>; 
  updateUserRole: (newRole: UserRole) => Promise<boolean>;
  updatePhoneNumber: (newPhoneNumber: string) => Promise<{ success: boolean; message: string }>;
  changePin: (oldPin: string, newPin: string) => Promise<{ success: boolean; message: string }>;
  updateSecurityQA: (currentPin: string, question: string, answer: string) => Promise<{ success: boolean; message: string }>;
  getUserSecurityQuestion: (phoneNumber: string) => Promise<string | null>;
  verifySecurityAnswer: (phoneNumber: string, answer: string) => Promise<boolean>;
  resetPin: (phoneNumber: string, newPin: string) => Promise<boolean>;
  firebaseUser: import('firebase/auth').User | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const rehydrateUserTimestamps = (data: any): User => {
  const userData = { ...data } as User;

  if (userData.phoneNumberLastUpdatedAt && typeof userData.phoneNumberLastUpdatedAt === 'object' && !(userData.phoneNumberLastUpdatedAt instanceof Timestamp)) {
    if ('seconds' in userData.phoneNumberLastUpdatedAt && 'nanoseconds' in userData.phoneNumberLastUpdatedAt) {
      userData.phoneNumberLastUpdatedAt = new Timestamp(
        (userData.phoneNumberLastUpdatedAt as any).seconds,
        (userData.phoneNumberLastUpdatedAt as any).nanoseconds
      );
    } else {
      userData.phoneNumberLastUpdatedAt = null;
    }
  } else if (userData.phoneNumberLastUpdatedAt && typeof userData.phoneNumberLastUpdatedAt === 'string') {
    // Attempt to parse if it's an ISO string (less likely with Firestore but good to handle)
    try {
        const date = new Date(userData.phoneNumberLastUpdatedAt);
        if (!isNaN(date.getTime())) {
          userData.phoneNumberLastUpdatedAt = Timestamp.fromDate(date);
        } else {
          userData.phoneNumberLastUpdatedAt = null;
        }
      } catch (e) {
        userData.phoneNumberLastUpdatedAt = null;
      }
  }
  // Ensure it's either a Timestamp or null
  if (userData.phoneNumberLastUpdatedAt && !(userData.phoneNumberLastUpdatedAt instanceof Timestamp)) {
      userData.phoneNumberLastUpdatedAt = null;
  }

  return userData;
};


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<import('firebase/auth').User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast(); // Get toast function

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser && fbUser.phoneNumber) {
        // If Firebase Auth user exists, try to load corresponding Firestore user
        // Prioritize phone number from Firebase Auth if available, otherwise use fbUser.uid as fallback key if your Firestore uses uids
        const userKey = fbUser.phoneNumber.startsWith('+91') ? fbUser.phoneNumber.substring(3) : fbUser.phoneNumber;
        const userDocRef = doc(db, "users", userKey);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const appUser = rehydrateUserTimestamps(userDocSnap.data() as User);
          setCurrentUser(appUser);
          localStorage.setItem('totoConnectUser', JSON.stringify(appUser));
        } else {
          // Firebase user exists but no Firestore doc. This state might need specific handling depending on app flow.
          // For now, if app primarily relies on its own Firestore user store, treat as no app user.
          setCurrentUser(null);
          localStorage.removeItem('totoConnectUser');
        }
      } else {
        // No Firebase Auth user, check localStorage for app's custom session
        const storedUserString = localStorage.getItem('totoConnectUser');
        if (storedUserString) {
          setCurrentUser(rehydrateUserTimestamps(JSON.parse(storedUserString)));
        } else {
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

      const userData = rehydrateUserTimestamps(userDocSnap.data() as User);
      if (userData.pin === pin) {
        setCurrentUser(userData);
        localStorage.setItem('totoConnectUser', JSON.stringify(userData));
        // NOTE: This custom login does NOT sign the user into Firebase Auth.
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
      await firebaseSignOut(auth); // This signs out of Firebase Auth
    } catch (error) {
      console.error("Firebase sign out error: ", error);
    }
    // Clear app-specific session
    setCurrentUser(null);
    setFirebaseUser(null); 
    localStorage.removeItem('totoConnectUser');
    setIsLoading(false);
    router.push('/login');
  };

  const signup = async (phoneNumber: string, name: string, pin: string, role: UserRole, securityQuestion: string, securityAnswer: string): Promise<boolean> => {
    if (!role) {
      console.error("Role is required for signup.");
      return false;
    }
    if (!securityQuestion || !securityAnswer) {
      console.error("Security question and answer are required.");
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
        id: phoneNumber, // Using phone number as ID
        phoneNumber,
        name,
        pin,
        role,
        profilePictureUrl: null,
        phoneNumberLastUpdatedAt: null,
        securityQuestion,
        securityAnswer,
      };

      await setDoc(userDocRef, newUser);
      setCurrentUser(rehydrateUserTimestamps(newUser)); 
      localStorage.setItem('totoConnectUser', JSON.stringify(newUser));
      // NOTE: This custom signup does NOT sign the user into Firebase Auth.
      setIsLoading(false);
      router.push(newUser.role === 'driver' ? '/driver/home' : '/passenger/home');
      return true;
    } catch (error) {
      console.error("Signup error: ", error);
      setIsLoading(false);
      return false;
    }
  };

  const changeProfilePicture = async (file: File): Promise<boolean> => {
    if (!currentUser) return false;
    
    console.log("Attempting to upload profile picture. Current app user:", currentUser.id, "Firebase Auth user:", auth.currentUser);

    setIsLoading(true);
    try {
      const imageRef = storageRef(storage, `profile_pictures/${currentUser.id}/${file.name}`);
      await uploadBytes(imageRef, file);
      const downloadURL = await getDownloadURL(imageRef);

      const userDocRef = doc(db, "users", currentUser.id);
      await updateDoc(userDocRef, { profilePictureUrl: downloadURL });

      setCurrentUser(prevUser => {
        if (!prevUser) return null;
        const updatedUser = { ...prevUser, profilePictureUrl: downloadURL };
        localStorage.setItem('totoConnectUser', JSON.stringify(updatedUser));
        return rehydrateUserTimestamps(updatedUser);
      });
      setIsLoading(false);
      return true;
    } catch (error: any) {
      console.error("Error changing profile picture:", error);
      if (error.code === 'storage/unauthorized' || error.code === 'storage/object-not-found') { // object-not-found can sometimes mask auth issues if rules are very restrictive
        toast({
          title: "Upload Failed: Permission Denied",
          description: "Could not upload profile picture. This usually means you're not fully authenticated with Firebase services. Please ensure Firebase Auth session is active.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Upload Failed",
          description: "Could not update profile picture. Please try again.",
          variant: "destructive",
        });
      }
      setIsLoading(false);
      return false;
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
        return rehydrateUserTimestamps(updatedUser);
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
      const lastUpdateTimestamp = currentUser.phoneNumberLastUpdatedAt instanceof Timestamp 
        ? currentUser.phoneNumberLastUpdatedAt 
        : null;

      if (lastUpdateTimestamp) {
        const lastUpdateDate = lastUpdateTimestamp.toDate();
        if (isSameDay(lastUpdateDate, new Date())) {
          setIsLoading(false);
          return { success: false, message: "Phone number can only be updated once per day." };
        }
      }

      const newPhoneUserDocRef = doc(db, "users", newPhoneNumber);
      const newPhoneUserDocSnap = await getDoc(newPhoneUserDocRef);
      if (newPhoneUserDocSnap.exists()) {
        setIsLoading(false);
        return { success: false, message: "This phone number is already registered to another account." };
      }

      const oldUserDocRef = doc(db, "users", currentUser.id);
      const oldUserDocSnap = await getDoc(oldUserDocRef);
      if (!oldUserDocSnap.exists()) {
        setIsLoading(false);
        return { success: false, message: "Current user data not found." };
      }
      const oldUserData = rehydrateUserTimestamps(oldUserDocSnap.data() as User);
      
      const updatedUserData: User = {
        ...oldUserData,
        id: newPhoneNumber, // Update the ID to the new phone number
        phoneNumber: newPhoneNumber,
        phoneNumberLastUpdatedAt: serverTimestamp() as Timestamp,
      };

      await setDoc(newPhoneUserDocRef, updatedUserData);
      await deleteDoc(oldUserDocRef);
      
      const displayUserData: User = {
        ...updatedUserData,
        phoneNumberLastUpdatedAt: Timestamp.now(), 
      };

      setCurrentUser(rehydrateUserTimestamps(displayUserData)); 
      localStorage.setItem('totoConnectUser', JSON.stringify(displayUserData));

      setIsLoading(false);
      return { success: true, message: "Phone number updated successfully." };

    } catch (error) {
      console.error("Error updating phone number:", error);
      setIsLoading(false);
      return { success: false, message: "An error occurred while updating phone number." };
    }
  };

  const changePin = async (oldPin: string, newPin: string): Promise<{ success: boolean; message: string }> => {
    if (!currentUser) return { success: false, message: "User not logged in." };
    setIsLoading(true);
    try {
      const userDocRef = doc(db, "users", currentUser.id);
      const userDocSnap = await getDoc(userDocRef);
      if (!userDocSnap.exists()) {
        setIsLoading(false);
        return { success: false, message: "User data not found." };
      }
      const userData = userDocSnap.data() as User;
      if (userData.pin !== oldPin) {
        setIsLoading(false);
        return { success: false, message: "Old PIN is incorrect." };
      }
      await updateDoc(userDocRef, { pin: newPin });
      setCurrentUser(prev => {
         if (!prev) return null;
         const updatedUser = rehydrateUserTimestamps({ ...prev, pin: newPin });
         localStorage.setItem('totoConnectUser', JSON.stringify(updatedUser));
         return updatedUser;
      });
      setIsLoading(false);
      return { success: true, message: "PIN changed successfully." };
    } catch (error) {
      console.error("Error changing PIN:", error);
      setIsLoading(false);
      return { success: false, message: "An error occurred while changing PIN." };
    }
  };

  const updateSecurityQA = async (currentPin: string, question: string, answer: string): Promise<{ success: boolean; message: string }> => {
    if (!currentUser) return { success: false, message: "User not logged in." };
    setIsLoading(true);
    try {
      const userDocRef = doc(db, "users", currentUser.id);
      const userDocSnap = await getDoc(userDocRef);
      if (!userDocSnap.exists()) {
        setIsLoading(false);
        return { success: false, message: "User data not found." };
      }
      const userData = userDocSnap.data() as User;
      if (userData.pin !== currentPin) {
        setIsLoading(false);
        return { success: false, message: "Incorrect PIN. Cannot update security question/answer." };
      }
      await updateDoc(userDocRef, { securityQuestion: question, securityAnswer: answer });
      setCurrentUser(prev => {
        if(!prev) return null;
        const updatedUser = rehydrateUserTimestamps({ ...prev, securityQuestion: question, securityAnswer: answer });
        localStorage.setItem('totoConnectUser', JSON.stringify(updatedUser));
        return updatedUser;
      });
      setIsLoading(false);
      return { success: true, message: "Security question and answer updated." };
    } catch (error) {
      console.error("Error updating security Q/A:", error);
      setIsLoading(false);
      return { success: false, message: "An error occurred." };
    }
  };
  
  const getUserSecurityQuestion = async (phoneNumber: string): Promise<string | null> => {
    setIsLoading(true);
    try {
      const userDocRef = doc(db, "users", phoneNumber);
      const userDocSnap = await getDoc(userDocRef);
      setIsLoading(false);
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data() as User;
        return userData.securityQuestion || null;
      }
      return null;
    } catch (error) {
      console.error("Error fetching security question:", error);
      setIsLoading(false);
      return null;
    }
  };

  const verifySecurityAnswer = async (phoneNumber: string, answer: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const userDocRef = doc(db, "users", phoneNumber);
      const userDocSnap = await getDoc(userDocRef);
      setIsLoading(false);
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data() as User;
        return userData.securityAnswer?.toLowerCase() === answer.toLowerCase();
      }
      return false;
    } catch (error) {
      console.error("Error verifying security answer:", error);
      setIsLoading(false);
      return false;
    }
  };

  const resetPin = async (phoneNumber: string, newPin: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const userDocRef = doc(db, "users", phoneNumber);
      await updateDoc(userDocRef, { pin: newPin });
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error("Error resetting PIN:", error);
      setIsLoading(false);
      return false;
    }
  };

  useEffect(() => {
    const seedMockUser = async (mockUser: User) => {
      const userRef = doc(db, "users", mockUser.phoneNumber);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          ...mockUser,
          id: mockUser.phoneNumber, // Ensure id is set to phone number
          profilePictureUrl: mockUser.profilePictureUrl || null, 
          phoneNumberLastUpdatedAt: mockUser.phoneNumberLastUpdatedAt || null, 
          securityQuestion: mockUser.securityQuestion || SECURITY_QUESTIONS[0], 
          securityAnswer: mockUser.securityAnswer || "testanswer" 
        });
        console.log(`Mock user ${mockUser.name} added to Firestore with ID ${mockUser.phoneNumber}.`);
      }
    };

    const passengerMockForDb: User = { id: TEST_PASSENGER_PHONE, phoneNumber: TEST_PASSENGER_PHONE, name: TEST_PASSENGER_NAME, pin: TEST_PASSENGER_PIN, role: 'passenger', profilePictureUrl: null, securityQuestion: SECURITY_QUESTIONS[0], securityAnswer: "testanswer" };
    const driverMockForDb: User = { id: TEST_DRIVER_PHONE, phoneNumber: TEST_DRIVER_PHONE, name: TEST_DRIVER_NAME, pin: TEST_DRIVER_PIN, role: 'driver', profilePictureUrl: null, securityQuestion: SECURITY_QUESTIONS[0], securityAnswer: "testanswer" };
    
    // Seed users if they don't exist
    // seedMockUser(passengerMockForDb);
    // seedMockUser(driverMockForDb);
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
      changePin,
      updateSecurityQA,
      getUserSecurityQuestion,
      verifySecurityAnswer,
      resetPin,
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

      
    