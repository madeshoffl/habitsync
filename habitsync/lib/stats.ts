import { db } from "./firebase";
import { collection, query, where, getDocs, doc, getDoc, setDoc, Timestamp, orderBy, limit } from "firebase/firestore";

export type Habit = {
  id: string;
  name: string;
  streak: number;
  completed: boolean;
  userId: string;
  createdAt?: Timestamp;
  lastCompletedDate?: Timestamp;
  [key: string]: any;
};

/**
 * Calculate completion rate percentage from habits
 * @param habits Array of habits
 * @returns Completion rate as percentage (0-100)
 */
export function calculateCompletionRate(habits: Habit[]): number {
  if (habits.length === 0) return 0;
  const completedCount = habits.filter((h) => h.completed).length;
  return Math.round((completedCount / habits.length) * 100);
}

/**
 * Get the best (longest) streak from all habits
 * @param habits Array of habits
 * @returns The highest streak value
 */
export function getBestStreak(habits: Habit[]): number {
  if (habits.length === 0) return 0;
  return Math.max(...habits.map((h) => h.streak || 0), 0);
}

/**
 * Get total number of completions for a user
 * This counts all habits that have been completed at least once (streak > 0 or completed = true)
 * For a more accurate count, we should track total completions separately in Firestore
 * For now, we'll use a combination of current completions and streaks
 * @param userId User ID
 * @param habits Optional array of habits to avoid additional query
 * @returns Total completions count
 */
export async function getTotalCompletions(userId: string, habits?: Habit[]): Promise<number> {
  if (habits) {
    // Simple approximation: count habits with streaks or currently completed
    // This is not perfect but provides a reasonable estimate
    return habits.filter((h) => h.streak > 0 || h.completed).length;
  }

  try {
    const habitsQuery = query(collection(db, "habits"), where("userId", "==", userId));
    const habitsSnapshot = await getDocs(habitsQuery);
    const habitsData = habitsSnapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Habit));
    return habitsData.filter((h) => h.streak > 0 || h.completed).length;
  } catch (error) {
    console.error("Error fetching total completions:", error);
    return 0;
  }
}

/**
 * Get count of habits with active streaks (streak > 0)
 * @param habits Array of habits
 * @returns Number of habits with active streaks
 */
export function getActiveStreaks(habits: Habit[]): number {
  return habits.filter((h) => (h.streak || 0) > 0).length;
}

/**
 * Calculate user level from XP
 * Level formula: floor(XP / 100) + 1 (minimum level 1)
 * @param xp Experience points
 * @returns User level
 */
export function calculateLevel(xp: number): number {
  return Math.max(1, Math.floor((xp || 0) / 100) + 1);
}

/**
 * Get the longest active streak from habits (excluding zero streaks)
 * @param habits Array of habits
 * @returns The longest active streak, or 0 if none
 */
export function getLongestActiveStreak(habits: Habit[]): number {
  const activeStreaks = habits.filter((h) => (h.streak || 0) > 0).map((h) => h.streak || 0);
  if (activeStreaks.length === 0) return 0;
  return Math.max(...activeStreaks);
}

/**
 * Get today's date as YYYY-MM-DD string
 */
function getTodayString(): string {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

/**
 * Record daily completion rate for a user
 * @param userId User ID
 * @param totalHabits Total number of habits
 * @param completedHabits Number of completed habits
 * @param date Optional date string (YYYY-MM-DD), defaults to today
 */
export async function recordDailyCompletionRate(
  userId: string,
  totalHabits: number,
  completedHabits: number,
  date?: string
): Promise<void> {
  try {
    const dateStr = date || getTodayString();
    const completionRate = totalHabits > 0 ? Math.round((completedHabits / totalHabits) * 100) : 0;
    
    const dailyStatRef = doc(db, "dailyStats", `${userId}_${dateStr}`);
    await setDoc(dailyStatRef, {
      userId,
      date: dateStr,
      totalHabits,
      completedHabits,
      completionRate,
      recordedAt: Timestamp.now(),
    }, { merge: true });
  } catch (error) {
    console.error("Error recording daily completion rate:", error);
  }
}

/**
 * Get daily completion rates for the last N days
 * @param userId User ID
 * @param days Number of days to fetch (default: 7)
 * @returns Array of daily stats with date and completionRate
 */
export async function getDailyCompletionRates(userId: string, days: number = 7): Promise<Array<{ date: string; completionRate: number }>> {
  try {
    const results: Array<{ date: string; completionRate: number }> = [];
    const today = new Date();
    
    // Generate dates for the last N days
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Try to fetch the daily stat
      const dailyStatRef = doc(db, "dailyStats", `${userId}_${dateStr}`);
      const dailyStatSnap = await getDoc(dailyStatRef);
      
      if (dailyStatSnap.exists()) {
        const data = dailyStatSnap.data();
        results.push({
          date: dateStr,
          completionRate: data.completionRate || 0,
        });
      } else {
        // No data for this date, use 0
        results.push({
          date: dateStr,
          completionRate: 0,
        });
      }
    }
    
    return results;
  } catch (error) {
    console.error("Error fetching daily completion rates:", error);
    return [];
  }
}

/**
 * Calculate weekly completion rates from last 7 days
 * @param userId User ID
 * @returns Array of completion rates for each day of the week
 */
export async function getWeeklyCompletionRates(userId: string): Promise<number[]> {
  const dailyStats = await getDailyCompletionRates(userId, 7);
  return dailyStats.map((stat) => stat.completionRate);
}

