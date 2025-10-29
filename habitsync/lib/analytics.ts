import { db } from "./firebase";
import { collection, query, where, getDocs, doc, getDoc, setDoc, Timestamp, orderBy, limit, addDoc } from "firebase/firestore";

/**
 * Record a habit completion with timestamp and optional note
 */
export async function recordHabitCompletion(
  userId: string,
  habitId: string,
  habitName: string,
  category: string,
  note?: string
): Promise<void> {
  try {
    const now = new Date();
    await addDoc(collection(db, "habitCompletions"), {
      userId,
      habitId,
      habitName,
      category,
      completedAt: Timestamp.fromDate(now),
      hour: now.getHours(),
      date: now.toISOString().split('T')[0],
      note: note || null,
    });
  } catch (error) {
    console.error("Error recording habit completion:", error);
  }
}

/**
 * Get time-of-day distribution for habit completions
 */
export async function getTimeOfDayAnalysis(
  userId: string,
  days: number = 30
): Promise<Array<{ hour: number; count: number }>> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const completionsQuery = query(
      collection(db, "habitCompletions"),
      where("userId", "==", userId),
      where("completedAt", ">=", Timestamp.fromDate(cutoffDate)),
      orderBy("completedAt")
    );
    
    const snapshot = await getDocs(completionsQuery);
    const hourCounts: { [key: number]: number } = {};
    
    // Initialize all hours to 0
    for (let i = 0; i < 24; i++) {
      hourCounts[i] = 0;
    }
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      const hour = data.hour ?? new Date(data.completedAt.toDate()).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    
    return Object.entries(hourCounts).map(([hour, count]) => ({
      hour: parseInt(hour),
      count: count as number,
    }));
  } catch (error) {
    console.error("Error getting time-of-day analysis:", error);
    return [];
  }
}

/**
 * Get category performance breakdown
 */
export async function getCategoryPerformance(
  userId: string,
  days: number = 30
): Promise<Array<{ category: string; completed: number; total: number; percentage: number }>> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    // Get all completions in the period
    const completionsQuery = query(
      collection(db, "habitCompletions"),
      where("userId", "==", userId),
      where("completedAt", ">=", Timestamp.fromDate(cutoffDate))
    );
    
    const snapshot = await getDocs(completionsQuery);
    const categoryStats: { [key: string]: { completed: number; habits: Set<string> } } = {};
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      const category = data.category || "Other";
      
      if (!categoryStats[category]) {
        categoryStats[category] = { completed: 0, habits: new Set() };
      }
      
      categoryStats[category].completed++;
      categoryStats[category].habits.add(data.habitId);
    });
    
    // Get total habits per category
    const habitsQuery = query(collection(db, "habits"), where("userId", "==", userId));
    const habitsSnapshot = await getDocs(habitsQuery);
    const totalByCategory: { [key: string]: number } = {};
    
    habitsSnapshot.forEach((doc) => {
      const data = doc.data();
      const category = data.category || "Other";
      totalByCategory[category] = (totalByCategory[category] || 0) + 1;
    });
    
    // Calculate percentages
    return Object.entries(categoryStats).map(([category, stats]) => {
      const totalHabits = totalByCategory[category] || 0;
      const expectedCompletions = totalHabits * days; // Ideal: complete all habits every day
      const percentage = expectedCompletions > 0 
        ? Math.round((stats.completed / expectedCompletions) * 100) 
        : 0;
      
      return {
        category,
        completed: stats.completed,
        total: expectedCompletions,
        percentage: Math.min(100, percentage), // Cap at 100%
      };
    });
  } catch (error) {
    console.error("Error getting category performance:", error);
    return [];
  }
}

/**
 * Calculate productivity score based on consistency
 * Algorithm: 
 * - Consistency weight: 40% (how regular are completions)
 * - Completion rate: 30% (percentage of habits completed)
 * - Streak strength: 20% (average streak / max streak)
 * - Time distribution: 10% (balance of completion times)
 */
