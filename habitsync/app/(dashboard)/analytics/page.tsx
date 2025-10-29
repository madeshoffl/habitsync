"use client";

import { useEffect, useState } from "react";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement } from "chart.js";
import { Line, Bar, Pie } from "react-chartjs-2";
import { useAuth } from "../../../context/AuthContext";
import { useRouter } from "next/navigation";
import { db } from "../../../lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { motion } from "framer-motion";
import { TrendingUp, Clock, Target, Activity, Calendar } from "lucide-react";
import { 
  getTimeOfDayAnalysis, 
  getCategoryPerformance, 
  calculateProductivityScore,
  getMonthlyTrends,
  getGoalProgress 
} from "../../../lib/analytics";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement);

type Habit = {
  id: string;
  name: string;
  streak: number;
  completed: boolean;
  category: string;
};

export default function AnalyticsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeOfDayData, setTimeOfDayData] = useState<Array<{ hour: number; count: number }>>([]);
  const [categoryPerformance, setCategoryPerformance] = useState<Array<{ category: string; completed: number; total: number; percentage: number }>>([]);
  const [productivityScore, setProductivityScore] = useState(0);
  const [monthlyTrends, setMonthlyTrends] = useState<Array<{ month: string; completed: number; totalDays: number }>>([]);
  const [dailyGoal, setDailyGoal] = useState<{ goal: number; current: number; percentage: number } | null>(null);
  const [monthlyGoal, setMonthlyGoal] = useState<{ goal: number; current: number; percentage: number } | null>(null);
  const [timeRange, setTimeRange] = useState<"week" | "month">("month");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/");
      return;
    }
    fetchAnalytics();
  }, [user, authLoading, router, timeRange]);

  async function fetchAnalytics() {
    if (!user) return;
    try {
      setLoading(true);
      
      // Fetch habits
      const habitsQuery = query(collection(db, "habits"), where("userId", "==", user.uid));
      const habitsSnapshot = await getDocs(habitsQuery);
      const habitsData: Habit[] = habitsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Habit[];
      setHabits(habitsData);

      // Fetch analytics data
      const days = timeRange === "week" ? 7 : 30;
      
      const [timeData, categoryData, score, trends, daily, monthly] = await Promise.all([
        getTimeOfDayAnalysis(user.uid, days),
        getCategoryPerformance(user.uid, days),
        calculateProductivityScore(user.uid, habitsData.map(h => ({ streak: h.streak, completed: h.completed })), days),
        getMonthlyTrends(user.uid, 6),
        getGoalProgress(user.uid, 'daily'),
        getGoalProgress(user.uid, 'monthly'),
      ]);

      setTimeOfDayData(timeData);
      setCategoryPerformance(categoryData);
      setProductivityScore(score);
      setMonthlyTrends(trends);
      setDailyGoal(daily);
      setMonthlyGoal(monthly);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  }

  // Prepare chart data
  const timeOfDayLabels = Array.from({ length: 24 }, (_, i) => {
    const hour = i % 12 || 12;
    const period = i < 12 ? 'AM' : 'PM';
    return `${hour}${period}`;
  });

  const timeOfDayChartData = {
    labels: timeOfDayLabels,
    datasets: [{
      label: 'Completions',
      data: timeOfDayData.map(d => d.count),
      backgroundColor: 'rgba(59, 130, 246, 0.5)',
      borderColor: 'rgb(59, 130, 246)',
      borderWidth: 2,
    }],
  };

  const categoryChartData = categoryPerformance.length > 0 ? {
    labels: categoryPerformance.map(c => c.category),
    datasets: [{
      data: categoryPerformance.map(c => c.percentage),
      backgroundColor: [
        '#22c55e',
        '#f59e0b',
        '#8b5cf6',
        '#06b6d4',
        '#ef4444',
      ],
      borderColor: '#ffffff',
      borderWidth: 2,
    }],
  } : null;

  const monthlyChartData = monthlyTrends.length > 0 ? {
    labels: monthlyTrends.map(t => t.month),
    datasets: [{
      label: 'Completions',
      data: monthlyTrends.map(t => t.completed),
      backgroundColor: 'rgba(139, 92, 246, 0.5)',
      borderColor: 'rgb(139, 92, 246)',
      borderWidth: 2,
    }],
  } : null;

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: true,
      },
      tooltip: {
        enabled: true,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  } as const;

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading analytics...</div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setTimeRange("week")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              timeRange === "week"
                ? "bg-blue-600 text-white shadow-md"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setTimeRange("month")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              timeRange === "month"
                ? "bg-blue-600 text-white shadow-md"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Month
          </button>
        </div>
      </div>

      {/* Productivity Score */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mb-6 rounded-2xl border border-gray-200/50 bg-gradient-to-br from-purple-500 to-blue-600 p-6 text-white shadow-lg"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Activity className="h-6 w-6" />
              <h3 className="text-lg font-semibold">Productivity Score</h3>
            </div>
            <p className="text-sm opacity-90">Based on consistency, completion rate, and streaks</p>
          </div>
          <div className="text-right">
            <div className="text-5xl font-bold">{productivityScore}</div>
            <div className="text-sm opacity-80">out of 100</div>
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/20">
          <motion.div
            className="h-full bg-white"
            initial={{ width: 0 }}
            animate={{ width: `${productivityScore}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>
      </motion.div>

      {/* Goal Progress */}
      {(dailyGoal || monthlyGoal) && (
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {dailyGoal && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="rounded-2xl border border-gray-200/50 bg-white p-6 shadow-md"
            >
              <div className="mb-4 flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Daily Goal</h3>
              </div>
              <div className="mb-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-gray-900">{dailyGoal.current}</span>
                <span className="text-gray-600">/ {dailyGoal.goal} habits</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${dailyGoal.percentage}%` }}
                  transition={{ duration: 0.8 }}
                />
              </div>
              <div className="mt-2 text-sm text-gray-600">{dailyGoal.percentage}% complete</div>
            </motion.div>
          )}

          {monthlyGoal && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="rounded-2xl border border-gray-200/50 bg-white p-6 shadow-md"
            >
              <div className="mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-purple-600" />
                <h3 className="text-lg font-semibold text-gray-900">Monthly Goal</h3>
              </div>
              <div className="mb-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-gray-900">{monthlyGoal.current}</span>
                <span className="text-gray-600">/ {monthlyGoal.goal} completions</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                <motion.div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${monthlyGoal.percentage}%` }}
                  transition={{ duration: 0.8 }}
                />
              </div>
              <div className="mt-2 text-sm text-gray-600">{monthlyGoal.percentage}% complete</div>
            </motion.div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Time of Day Analysis */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-gray-200/50 bg-white p-6 shadow-md"
        >
          <div className="mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Time of Day Analysis</h3>
          </div>
          <p className="mb-4 text-sm text-gray-600">When do you complete most habits?</p>
          {timeOfDayData.length > 0 ? (
            <Bar data={timeOfDayChartData} options={chartOptions} height={200} />
          ) : (
            <div className="flex h-48 items-center justify-center text-gray-500">
              No data available yet
            </div>
          )}
        </motion.div>

        {/* Category Performance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl border border-gray-200/50 bg-white p-6 shadow-md"
        >
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">Category Performance</h3>
          </div>
          <p className="mb-4 text-sm text-gray-600">Completion rate by category</p>
          {categoryChartData ? (
            <Pie data={categoryChartData} options={chartOptions} height={200} />
          ) : (
            <div className="flex h-48 items-center justify-center text-gray-500">
              No data available yet
            </div>
          )}
        </motion.div>
      </div>

      {/* Monthly Trends */}
      {monthlyChartData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-6 rounded-2xl border border-gray-200/50 bg-white p-6 shadow-md"
        >
          <div className="mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">Monthly Completion Trends</h3>
          </div>
          <p className="mb-4 text-sm text-gray-600">Your completion trends over the last 6 months</p>
          <Line data={monthlyChartData} options={chartOptions} height={100} />
        </motion.div>
      )}
    </motion.div>
  );
}
