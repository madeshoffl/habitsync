"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../context/AuthContext";
import { db } from "../../../lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { motion } from "framer-motion";
import { 
  Calendar, Trophy, Activity, TrendingUp, Award, 
  Bell, Settings, Download, Trash2, LogOut, 
  Flame, CheckCircle
} from "lucide-react";
import { calculateLevel, getBestStreak, getActiveStreaks, getTotalCompletions, type Habit as StatsHabit } from "../../../lib/stats";

type Habit = {
  streak: number;
  completed: boolean;
};

export default function SettingsPage() {
  const { user, loading: authLoading, logout, xp } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    totalHabits: 0,
    totalCompletions: 0,
    activeStreaks: 0,
    bestStreak: 0,
    bestStreakHabit: "",
    daysActive: 0,
    successRate: 0,
  });
  const [memberSince, setMemberSince] = useState("");
  const [achievements, setAchievements] = useState<Record<string, { earned: boolean; date?: string }>>({});
  const [notifications, setNotifications] = useState(false);

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
      const habitsQuery = query(collection(db, "habits"), where("userId", "==", user.uid));
      const habitsSnapshot = await getDocs(habitsQuery);
      const habits = habitsSnapshot.docs.map(d => ({ ...d.data(), name: d.data().name, id: d.id } as Habit & { name: string; id: string }));
      
      // Convert to StatsHabit format for utility functions
      const habitsForStats: StatsHabit[] = habits.map(h => ({
        id: h.id,
        name: h.name,
        streak: h.streak || 0,
        completed: h.completed || false,
        userId: user.uid,
      }));
      
      const totalHabits = habits.length;
      const totalCompletions = await getTotalCompletions(user.uid, habitsForStats);
      const activeStreaks = getActiveStreaks(habitsForStats);
      const bestStreak = getBestStreak(habitsForStats);
      const bestStreakHabit = habits.find(h => h.streak === bestStreak)?.name || "";
      
      const userDoc = await getDoc(doc(db, "users", user.uid));
      let daysActive = 0;
      if (userDoc.exists()) {
        const createdAt = userDoc.data().createdAt?.toDate();
        if (createdAt) {
          daysActive = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
          setMemberSince(createdAt.toLocaleDateString("en-US", { year: "numeric", month: "long" }));
        }
      }
      
      const successRate = totalHabits > 0 ? Math.round((totalCompletions / totalHabits) * 100) : 0;
      
      setStats({
        totalHabits,
        totalCompletions,
        activeStreaks,
        bestStreak,
        bestStreakHabit,
        daysActive,
        successRate,
      });

      // Check achievements using utility functions
      const currentLevel = calculateLevel(xp ?? 0);
      setAchievements({
        firstSteps: { earned: totalHabits >= 1 },
        weekWarrior: { earned: bestStreak >= 7 },
        habitHero: { earned: totalHabits >= 10 },
        centurion: { earned: totalCompletions >= 100 },
        levelFive: { earned: currentLevel >= 5 },
        perfectWeek: { earned: false }, // TODO: Implement perfect week check
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  }

  if (authLoading) return <div className="text-center p-8">Loading...</div>;

  const currentLevel = calculateLevel(xp ?? 0);
  const xpInLevel = (xp ?? 0) % 100;
  const progressPercent = xpInLevel;

  const statCards = [
    { label: "Total Habits", value: stats.totalHabits, icon: Activity, color: "from-blue-500 to-blue-600" },
    { label: "Completions", value: stats.totalCompletions, icon: CheckCircle, color: "from-green-500 to-green-600" },
    { label: "Active Streaks", value: stats.activeStreaks, icon: TrendingUp, color: "from-purple-500 to-purple-600" },
    { label: "Best Streak", value: `${stats.bestStreak} days`, icon: Flame, color: "from-orange-500 to-orange-600", subtitle: stats.bestStreakHabit },
    { label: "Days Active", value: stats.daysActive, icon: Calendar, color: "from-pink-500 to-pink-600" },
    { label: "Success Rate", value: `${stats.successRate}%`, icon: Award, color: "from-teal-500 to-teal-600" },
  ];

  const achievementList = [
    { id: "firstSteps", emoji: "🎯", title: "First Steps", desc: "Created your first habit" },
    { id: "weekWarrior", emoji: "🔥", title: "Week Warrior", desc: "Achieved a 7-day streak" },
    { id: "habitHero", emoji: "💪", title: "Habit Hero", desc: "Created 10 habits" },
    { id: "centurion", emoji: "💯", title: "Centurion", desc: "100 total completions" },
    { id: "levelFive", emoji: "⭐", title: "Level 5", desc: "Reached level 5" },
    { id: "perfectWeek", emoji: "🏆", title: "Perfect Week", desc: " Lines completed for 7 days" },
  ];

  async function exportData() {
    if (!user) return;
    try {
      const habitsQuery = query(collection(db, "habits"), where("userId", "==", user.uid));
      const habitsSnapshot = await getDocs(habitsQuery);
      const habits = habitsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
      const data = { habits, stats, exportedAt: new Date().toISOString() };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `habitsync-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting data:", error);
    }
  }

  async function clearCompleted() {
    if (!confirm("Are you sure you want to clear all completed habits? This cannot be undone.")) return;
    if (!user) return;
    
    try {
      const habitsQuery = query(collection(db, "habits"), where("userId", "==", user.uid));
      const habitsSnapshot = await getDocs(habitsQuery);
      const promises = habitsSnapshot.docs
        .filter(d => d.data().completed)
        .map(d => deleteDoc(doc(db, "habits", d.id)));
      await Promise.all(promises);
    } catch (error) {
      console.error("Error clearing completed:", error);
    }
  }

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-8 text-white shadow-2xl"
      >
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          <div className="relative">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt="Profile"
                className="h-24 w-24 rounded-full border-4 border-white/50 shadow-xl object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white/50 bg-white/20 text-4xl font-bold backdrop-blur">
                {user?.displayName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-3xl font-bold">{user?.displayName || "User"}</h2>
            <p className="mt-1 text-white/90">{user?.email}</p>
            {memberSince && (
              <div className="mt-2 flex items-center justify-center gap-2 text-sm text-white/80 sm:justify-start">
                <Calendar size={16} />
                <span>Member since {memberSince}</span>
              </div>
            )}
          </div>
          <div className="rounded-xl bg-white/20 backdrop-blur p-6 text-center">
            <div className="text-3xl font-bold">Level {currentLevel}</div>
            <div className="mt-1 text-sm text-white/80">{xp ?? 0} XP</div>
          </div>
        </div>
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span>Progress to Level {currentLevel + 1}</span>
            <span>{xpInLevel}/100</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/20">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1 }}
              className="h-full bg-white rounded-full"
            />
          </div>
        </div>
      </motion.div>

      {/* Statistics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h3 className="mb-4 flex items-center gap-2 text-xl font-semibold text-gray-900">
          <Activity size={24} />
          Your Statistics
        </h3>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {statCards.map((stat) => (
            <div
              key={stat.label}
              className="group rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:shadow-md"
            >
              <div className={`mb-3 inline-flex rounded-lg bg-gradient-to-r ${stat.color} p-3 text-white`}>
                <stat.icon size={24} />
              </div>
              <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
              <div className="text-sm text-gray-600">{stat.label}</div>
              {stat.subtitle && <div className="mt-1 text-xs text-gray-500">({stat.subtitle})</div>}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Achievements */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h3 className="mb-4 flex items-center gap-2 text-xl font-semibold text-gray-900">
          <Trophy size={24} />
          Achievements
        </h3>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {achievementList.map((achievement) => {
            const status = achievements[achievement.id];
            const earned = status?.earned ?? false;
            return (
              <div
                key={achievement.id}
                className={`rounded-xl border-2 p-4 transition-all ${
                  earned
                    ? "border-green-400 bg-gradient-to-br from-green-50 to-emerald-50 shadow-md"
                    : "border-gray-200 bg-gray-50 opacity-60"
                }`}
              >
                <div className="mb-2 text-4xl">{achievement.emoji}</div>
                <div className={`font-semibold ${earned ? "text-gray-900" : "text-gray-400"}`}>
                  {achievement.title}
                </div>
                <div className={`text-sm ${earned ? "text-gray-600" : "text-gray-400"}`}>
                  {achievement.desc}
                </div>
                {earned ? (
                  <div className="mt-2 text-xs font-medium text-green-600">✓ Earned</div>
                ) : (
                  <div className="mt-2 text-xs text-gray-400">🔒 Locked</div>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Preferences */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <h3 className="mb-4 flex items-center gap-2 text-xl font-semibold text-gray-900">
          <Settings size={24} />
          Preferences
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell size={20} className="text-gray-600" />
              <div>
                <div className="font-medium text-gray-900">Email Notifications</div>
                <div className="text-sm text-gray-600">Daily progress updates</div>
              </div>
            </div>
            <button
              onClick={() => setNotifications(!notifications)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                notifications ? "bg-blue-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                  notifications ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Data & Privacy */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-xl border border-blue-200 bg-blue-50 p-6"
      >
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-blue-900">
          <Download size={20} />
          Data & Privacy
        </h3>
        <div className="space-y-3">
          <button
            onClick={exportData}
            className="flex w-full items-center gap-3 rounded-lg border border-blue-300 bg-white px-4 py-3 text-left transition-colors hover:bg-blue-50"
          >
            <Download size={18} className="text-blue-600" />
            <span className="font-medium text-gray-900">Export My Data</span>
          </button>
          <button
            onClick={clearCompleted}
            className="flex w-full items-center gap-3 rounded-lg border border-orange-300 bg-white px-4 py-3 text-left transition-colors hover:bg-orange-50"
          >
            <Trash2 size={18} className="text-orange-600" />
            <span className="font-medium text-gray-900">Clear All Completed Habits</span>
          </button>
        </div>
      </motion.div>

      {/* Danger Zone */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="rounded-xl border border-red-200 bg-red-50 p-6"
      >
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-red-900">
          <Trash2 size={20} />
          Danger Zone
        </h3>
        <div className="space-y-3">
          <button
            onClick={() => alert("Reset functionality coming soon!")}
            className="w-full rounded-lg border-2 border-red-300 bg-white px-4 py-3 font-medium text-red-700 transition-colors hover:bg-red-50"
          >
            Reset All Progress
          </button>
          <button
            onClick={async () => {
              await logout();
              router.replace("/");
            }}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-red-700"
          >
            <LogOut size={20} />
            Log Out
          </button>
        </div>
      </motion.div>
    </div>
  );
}
