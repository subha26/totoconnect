
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { User, UserRole } from '@/lib/types';
import { auth, db } from '@/lib/firebase'; // storage import removed as it's not used here for Base64
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, deleteDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
// Firebase Storage functions (ref, uploadBytes, getDownloadURL) are removed as we are using Base64
import { SECURITY_QUESTIONS } from '@/lib/constants';
import { isSameDay } from 'date-fns';
import { useToast } from '@/hooks/use-toast';


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
  const { toast } = useToast();

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser && fbUser.phoneNumber) {
        const userKey = fbUser.phoneNumber.startsWith('+91') ? fbUser.phoneNumber.substring(3) : fbUser.phoneNumber;
        const userDocRef = doc(db, "users", userKey);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const appUser = rehydrateUserTimestamps(userDocSnap.data() as User);
          setCurrentUser(appUser);
          localStorage.setItem('totoConnectUser', JSON.stringify(appUser));
        } else {
          setCurrentUser(null);
          localStorage.removeItem('totoConnectUser');
        }
      } else {
        const storedUserString = localStorage.getItem('totoConnectUser');
        if (storedUserString) {
          try {
            const storedUser = JSON.parse(storedUserString);
            setCurrentUser(rehydrateUserTimestamps(storedUser));
          } catch (e) {
            console.error("Error parsing stored user:", e);
            localStorage.removeItem('totoConnectUser');
            setCurrentUser(null);
          }
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
        profilePictureDataUrl: null, // Initialize with null
        phoneNumberLastUpdatedAt: null,
        securityQuestion,
        securityAnswer,
      };

      await setDoc(userDocRef, newUser);
      setCurrentUser(rehydrateUserTimestamps(newUser));
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

 const changeProfilePicture = async (file: File): Promise<boolean> => {
    if (!currentUser) {
      toast({
        title: "User Not Logged In",
        description: "You must be logged in to change your profile picture.",
        variant: "destructive",
      });
      return false;
    }

    // Limit file size for Base64 to avoid Firestore document size issues (e.g., 200KB)
    const MAX_FILE_SIZE_KB = 200;
    if (file.size > MAX_FILE_SIZE_KB * 1024) {
      toast({
        title: "Image Too Large",
        description: `Please select an image smaller than ${MAX_FILE_SIZE_KB}KB. Storing large images directly in the database is not supported.`,
        variant: "destructive",
        duration: 7000,
      });
      return false;
    }

    setIsLoading(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      return new Promise<boolean>((resolve) => {
        reader.onloadend = async () => {
          const base64DataUrl = reader.result as string;
          const userDocRef = doc(db, "users", currentUser.id);
          try {
            await updateDoc(userDocRef, { profilePictureDataUrl: base64DataUrl });
            setCurrentUser(prevUser => {
              if (!prevUser) return null;
              const updatedUser = { ...prevUser, profilePictureDataUrl: base64DataUrl };
              localStorage.setItem('totoConnectUser', JSON.stringify(updatedUser));
              return rehydrateUserTimestamps(updatedUser);
            });
            setIsLoading(false);
            resolve(true);
          } catch (dbError) {
            console.error("Error updating Firestore with Base64:", dbError);
            toast({
              title: "Database Update Failed",
              description: "Could not save profile picture to database.",
              variant: "destructive",
            });
            setIsLoading(false);
            resolve(false);
          }
        };
        reader.onerror = () => {
          console.error("Error reading file for Base64 conversion");
          toast({
            title: "File Read Error",
            description: "Could not process the selected image file.",
            variant: "destructive",
          });
          setIsLoading(false);
          resolve(false);
        };
      });
    } catch (error: any) {
      console.error("Error changing profile picture (Base64):", error);
      toast({
        title: "Upload Failed",
        description: `Could not update profile picture. Error: ${error.message || 'Unknown error'}.`,
        variant: "destructive",
      });
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
      const userData = rehydrateUserTimestamps(userDocSnap.data() as User);
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
      const userData = rehydrateUserTimestamps(userDocSnap.data() as User);
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
        const userData = rehydrateUserTimestamps(userDocSnap.data() as User);
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
        const userData = rehydrateUserTimestamps(userDocSnap.data() as User);
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
