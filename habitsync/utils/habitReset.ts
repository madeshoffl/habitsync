import { doc, getDoc, updateDoc, collection, getDocs, query, where, Timestamp } from "firebase/firestore";
import { db } from "../lib/firebase";

export type FirestoreHabit = {
  id: string;
  streak: number;
  completed: boolean;
  lastCompletedDate?: Timestamp;
  userId: string;
  name: string;
  icon: string;
  color: string;
  category: string;
};

/**
 * Get today's date at midnight in local timezone
 */
export function getToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

/**
 * Get yesterday's date at midnight in local timezone
 */
export function getYesterday(): Date {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  return yesterday;
}

/**
 * Check if two dates are the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Convert Firestore Timestamp to Date, handling undefined
 */
export function timestampToDate(timestamp?: Timestamp): Date | null {
  if (!timestamp) return null;
  return timestamp.toDate();
}

/**
 * Check if a date is before today (not completed today)
 */
export function isBeforeToday(date: Date | null): boolean {
  if (!date) return true;
  const today = getToday();
  return date < today;
}

/**
 * Reset all habits for a user and handle streak decay
 * This function should be called when it's determined that it's a new day
 */
export async function resetUserHabits(userId: string): Promise<void> {
  // Get all habits for the user
  const habitsQuery = query(collection(db, "habits"), where("userId", "==", userId));
  const habitsSnapshot = await getDocs(habitsQuery);
  
  const yesterday = getYesterday();
  const updatePromises: Promise<void>[] = [];

  habitsSnapshot.forEach((docSnapshot) => {
    const habit = docSnapshot.data() as FirestoreHabit;
    const updates: Partial<FirestoreHabit> = {
      completed: false,
    };

    // Check if streak should decay
    const lastCompletedDate = timestampToDate(habit.lastCompletedDate);
    
    // Only process streak logic if there was a last completion date
    if (lastCompletedDate) {
      // If the habit wasn't completed yesterday, the streak should reset to 0
      // because the streak was maintained up until yesterday
      if (!isSameDay(lastCompletedDate, yesterday) && habit.streak > 0) {
        // If last completed before yesterday, reset streak to 0
        updates.streak = 0;
      }
      // If lastCompletedDate was yesterday, keep the streak as is
      // (the streak remains maintained for the new day)
    } else {
      // No last completed date means habit was never completed
      // If there's a streak value, it's inconsistent, so reset to 0
      if (habit.streak > 0) {
        updates.streak = 0;
      }
    }

    // Update the habit document
    const habitRef = doc(db, "habits", docSnapshot.id);
    updatePromises.push(updateDoc(habitRef, updates) as Promise<void>);
  });

  await Promise.all(updatePromises);
}

/**
 * Update user's lastResetDate in Firestore
 */
export async function updateLastResetDate(userId: string, date: Date): Promise<void> {
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, {
    lastResetDate: Timestamp.fromDate(date),
  });
}

/**
 * Get user's lastResetDate from Firestore
 */
export async function getLastResetDate(userId: string): Promise<Date | null> {
  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    return null;
  }

  const data = userSnap.data();
  const lastResetDate = data.lastResetDate;
  
  if (!lastResetDate) {
    return null;
  }

  return timestampToDate(lastResetDate);
}

/**
 * Main function to check and reset habits if needed
 * Call this when the dashboard loads
 */
export async function checkAndResetHabits(userId: string): Promise<void> {
  const lastResetDate = await getLastResetDate(userId);
  const today = getToday();

  // If no lastResetDate exists, set it to today and don't reset (first time)
  if (!lastResetDate) {
    await updateLastResetDate(userId, today);
    return;
  }

  // If last reset was before today, reset all habits
  if (lastResetDate < today) {
    await resetUserHabits(userId);
    await updateLastResetDate(userId, today);
  }
}

/**
 * Update habit completion and maintain lastCompletedDate
 */
export async function updateHabitCompletion(
  habitId: string,
  completed: boolean,
  streak: number
): Promise<void> {
  const habitRef = doc(db, "habits", habitId);
  const updates: Partial<FirestoreHabit> = {
    completed,
    streak,
  };

  // If marking as completed, update lastCompletedDate to today
  if (completed) {
    updates.lastCompletedDate = Timestamp.fromDate(getToday());
  }

  await updateDoc(habitRef, updates);
}

/**
 * Get the next reset time (midnight of next day)
 */
export function getNextResetTime(): Date {
  const nextReset = new Date();
  nextReset.setDate(nextReset.getDate() + 1);
  nextReset.setHours(0, 0, 0, 0);
  return nextReset;
}

/**
 * Format reset time for display
 */
export function formatResetTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
