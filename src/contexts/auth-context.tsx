"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { User, UserRole } from '@/lib/types';
import { TEST_PASSENGER_PHONE, TEST_PASSENGER_PIN, TEST_PASSENGER_NAME, TEST_DRIVER_PHONE, TEST_DRIVER_PIN, TEST_DRIVER_NAME } from '@/lib/constants';
import { sendOtp as mockSendOtp } from '@/services/sms'; // Mocked

interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  login: (phoneNumber: string, pin: string) => Promise<boolean>;
  logout: () => void;
  signupDetails: (name: string, pin: string, role: UserRole) => Promise<boolean>;
  tempPhoneNumber: string | null;
  setTempPhoneNumber: (phone: string | null) => void;
  verifyOtp: (otp: string) => Promise<boolean>; // Mocked OTP verification
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock user database (replace with actual backend in production)
const mockUsers: User[] = [
  { id: 'passenger-1', phoneNumber: TEST_PASSENGER_PHONE, name: TEST_PASSENGER_NAME, pin: TEST_PASSENGER_PIN, role: 'passenger' },
  { id: 'driver-1', phoneNumber: TEST_DRIVER_PHONE, name: TEST_DRIVER_NAME, pin: TEST_DRIVER_PIN, role: 'driver' },
];

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tempPhoneNumber, setTempPhoneNumber] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('totoConnectUser');
      if (storedUser) {
        setCurrentUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Failed to parse user from localStorage", error);
      localStorage.removeItem('totoConnectUser');
    }
    setIsLoading(false);
  }, []);

  const login = async (phoneNumber: string, pin: string): Promise<boolean> => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    const user = mockUsers.find(u => u.phoneNumber === phoneNumber && u.pin === pin);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('totoConnectUser', JSON.stringify(user));
      setIsLoading(false);
      router.push(user.role === 'driver' ? '/driver/home' : '/passenger/home');
      return true;
    }
    setIsLoading(false);
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('totoConnectUser');
    router.push('/login');
  };
  
  const verifyOtp = async (otp: string): Promise<boolean> => {
    // Mock OTP verification
    await new Promise(resolve => setTimeout(resolve, 500));
    return otp === "1234"; // Assume 1234 is the "valid" OTP for any number
  };

  const signupDetails = async (name: string, pin: string, role: UserRole): Promise<boolean> => {
    if (!tempPhoneNumber || !role) return false;
    setIsLoading(true);
    // Simulate API call for signup
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (mockUsers.find(u => u.phoneNumber === tempPhoneNumber)) {
       // User already exists - this case should ideally be checked earlier
       setIsLoading(false);
       return false;
    }

    const newUser: User = {
      id: `user-${Date.now()}`,
      phoneNumber: tempPhoneNumber,
      name,
      pin, // In a real app, hash the pin
      role,
    };
    mockUsers.push(newUser); // Add to mock "DB"
    setCurrentUser(newUser);
    localStorage.setItem('totoConnectUser', JSON.stringify(newUser));
    setTempPhoneNumber(null);
    setIsLoading(false);
    router.push(newUser.role === 'driver' ? '/driver/home' : '/passenger/home');
    return true;
  };

  return (
    <AuthContext.Provider value={{ currentUser, isLoading, login, logout, signupDetails, tempPhoneNumber, setTempPhoneNumber, verifyOtp }}>
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
