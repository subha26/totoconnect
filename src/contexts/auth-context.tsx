
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
import { TEST_PASSENGER_PHONE, TEST_PASSENGER_PIN, TEST_PASSENGER_NAME, TEST_DRIVER_PHONE, TEST_DRIVER_PIN, TEST_DRIVER_NAME, SECURITY_QUESTIONS } from '@/lib/constants';
import { isSameDay } from 'date-fns';


interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  login: (phoneNumber: string, pin: string) => Promise<boolean>;
  logout: () => void;
  signup: (phoneNumber: string, name: string, pin: string, role: UserRole, securityQuestion: string, securityAnswer: string) => Promise<boolean>;
  changeProfilePicture: () => Promise<void>;
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
          const storedUser = localStorage.getItem('totoConnectUser');
          if (storedUser) {
            const parsedStoredUser: User = JSON.parse(storedUser);
            if (parsedStoredUser.id === user.uid || parsedStoredUser.id === user.phoneNumber) {
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
        id: phoneNumber,
        phoneNumber,
        name,
        pin,
        role,
        profileImageVersion: 0,
        phoneNumberLastUpdatedAt: null,
        securityQuestion,
        securityAnswer,
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
      if (currentUser.phoneNumberLastUpdatedAt) {
        const lastUpdateDate = (currentUser.phoneNumberLastUpdatedAt as Timestamp).toDate();
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
      const oldUserData = oldUserDocSnap.data() as User;

      const updatedUserData: User = {
        ...oldUserData,
        id: newPhoneNumber,
        phoneNumber: newPhoneNumber,
        phoneNumberLastUpdatedAt: serverTimestamp() as Timestamp,
      };

      await setDoc(newPhoneUserDocRef, updatedUserData);
      await deleteDoc(oldUserDocRef);

      const displayUserData: User = {
        ...updatedUserData,
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
      setCurrentUser(prev => prev ? { ...prev, pin: newPin } : null);
      if (currentUser) {
         localStorage.setItem('totoConnectUser', JSON.stringify({ ...currentUser, pin: newPin }));
      }
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
      setCurrentUser(prev => prev ? { ...prev, securityQuestion: question, securityAnswer: answer } : null);
       if (currentUser) {
         localStorage.setItem('totoConnectUser', JSON.stringify({ ...currentUser, securityQuestion: question, securityAnswer: answer }));
      }
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
        // Case-insensitive comparison for security answer
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
          id: mockUser.phoneNumber,
          profileImageVersion: 0,
          phoneNumberLastUpdatedAt: null,
          securityQuestion: SECURITY_QUESTIONS[0], // Default question
          securityAnswer: "testanswer" // Default answer for mock users
        });
        console.log(`Mock user ${mockUser.name} added to Firestore with ID ${mockUser.phoneNumber}.`);
      }
    };

    const passengerMockForDb: User = { id: TEST_PASSENGER_PHONE, phoneNumber: TEST_PASSENGER_PHONE, name: TEST_PASSENGER_NAME, pin: TEST_PASSENGER_PIN, role: 'passenger' };
    const driverMockForDb: User = { id: TEST_DRIVER_PHONE, phoneNumber: TEST_DRIVER_PHONE, name: TEST_DRIVER_NAME, pin: TEST_DRIVER_PIN, role: 'driver' };

    // const seedMockUsers = async () => {
    //   await seedMockUser(passengerMockForDb);
    //   await seedMockUser(driverMockForDb);
    // };
    // seedMockUsers(); // Commented out to prevent re-seeding.
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
