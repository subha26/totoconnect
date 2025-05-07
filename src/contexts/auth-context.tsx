
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { User, UserRole } from '@/lib/types';
import { auth, db } from '@/lib/firebase';
import { 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  onAuthStateChanged,
  signOut as firebaseSignOut,
  type ConfirmationResult
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { TEST_PASSENGER_PHONE, TEST_PASSENGER_PIN, TEST_PASSENGER_NAME, TEST_DRIVER_PHONE, TEST_DRIVER_PIN, TEST_DRIVER_NAME } from '@/lib/constants';


interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  login: (phoneNumber: string, pin: string) => Promise<boolean>;
  logout: () => void;
  signupDetails: (name: string, pin: string, role: UserRole) => Promise<boolean>;
  sendOtpToFirebase: (phoneNumber: string, recaptchaContainerID: string) => Promise<boolean>;
  confirmOtpFromFirebase: (otp: string) => Promise<boolean>;
  tempPhoneNumberStore: string | null; // Renamed to avoid conflict with tempPhoneNumber state variable
  setTempPhoneNumberStore: (phone: string | null) => void; // Renamed
  firebaseUser: import('firebase/auth').User | null; // Expose Firebase user if needed
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// For Recaptcha
declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    confirmationResult?: ConfirmationResult;
  }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<import('firebase/auth').User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tempPhoneNumberStore, setTempPhoneNumberStoreState] = useState<string | null>(null); // Renamed state variable
  const router = useRouter();

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        // If Firebase user exists, try to load app user profile from Firestore
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const appUser = userDocSnap.data() as User;
          setCurrentUser(appUser);
          localStorage.setItem('totoConnectUser', JSON.stringify(appUser));
        } else {
          // User authenticated with Firebase but no profile in Firestore
          // This can happen if signup/details step was interrupted
          // For now, clear app user. Logic might be needed to redirect to signup/details
          setCurrentUser(null);
          localStorage.removeItem('totoConnectUser');
        }
      } else {
        // No Firebase user, check localStorage for PIN-based login session
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
  
  // Function to set tempPhoneNumberStore, exposed via context
  const setTempPhoneNumberStore = (phone: string | null) => {
    setTempPhoneNumberStoreState(phone);
  };

  const login = async (phoneNumber: string, pin: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("phoneNumber", "==", phoneNumber));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setIsLoading(false);
        return false; // User not found
      }

      let loggedInUser: User | null = null;
      querySnapshot.forEach((doc) => {
        // Assuming phone numbers are unique, this loop runs once if user exists
        const userData = doc.data() as User;
        if (userData.pin === pin) { // Direct PIN comparison (consider hashing in production)
          loggedInUser = userData;
        }
      });

      if (loggedInUser) {
        setCurrentUser(loggedInUser);
        localStorage.setItem('totoConnectUser', JSON.stringify(loggedInUser));
        setIsLoading(false);
        router.push(loggedInUser.role === 'driver' ? '/driver/home' : '/passenger/home');
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
      await firebaseSignOut(auth); // Sign out from Firebase
    } catch (error) {
      console.error("Firebase sign out error: ", error);
    }
    setCurrentUser(null);
    setFirebaseUser(null);
    localStorage.removeItem('totoConnectUser');
    window.confirmationResult = undefined; // Clear confirmation result
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear(); // Clear recaptcha
    }
    setIsLoading(false);
    router.push('/login');
  };

  const sendOtpToFirebase = async (phoneNumber: string, recaptchaContainerID: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaContainerID, {
          'size': 'invisible', // Can be 'normal' or 'compact' or 'invisible'
          'callback': (response: any) => {
            // reCAPTCHA solved, allow signInWithPhoneNumber.
          },
          'expired-callback': () => {
            // Response expired. Ask user to solve reCAPTCHA again.
            // Potentially reset recaptchaVerifier here
             if (window.recaptchaVerifier) {
                window.recaptchaVerifier.render().then((widgetId) => {
                    // @ts-ignore // grecaptcha might not be globally typed
                    window.grecaptcha.reset(widgetId);
                });
            }
          }
        });
      }
      
      // Firebase phone numbers need to be in E.164 format (e.g., +1XXXXXXXXXX)
      // Assuming domestic numbers for now, prepend country code if necessary.
      // For India: +91
      const formattedPhoneNumber = `+91${phoneNumber}`;

      const confirmation = await signInWithPhoneNumber(auth, formattedPhoneNumber, window.recaptchaVerifier);
      window.confirmationResult = confirmation;
      setTempPhoneNumberStore(phoneNumber); // Store the original (non-formatted) number
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error("OTP Send Error: ", error);
      // Reset reCAPTCHA if it exists, to allow retry
        if (window.recaptchaVerifier) {
            window.recaptchaVerifier.clear(); 
            // Potentially re-initialize or prompt user to try again
        }
      setIsLoading(false);
      return false;
    }
  };

  const confirmOtpFromFirebase = async (otp: string): Promise<boolean> => {
    if (!window.confirmationResult) {
      console.error("No OTP confirmation result found.");
      return false;
    }
    setIsLoading(true);
    try {
      const result = await window.confirmationResult.confirm(otp);
      // User signed in successfully. `result.user` contains the user.
      setFirebaseUser(result.user); 
      // tempPhoneNumberStore should already be set from sendOtpToFirebase
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error("OTP Verification Error: ", error);
      setIsLoading(false);
      return false;
    }
  };

  const signupDetails = async (name: string, pin: string, role: UserRole): Promise<boolean> => {
    if (!firebaseUser || !tempPhoneNumberStore || !role) {
      console.error("Missing Firebase user, phone number, or role for signup details.");
      return false;
    }
    setIsLoading(true);
    try {
      const newUser: User = {
        id: firebaseUser.uid, // Use Firebase UID as the document ID and user ID
        phoneNumber: tempPhoneNumberStore, // Store the original non-E.164 phone
        name,
        pin, // Store PIN (consider hashing in production)
        role,
      };
      
      await setDoc(doc(db, "users", firebaseUser.uid), newUser);
      
      setCurrentUser(newUser);
      localStorage.setItem('totoConnectUser', JSON.stringify(newUser));
      setTempPhoneNumberStore(null); // Clear temp phone number
      window.confirmationResult = undefined; // Clear confirmation result

      setIsLoading(false);
      router.push(newUser.role === 'driver' ? '/driver/home' : '/passenger/home');
      return true;
    } catch (error) {
      console.error("Signup details error: ", error);
      setIsLoading(false);
      return false;
    }
  };
  
  // Add mock users to Firestore if they don't exist (for testing convenience)
  // This should be removed or conditional for production
  useEffect(() => {
    const addMockUser = async (mockUser: User, uid: string) => {
      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        // For mock users, we need a UID. Since they aren't going through Firebase Auth flow for creation,
        // we'll use their predefined ID as UID for Firestore.
        // This is purely for seeding test data.
        await setDoc(userRef, { ...mockUser, id: uid }); 
        console.log(`Mock user ${mockUser.name} added to Firestore with UID ${uid}.`);
      }
    };

    // Use predefined UIDs for mock users for consistency if you want to simulate them
    // Or, for this dev setup, we can just use their existing IDs if they are unique.
    // This part is tricky because mock users don't have Firebase UIDs unless they sign up.
    // The login logic currently doesn't use Firebase UIDs but queries by phone.
    // For simplicity, let's assume the mock users from constants.ts are illustrative
    // and real users will be created via the signup flow.
    // The PIN-based login will query by phone number.
    // If you want to pre-populate Firestore for test users that can log in with PIN:
    const passengerMockForDb: User = { id: 'passenger-1-fid', phoneNumber: TEST_PASSENGER_PHONE, name: TEST_PASSENGER_NAME, pin: TEST_PASSENGER_PIN, role: 'passenger' };
    const driverMockForDb: User = { id: 'driver-1-fid', phoneNumber: TEST_DRIVER_PHONE, name: TEST_DRIVER_NAME, pin: TEST_DRIVER_PIN, role: 'driver' };
    
    // Check and add, querying by phone to avoid duplicates if run multiple times
    const seedMockUsers = async () => {
      const usersCol = collection(db, "users");
      
      const passengerQ = query(usersCol, where("phoneNumber", "==", TEST_PASSENGER_PHONE));
      const passengerSnap = await getDocs(passengerQ);
      if (passengerSnap.empty) {
        await setDoc(doc(usersCol, passengerMockForDb.id), passengerMockForDb);
        console.log("Seeded test passenger");
      }

      const driverQ = query(usersCol, where("phoneNumber", "==", TEST_DRIVER_PHONE));
      const driverSnap = await getDocs(driverQ);
      if (driverSnap.empty) {
         await setDoc(doc(usersCol, driverMockForDb.id), driverMockForDb);
         console.log("Seeded test driver");
      }
    };
    // seedMockUsers(); // Uncomment to seed on app load during development

  }, []);


  return (
    <AuthContext.Provider value={{ 
      currentUser, 
      isLoading, 
      login, 
      logout, 
      signupDetails, 
      sendOtpToFirebase, 
      confirmOtpFromFirebase,
      tempPhoneNumberStore, 
      setTempPhoneNumberStore,
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
