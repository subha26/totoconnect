
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ChatMessage, User } from '@/lib/types';
import { db } from '@/lib/firebase';
import { useAuth } from './auth-context';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy,
  Timestamp,
  onSnapshot,
  doc,
  serverTimestamp
} from 'firebase/firestore';

interface ChatContextType {
  sendMessage: (rideId: string, text: string) => Promise<void>;
  getMessages: (rideId: string, callback: (messages: ChatMessage[]) => void) => () => void; // Returns unsubscribe function
  isSending: boolean;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const { currentUser } = useAuth();
  const [isSending, setIsSending] = useState(false);

  const sendMessage = useCallback(async (rideId: string, text: string) => {
    if (!currentUser || !text.trim()) return;

    setIsSending(true);
    try {
      const messagesColRef = collection(db, `chats/${rideId}/messages`);
      await addDoc(messagesColRef, {
        senderId: currentUser.id,
        senderName: currentUser.name,
        text: text.trim(),
        timestamp: serverTimestamp() as Timestamp,
      });
    } catch (error) {
      console.error("Error sending message:", error);
      // Optionally, show a toast to the user
    } finally {
      setIsSending(false);
    }
  }, [currentUser]);

  const getMessages = useCallback((rideId: string, callback: (messages: ChatMessage[]) => void) => {
    const messagesColRef = collection(db, `chats/${rideId}/messages`);
    const q = query(messagesColRef, orderBy("timestamp", "asc"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedMessages: ChatMessage[] = [];
      querySnapshot.forEach((doc) => {
        fetchedMessages.push({ id: doc.id, ...doc.data() } as ChatMessage);
      });
      callback(fetchedMessages);
    }, (error) => {
      console.error("Error fetching messages:", error);
      // Optionally, show a toast to the user
    });

    return unsubscribe; // Return the unsubscribe function for cleanup
  }, []);
  

  return (
    <ChatContext.Provider value={{ sendMessage, getMessages, isSending }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
