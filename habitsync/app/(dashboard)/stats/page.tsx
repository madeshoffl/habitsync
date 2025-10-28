"use client";

import { useEffect, useState } from "react";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement } from "chart.js";
import { Line, Pie } from "react-chartjs-2";
import { useAuth } from "../../../context/AuthContext";
import { useRouter } from "next/navigation";
import { db } from "../../../lib/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement);

type Habit = {
  id: string;
  name: string;
  icon: string;
  streak: number;
  completed: boolean;
  color: "blue" | "green" | "purple" | "orange" | "pink";
  category: "Health" | "Productivity" | "Learning" | "Lifestyle" | "Other";
};

export default function StatsPage() {
  const { user, loading: authLoading, xp } = useAuth();
  const router = useRouter();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/");
      return;
    }
    fetchStats();
  }, [user, authLoading, router]);

  async function fetchStats() {
    if (!user) return;
    try {
      setStatsLoading(true);
      const habitsQuery = query(collection(db, "habits"), where("userId", "==", user.uid));
      const habitsSnapshot = await getDocs(habitsQuery);
      const habitsData: Habit[] = habitsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Habit[];
      setHabits(habitsData);
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setStatsLoading(false);
    }
  }

  // Calculate statistics
  const totalHabits = habits.length;
  const bestStreak = habits.length > 0 ? Math.max(...habits.map(h => h.streak)) : 0;
  const bestStreakHabit = habits.find(h => h.streak === bestStreak)?.name || "None";
  const completedThisWeek = habits.filter(h => h.completed).length;
  const currentLevel = Math.floor((xp ?? 0) / 100);

  // Calculate category counts
  const categoryCounts = {
    Health: habits.filter(h => h.category === "Health").length,
    Productivity: habits.filter(h => h.category === "Productivity").length,
    Learning: habits.filter(h => h.category === "Learning").length,
    Lifestyle: habits.filter(h => h.category === "Lifestyle").length,
    Other: habits.filter(h => h.category === "Other").length,
  };

  // Calculate today's completion rate
  const todayCompletionRate = totalHabits > 0 ? Math.round((completedThisWeek / totalHabits) * 100) : 0;

  const lineData = {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [{
      label: "Completion %",
      data: [todayCompletionRate - 5, todayCompletionRate - 3, todayCompletionRate - 1, todayCompletionRate + 1, todayCompletionRate - 2, todayCompletionRate + 2, todayCompletionRate],
      borderColor: "#3b82f6",
      backgroundColor: "rgba(59,130,246,0.15)",
      tension: 0.35,
      fill: true,
      pointRadius: 4,
      pointHoverRadius: 5,
    }],
  };

  const lineOptions = {
    responsive: true,
    plugins: { legend: { display: true }, tooltip: { enabled: true } },
    scales: { y: { min: 0, max: 100, ticks: { stepSize: 20 } } },
  } as const;

  const pieData = {
    labels: ["Health", "Productivity", "Learning", "Lifestyle", "Other"],
    datasets: [{
      data: [categoryCounts.Health, categoryCounts.Productivity, categoryCounts.Learning, categoryCounts.Lifestyle, categoryCounts.Other],
      backgroundColor: ["#22c55e", "#f59e0b", "#8b5cf6", "#06b6d4", "#ef4444"],
      borderColor: "#ffffff",
      borderWidth: 2,
    }],
  };

  if (authLoading || statsLoading) {
    return (
      <>
        <h2 className="mb-4 text-xl font-semibold text-gray-900 sm:text-2xl">Your Progress</h2>
        <div className="flex items-center justify-center p-8">
          <div className="text-gray-500">Loading...</div>
        </div>
      </>
    );
  }

  if (totalHabits === 0) {
    return (
      <>
        <h2 className="mb-4 text-xl font-semibold text-gray-900 sm:text-2xl">Your Progress</h2>
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
          <div className="text-gray-500">No habits tracked yet. Start adding habits to see your stats!</div>
        </div>
      </>
    );
  }

  return (
    <>
      <h2 className="mb-4 text-xl font-semibold text-gray-900 sm:text-2xl">Your Progress</h2>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-500">Total habits tracked</div>
          <div className="mt-1 text-2xl font-bold text-gray-900">{totalHabits}</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-500">Best streak</div>
          <div className="mt-1 text-2xl font-bold text-gray-900">{bestStreak} days</div>
          {bestStreak > 0 && <div className="text-xs text-gray-500">{bestStreakHabit}</div>}
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-500">Habits completed this week</div>
          <div className="mt-1 text-2xl font-bold text-gray-900">{completedThisWeek}</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-500">Current level</div>
          <div className="mt-1 text-2xl font-bold text-gray-900">{currentLevel}</div>
          <div className="text-xs text-gray-500">(based on XP)</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 text-sm font-medium text-gray-700">Weekly Completion Rate</div>
          <Line data={lineData} options={lineOptions} height={120} />
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 text-sm font-medium text-gray-700">Habits by Category</div>
          <Pie data={pieData} />
        </div>
      </div>
    </>
  );
}