export async function calculateProductivityScore(
  userId: string,
  habits: Array<{ streak: number; completed: boolean }>,
  days: number = 30
): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    // Get completions for the period
    const completionsQuery = query(
      collection(db, "habitCompletions"),
      where("userId", "==", userId),
      where("completedAt", ">=", Timestamp.fromDate(cutoffDate))
    );
    
    const snapshot = await getDocs(completionsQuery);
    const completionsByDate: { [key: string]: number } = {};
    const totalCompletions = snapshot.size;
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      const date = data.date || data.completedAt.toDate().toISOString().split('T')[0];
      completionsByDate[date] = (completionsByDate[date] || 0) + 1;
    });
    
    // Calculate consistency score
    const uniqueDays = Object.keys(completionsByDate).length;
    const consistencyScore = Math.min(100, (uniqueDays / days) * 100);
    
    // Completion rate (30%)
    const totalHabits = habits.length;
    const avgDailyCompletions = totalCompletions / days;
    const completionRateScore = totalHabits > 0 
      ? Math.min(100, (avgDailyCompletions / totalHabits) * 100)
      : 0;
    
    // Streak strength (20%)
    const maxStreak = Math.max(...habits.map(h => h.streak), 0);
    const avgStreak = habits.length > 0 
      ? habits.reduce((sum, h) => sum + h.streak, 0) / habits.length 
      : 0;
    const streakScore = maxStreak > 0 ? Math.min(100, (avgStreak / maxStreak) * 100) : 0;
    
    // Time distribution (10%) - balanced distribution is better
    const timeData = await getTimeOfDayAnalysis(userId, days);
    const timeVariance = calculateVariance(timeData.map(d => d.count));
    const timeScore = Math.max(0, 100 - (timeVariance / 10)); // Lower variance = higher score
    
    // Weighted average
    const productivityScore = Math.round(
      consistencyScore * 0.40 +
      completionRateScore * 0.30 +
      streakScore * 0.20 +
      timeScore * 0.10
    );
    
    return Math.min(100, Math.max(0, productivityScore));
  } catch (error) {
    console.error("Error calculating productivity score:", error);
    return 0;
  }
}

/**
 * Calculate variance of an array
 */
function calculateVariance(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  return squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Get monthly completion trends
 */
export async function getMonthlyTrends(userId: string, months: number = 6): Promise<Array<{ month: string; completed: number; totalDays: number }>> {
  try {
    const results: Array<{ month: string; completed: number; totalDays: number }> = [];
    const today = new Date();
    
    for (let i = months - 1; i >= 0; i--) {
      const monthStart = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() - i + 1, 0);
      monthEnd.setHours(23, 59, 59, 999);
      
      const completionsQuery = query(
        collection(db, "habitCompletions"),
        where("userId", "==", userId),
        where("completedAt", ">=", Timestamp.fromDate(monthStart)),
        where("completedAt", "<=", Timestamp.fromDate(monthEnd))
      );
      
      const snapshot = await getDocs(completionsQuery);
      const monthName = monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      results.push({
        month: monthName,
        completed: snapshot.size,
        totalDays: monthEnd.getDate(),
      });
    }
    
    return results;
  } catch (error) {
    console.error("Error getting monthly trends:", error);
    return [];
  }
}

/**
 * Get goal progress (if goals are set)
 */
export async function getGoalProgress(userId: string, goalType: 'daily' | 'monthly'): Promise<{ goal: number; current: number; percentage: number } | null> {
  try {
    // Check if user has goals set in Firestore
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) return null;
    
    const userData = userSnap.data();
    const goalKey = goalType === 'daily' ? 'dailyGoal' : 'monthlyGoal';
    const goal = userData[goalKey];
    
    if (!goal || goal <= 0) return null;
    
    const today = new Date();
    
    if (goalType === 'daily') {
      const todayStart = new Date(today);
      todayStart.setHours(0, 0, 0, 0);
      
      const completionsQuery = query(
        collection(db, "habitCompletions"),
        where("userId", "==", userId),
        where("completedAt", ">=", Timestamp.fromDate(todayStart))
      );
      
      const snapshot = await getDocs(completionsQuery);
      const current = snapshot.size;
      const percentage = Math.round((current / goal) * 100);
      
      return { goal, current: Math.min(current, goal), percentage: Math.min(100, percentage) };
    } else {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      
      const completionsQuery = query(
        collection(db, "habitCompletions"),
        where("userId", "==", userId),
        where("completedAt", ">=", Timestamp.fromDate(monthStart))
      );
      
      const snapshot = await getDocs(completionsQuery);
      const current = snapshot.size;
      const percentage = Math.round((current / goal) * 100);
      
      return { goal, current, percentage: Math.min(100, percentage) };
    }
  } catch (error) {
    console.error("Error getting goal progress:", error);
    return null;
  }
}

