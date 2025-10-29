"use client";

import { useEffect, useState } from "react";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement } from "chart.js";
import { Line, Pie } from "react-chartjs-2";
import { useAuth } from "../../../context/AuthContext";
import { useRouter } from "next/navigation";
import { db } from "../../../lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { motion } from "framer-motion";
import { TrendingUp, Calendar, Flame, Award } from "lucide-react";
import { calculateLevel, getBestStreak, calculateCompletionRate, getWeeklyCompletionRates, type Habit as StatsHabit } from "../../../lib/stats";

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
  const [weeklyData, setWeeklyData] = useState<number[]>([]);

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
      
      // Fetch real weekly completion rates from Firestore
      const weeklyRates = await getWeeklyCompletionRates(user.uid);
      setWeeklyData(weeklyRates);
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setStatsLoading(false);
    }
  }

  // Calculate statistics using utility functions
  const totalHabits = habits.length;
  const habitsForStats: StatsHabit[] = habits.map(h => ({
    id: h.id,
    name: h.name,
    streak: h.streak,
    completed: h.completed,
    userId: user?.uid || "",
  }));
  
  const bestStreak = getBestStreak(habitsForStats);
  const bestStreakHabit = habits.find(h => h.streak === bestStreak)?.name || "None";
  const completedThisWeek = habits.filter(h => h.completed).length;
  const currentLevel = calculateLevel(xp ?? 0);

  // Calculate category counts
  const categoryCounts = {
    Health: habits.filter(h => h.category === "Health").length,
    Productivity: habits.filter(h => h.category === "Productivity").length,
    Learning: habits.filter(h => h.category === "Learning").length,
    Lifestyle: habits.filter(h => h.category === "Lifestyle").length,
    Other: habits.filter(h => h.category === "Other").length,
  };

  // Calculate today's completion rate using utility function
  const todayCompletionRate = calculateCompletionRate(habitsForStats);

  // Use real weekly data from Firestore, or fallback to today's rate for all days if no data yet
  const weekCompletionData = weeklyData.length === 7 ? weeklyData : Array(7).fill(todayCompletionRate);

  const lineData = {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [{
      label: "Completion %",
      data: weekCompletionData,
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

  function Counter({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
    const [count, setCount] = useState(0);
    
    useEffect(() => {
      const duration = 1000;
      const steps = 30;
      const increment = value / steps;
      let current = 0;
      
      const timer = setInterval(() => {
        current += increment;
        if (current >= value) {
          setCount(value);
          clearInterval(timer);
        } else {
          setCount(Math.floor(current));
        }
      }, duration / steps);
      
      return () => clearInterval(timer);
    }, [value]);
    
    return <span>{prefix}{count}{suffix}</span>;
  }

  const statCards = [
    { label: "Total habits tracked", value: totalHabits, icon: Calendar, gradient: "from-blue-500 to-blue-600" },
    { label: "Best streak", value: bestStreak, icon: Flame, gradient: "from-orange-500 to-orange-600", subtitle: bestStreak > 0 ? bestStreakHabit : undefined },
    { label: "Habits completed this week", value: completedThisWeek, icon: TrendingUp, gradient: "from-green-500 to-green-600" },
    { label: "Current level", value: currentLevel, icon: Award, gradient: "from-purple-500 to-purple-600", subtitle: "(based on XP)" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <h2 className="mb-6 text-3xl font-bold text-gray-900">Your Progress</h2>

      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="group relative overflow-hidden rounded-2xl border border-gray-200/50 bg-gradient-to-br from-white to-gray-50 p-6 shadow-md transition-all hover:shadow-xl"
          >
            <div className={`mb-4 inline-flex rounded-xl bg-gradient-to-r ${stat.gradient} p-3 text-white shadow-lg`}>
              <stat.icon className="h-6 w-6" />
            </div>
            <div className="text-sm font-medium text-gray-600">{stat.label}</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">
              <Counter value={stat.value} suffix={stat.label.includes("streak") ? " days" : ""} />
            </div>
            {stat.subtitle && (
              <div className="mt-2 text-xs text-gray-500">{stat.subtitle}</div>
            )}
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-2xl border border-gray-200/50 bg-white p-6 shadow-md"
        >
          <div className="mb-4 text-base font-bold text-gray-900">Weekly Completion Rate</div>
          <Line data={lineData} options={lineOptions} height={120} />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-2xl border border-gray-200/50 bg-white p-6 shadow-md"
        >
          <div className="mb-4 text-base font-bold text-gray-900">Habits by Category</div>
          <Pie data={pieData} />
        </motion.div>
      </div>
    </motion.div>
  );
}
