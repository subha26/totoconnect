
"use client";

import type { ReactElement } from 'react';
import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ChatMessage, User } from "@/lib/types";
import { useChat } from "@/contexts/chat-context";
import { Send, X } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from './ui/skeleton';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  rideId: string;
  chatTitle: string;
  currentUser: User | null;
}

export function ChatModal({ isOpen, onClose, rideId, chatTitle, currentUser }: ChatModalProps): ReactElement | null {
  const { sendMessage, getMessages, isSending } = useChat();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !rideId) {
      setMessages([]); // Clear messages when modal is closed or rideId is not set
      return;
    }

    setIsLoadingMessages(true);
    const unsubscribe = getMessages(rideId, (fetchedMessages) => {
      setMessages(fetchedMessages);
      setIsLoadingMessages(false);
    });

    return () => unsubscribe(); // Cleanup listener when component unmounts or rideId changes
  }, [isOpen, rideId, getMessages]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (scrollAreaRef.current) {
      const scrollViewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (scrollViewport) {
        scrollViewport.scrollTop = scrollViewport.scrollHeight;
      }
    }
  }, [messages]);


  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !rideId || !currentUser) return;
    await sendMessage(rideId, newMessage);
    setNewMessage("");
  };

  if (!currentUser) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] md:max-w-[600px] flex flex-col h-[80vh] max-h-[600px]">
        <DialogHeader className="border-b pb-3">
          <DialogTitle>{chatTitle}</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-grow p-1 pr-3 -mr-2" ref={scrollAreaRef}>
          <div className="space-y-4 p-2">
            {isLoadingMessages && (
              <>
                <Skeleton className="h-10 w-3/4 my-2" />
                <Skeleton className="h-10 w-1/2 my-2 ml-auto" />
                <Skeleton className="h-10 w-2/3 my-2" />
              </>
            )}
            {!isLoadingMessages && messages.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No messages yet. Start the conversation!</p>
            )}
            {!isLoadingMessages && messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.senderId === currentUser.id ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[75%] p-3 rounded-lg shadow ${
                    msg.senderId === currentUser.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  <p className="text-sm font-semibold mb-0.5">
                    {msg.senderId === currentUser.id ? "You" : msg.senderName}
                  </p>
                  <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {msg.timestamp ? format(msg.timestamp.toDate(), "p, MMM d") : "Sending..."}
                </p>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="border-t pt-3 mt-auto">
          <form onSubmit={handleSendMessage} className="flex w-full items-center space-x-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-grow"
              autoComplete="off"
            />
            <Button type="submit" size="icon" disabled={isSending || !newMessage.trim()}>
              <Send className="h-4 w-4" />
              <span className="sr-only">Send</span>
            </Button>
          </form>
        </DialogFooter>
        <DialogClose asChild className="absolute right-4 top-4">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
             <span className="sr-only">Close</span>
          </Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
