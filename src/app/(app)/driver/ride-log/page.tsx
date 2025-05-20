
"use client";

import React, { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { RideCard } from "@/components/ride-card";
import { useRides } from "@/contexts/ride-context";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { format, isSameDay, isAfter, isBefore, startOfDay } from 'date-fns';
import type { Ride } from '@/lib/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button'; // For AlertDialog actions if needed

export default function DriverRideLogPage() {
  const { 
    driverUpcomingRides, 
    driverPastRides, 
    isLoading, 
    deleteRide, 
    deleteFutureRecurringInstances,
    getRideById,
    updateRideStatus // Added for potential start/complete actions
  } = useRides();
  const { toast } = useToast();
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const [rideToDelete, setRideToDelete] = useState<string | null>(null);
  const [rideForRecurringDeleteOptions, setRideForRecurringDeleteOptions] = useState<Ride | null>(null);

  const handleEditRide = (rideId: string) => {
    router.push(`/driver/edit-ride/${rideId}`);
  };

  const handleDeleteRide = (rideId: string) => {
    const ride = getRideById(rideId);
    if (ride && ride.wasCreatedAsRecurring) {
      setRideForRecurringDeleteOptions(ride);
      setRideToDelete(null); 
    } else if (ride) {
      setRideToDelete(rideId);
      setRideForRecurringDeleteOptions(null);
    } else {
        toast({title: "Error", description: "Ride details not found.", variant: "destructive"});
    }
  };

  const confirmDeleteSingleRide = async () => {
    let rideIdToDeleteConfirmed = rideToDelete;
    if (rideForRecurringDeleteOptions && !rideToDelete) {
        rideIdToDeleteConfirmed = rideForRecurringDeleteOptions.id;
    }

    if (rideIdToDeleteConfirmed) {
      const success = await deleteRide(rideIdToDeleteConfirmed);
      if (success) {
        toast({ title: "Ride Deleted", description: "The ride has been successfully removed." });
      }
      setRideToDelete(null);
      setRideForRecurringDeleteOptions(null);
    }
  };
  
  const handleConfirmDeleteFutureInstances = async () => {
    if (rideForRecurringDeleteOptions) {
      const result = await deleteFutureRecurringInstances(rideForRecurringDeleteOptions);
      toast({
        title: "Recurring Ride Deletion",
        description: `${result.deletedCount} future instance(s) deleted. ${result.skippedCount} instance(s) with passengers were skipped.`,
      });
      setRideForRecurringDeleteOptions(null);
    }
  };

  const handleStartRide = async (rideId: string) => {
    const success = await updateRideStatus(rideId, 'On Route', 10); 
    if (success) {
      toast({ title: "Ride Started!", description: "The ride is now on route." });
    } else {
      toast({ title: "Failed to Start Ride", variant: "destructive" });
    }
  };

  const handleCompleteRide = async (rideId: string) => {
    const success = await updateRideStatus(rideId, 'Completed', 100);
    if (success) {
      toast({ title: "Ride Completed!", description: "Great job!" });
    } else {
      toast({ title: "Failed to Complete Ride", variant: "destructive" });
    }
  };


  const allDriverRides = useMemo(() => {
    const rideMap = new Map<string, Ride>();
    driverUpcomingRides.forEach(ride => rideMap.set(ride.id, ride));
    driverPastRides.forEach(ride => rideMap.set(ride.id, ride));
    return Array.from(rideMap.values());
  }, [driverUpcomingRides, driverPastRides]);


  const ridesOnSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    return allDriverRides.filter(ride => 
      isSameDay(new Date(ride.departureTime), selectedDate)
    ).sort((a, b) => new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime());
  }, [allDriverRides, selectedDate]);

  const futureRidesAfterSelected = useMemo(() => {
    if (!selectedDate) return [];
    return driverUpcomingRides.filter(ride => 
      isAfter(startOfDay(new Date(ride.departureTime)), startOfDay(selectedDate))
    ).sort((a, b) => new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime());
  }, [driverUpcomingRides, selectedDate]);

  const pastRidesBeforeSelected = useMemo(() => {
    if (!selectedDate) return [];
    return driverPastRides.filter(ride => 
      isBefore(startOfDay(new Date(ride.departureTime)), startOfDay(selectedDate))
    ).sort((a, b) => new Date(b.departureTime).getTime() - new Date(a.departureTime).getTime());
  }, [driverPastRides, selectedDate]);


  if (isLoading) {
    return (
      <div className="container mx-auto p-4 space-y-4">
        <Skeleton className="h-10 w-48 mb-2" />
        <Skeleton className="h-64 w-full md:w-1/3 rounded-xl mb-6" />
        <Skeleton className="h-10 w-full rounded-md mb-4" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-4 text-primary">My Driver Ride Log</h1>
      
      <div className="mb-6 flex justify-center">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          className="rounded-md border shadow"
        />
      </div>

      <Tabs defaultValue="on_selected_date" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="on_selected_date">
            On {selectedDate ? format(selectedDate, 'MMM d') : 'Selected Date'}
          </TabsTrigger>
          <TabsTrigger value="future">Upcoming</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
        </TabsList>

        <TabsContent value="on_selected_date">
          <ScrollArea className="h-[calc(100vh-400px)]">
            {ridesOnSelectedDate.length > 0 ? (
              <div className="space-y-4">
                {ridesOnSelectedDate.map((ride) => (
                  <RideCard 
                    key={ride.id} 
                    ride={ride} 
                    userRole="driver" 
                    onViewDetails={() => router.push(`/ride/${ride.id}`)}
                    onEditRide={handleEditRide}
                    onDeleteRide={() => handleDeleteRide(ride.id)}
                    onStartRide={ride.status === 'Scheduled' ? handleStartRide : undefined}
                    onCompleteRide={(ride.status === 'On Route' || ride.status === 'Destination Reached') ? handleCompleteRide : undefined}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <Image src="https://placehold.co/300x200.png" alt="No rides on this date" width={300} height={200} className="mx-auto rounded-md mb-4" data-ai-hint="empty calendar day" />
                <p className="text-muted-foreground">No rides found for {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'the selected date'}.</p>
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="future">
          <ScrollArea className="h-[calc(100vh-400px)]">
            {futureRidesAfterSelected.length > 0 ? (
              <div className="space-y-4">
                {futureRidesAfterSelected.map((ride) => (
                  <RideCard 
                    key={ride.id} 
                    ride={ride} 
                    userRole="driver" 
                    onViewDetails={() => router.push(`/ride/${ride.id}`)}
                    onEditRide={handleEditRide}
                    onDeleteRide={() => handleDeleteRide(ride.id)}
                    onStartRide={ride.status === 'Scheduled' ? handleStartRide : undefined}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <Image src="https://placehold.co/300x200.png" alt="No upcoming rides" width={300} height={200} className="mx-auto rounded-md mb-4" data-ai-hint="empty future calendar" />
                <p className="text-muted-foreground">No upcoming rides scheduled after {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'the selected date'}.</p>
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="past">
          <ScrollArea className="h-[calc(100vh-400px)]">
            {pastRidesBeforeSelected.length > 0 ? (
              <div className="space-y-4">
                {pastRidesBeforeSelected.map((ride) => (
                  <RideCard 
                    key={ride.id} 
                    ride={ride} 
                    userRole="driver" 
                    onViewDetails={() => router.push(`/ride/${ride.id}`)}
                    onCompleteRide={(ride.status === 'On Route' || ride.status === 'Destination Reached') ? handleCompleteRide : undefined}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                 <Image src="https://placehold.co/300x200.png" alt="No past rides" width={300} height={200} className="mx-auto rounded-md mb-4" data-ai-hint="empty past archive" />
                <p className="text-muted-foreground">No past rides found before {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'the selected date'}.</p>
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Single Ride Deletion Confirmation Dialog */}
      {rideToDelete && !rideForRecurringDeleteOptions && (
        <AlertDialog open={!!rideToDelete} onOpenChange={() => setRideToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete This Ride?</AlertDialogTitle>
              <AlertDialogDescription>
                This action will permanently delete this specific ride instance. This cannot be undone.
                If this ride has passengers, it cannot be deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setRideToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteSingleRide} className="bg-destructive hover:bg-destructive/90">
                Delete This Instance
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Recurring Ride Deletion Options Dialog */}
      {rideForRecurringDeleteOptions && (
        <AlertDialog open={!!rideForRecurringDeleteOptions} onOpenChange={() => setRideForRecurringDeleteOptions(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Recurring Ride</AlertDialogTitle>
              <AlertDialogDescription>
                This ride is part of a recurring pattern. How would you like to delete it?
                Instances with passengers cannot be deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="sm:flex-col gap-2">
              <AlertDialogAction 
                onClick={confirmDeleteSingleRide}
                className="w-full sm:w-auto"
              >
                Delete Only This Instance
              </AlertDialogAction>
              <AlertDialogAction 
                onClick={handleConfirmDeleteFutureInstances}
                className="w-full sm:w-auto bg-destructive hover:bg-destructive/90"
              >
                Delete This & All Future Instances
              </AlertDialogAction>
              <AlertDialogCancel onClick={() => setRideForRecurringDeleteOptions(null)} className="w-full sm:w-auto mt-0">Cancel</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

    