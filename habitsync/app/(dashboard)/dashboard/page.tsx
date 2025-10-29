"use client";

import { useEffect, useMemo, useState } from "react";
import AddHabitModal from "../../../components/AddHabitModal";
import HabitGarden from "../../../components/HabitGarden";
import { useAuth } from "../../../context/AuthContext";
import { useRouter } from "next/navigation";
import { db } from "../../../lib/firebase";
import { collection, addDoc, onSnapshot, orderBy, query, where, serverTimestamp, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { Pencil, Trash2, Plus, CheckCircle2, Clock, Search, Filter, ArrowUpDown } from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion";
import { checkAndResetHabits, updateHabitCompletion, getNextResetTime, formatResetTime } from "../../../utils/habitReset";
import { getLongestActiveStreak, recordDailyCompletionRate } from "../../../lib/stats";
import { recordHabitCompletion } from "../../../lib/analytics";
import { addHabitNote } from "../../../lib/notes";
import HabitNoteModal from "../../../components/HabitNoteModal";
import { HabitCardSkeleton, GardenSkeleton, LoadingSpinner } from "../../../components/LoadingSkeleton";
import { ErrorMessage } from "../../../components/ErrorMessage";
import { EmptyState } from "../../../components/EmptyState";
import { Tooltip } from "../../../components/Tooltip";
import { Pagination } from "../../../components/Pagination";
import { usePagination } from "../../../hooks/usePagination";
import { useOnlineStatus } from "../../../hooks/useOnlineStatus";
import { toast } from "react-hot-toast";

type Habit = {
  id: number;
  name: string;
  icon: string;
  streak: number;
  completed: boolean;
  color: "blue" | "green" | "purple" | "orange" | "pink";
  category: "Health" | "Productivity" | "Learning" | "Lifestyle" | "Other";
};

export default function DashboardPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [habitToEdit, setHabitToEdit] = useState<Habit | null>(null);
  const { user, loading, xp, setXp } = useAuth();
  const router = useRouter();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [nextResetTime, setNextResetTime] = useState<string>("");
  const [filter, setFilter] = useState<"All" | "Completed" | "Pending">("All");
  const [sortBy, setSortBy] = useState<"streak" | "name" | "category">("streak");
  const [searchQuery, setSearchQuery] = useState("");
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [habitForNote, setHabitForNote] = useState<Habit | null>(null);
  const [habitsLoading, setHabitsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const isOnline = useOnlineStatus();

  // Check and reset habits on mount and when user changes
  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/");
      return;
    }

    setHabitsLoading(true);
    setError(null);

    try {
      // Check if habits need to be reset
      checkAndResetHabits(user.uid);

      // Set next reset time for display
      const resetTime = getNextResetTime();
      setNextResetTime(formatResetTime(resetTime));

      const q = query(collection(db, "habits"), where("userId", "==", user.uid), orderBy("createdAt", "desc"));
      const unsub = onSnapshot(
        q,
        async (snap) => {
          try {
            const next: Habit[] = snap.docs.map((d) => {
              const data = d.data() as any;
              return {
                id: d.id as unknown as number,
                name: data.name,
                icon: data.icon,
                streak: Number(data.streak ?? 0),
                completed: Boolean(data.completed ?? false),
                color: data.color,
                category: data.category,
              } as Habit;
            });
            setHabits(next);
            setError(null);
            
            // Record daily completion rate
            const completedCount = next.filter(h => h.completed).length;
            await recordDailyCompletionRate(user.uid, next.length, completedCount);
          } catch (err) {
            const error = err as Error;
            console.error("Error processing habits:", error);
            setError(error);
          } finally {
            setHabitsLoading(false);
          }
        },
        (err) => {
          const error = err as Error;
          console.error("Firestore error:", error);
          setError(error);
          setHabitsLoading(false);
        }
      );
      return () => unsub();
    } catch (err) {
      const error = err as Error;
      setError(error);
      setHabitsLoading(false);
    }
  }, [user, loading, router]);

  // Calculate longest active streak using utility function
  const longestStreak = useMemo(() => {
    const habitsWithStreak = habits.map(h => ({ id: String(h.id), streak: h.streak, completed: h.completed, userId: user?.uid || "", name: h.name }));
    return getLongestActiveStreak(habitsWithStreak);
  }, [habits, user]);

  async function toggleHabitCompleted(habitId: number) {
    if (!user) return;
    const h = habits.find((x) => x.id === habitId);
    if (!h) return;
    const newCompleted = !h.completed;
    
    // Update streak: if completing the habit, increment by 1
    // If uncompleting, decrement by 1 (but not below 0)
    const newStreak = newCompleted ? h.streak + 1 : Math.max(0, h.streak - 1);
    
    // Update local state
    const updatedHabits = habits.map((x) => x.id === h.id ? { ...x, completed: newCompleted, streak: newStreak } : x);
    setHabits(updatedHabits);
    
    await setXp(Math.max(0, (xp ?? 0) + (newCompleted ? 10 : -10)));
    
    // Use the utility function that handles lastCompletedDate
    await updateHabitCompletion(String(h.id), newCompleted, newStreak);
    
    // If completing, record completion with analytics and show note modal
    if (newCompleted) {
      await recordHabitCompletion(user.uid, String(h.id), h.name, h.category);
      // Show note modal for reflection
      setHabitForNote(h);
      setNoteModalOpen(true);
    }
    
    // Record daily completion rate after update
    if (user) {
      const completedCount = updatedHabits.filter(h => h.completed).length;
      await recordDailyCompletionRate(user.uid, updatedHabits.length, completedCount);
    }
  }

  async function handleSaveNote(note: string) {
    if (!user || !habitForNote) return;
    await addHabitNote(user.uid, String(habitForNote.id), habitForNote.name, note);
    setHabitForNote(null);
  }

  async function handleCreateHabit(payload: { name: string; category: Habit["category"]; icon: string; color: Habit["color"]; }) {
    if (!user || !isOnline) {
      toast.error("Please check your internet connection");
      return;
    }
    
    try {
      await addDoc(collection(db, "habits"), {
        userId: user.uid,
        name: payload.name || "New Habit",
        icon: payload.icon,
        color: payload.color,
        category: payload.category,
        streak: 0,
        completed: false,
        createdAt: serverTimestamp(),
      });
      toast.success("Habit created successfully!");
    } catch (err) {
      const error = err as Error;
      console.error("Error creating habit:", error);
      toast.error("Failed to create habit. Please try again.");
      throw error;
    }
  }

  async function handleUpdateHabit(habitId: number | string, payload: { name: string; category: Habit["category"]; icon: string; color: Habit["color"]; }) {
    if (!isOnline) {
      toast.error("Please check your internet connection");
      return;
    }
    
    try {
      const ref = doc(db, "habits", String(habitId));
      await updateDoc(ref, {
        name: payload.name,
        icon: payload.icon,
        color: payload.color,
        category: payload.category,
      });
      toast.success("Habit updated successfully!");
    } catch (err) {
      const error = err as Error;
      console.error("Error updating habit:", error);
      toast.error("Failed to update habit. Please try again.");
      throw error;
    }
  }

  async function handleDeleteHabit(habitId: number) {
    if (!isOnline) {
      toast.error("Please check your internet connection");
      return;
    }
    
    if (!confirm("Are you sure you want to delete this habit?")) return;
    
    setActionLoading(`delete-${habitId}`);
    try {
      const ref = doc(db, "habits", String(habitId));
      await deleteDoc(ref);
      toast.success("Habit deleted successfully!");
    } catch (err) {
      const error = err as Error;
      console.error("Error deleting habit:", error);
      toast.error("Failed to delete habit. Please try again.");
    } finally {
      setActionLoading(null);
    }
  }

  function handleEditClick(habit: Habit) {
    setHabitToEdit(habit);
    setEditMode(true);
    setModalOpen(true);
  }

  function handleAddClick() {
    setHabitToEdit(null);
    setEditMode(false);
    setModalOpen(true);
  }

  const colorGradients = {
    blue: "from-blue-500 to-blue-600",
    green: "from-green-500 to-green-600",
    purple: "from-purple-500 to-purple-600",
    orange: "from-orange-500 to-orange-600",
    pink: "from-pink-500 to-pink-600",
  };

  // Filter and sort habits
  const filteredAndSortedHabits = useMemo(() => {
    let filtered = habits;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(h => 
        h.name.toLowerCase().includes(query) || 
        h.category.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (filter === "Completed") {
      filtered = filtered.filter(h => h.completed);
    } else if (filter === "Pending") {
      filtered = filtered.filter(h => !h.completed);
    }

    // Apply sort
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "streak":
          return b.streak - a.streak;
        case "name":
          return a.name.localeCompare(b.name);
        case "category":
          return a.category.localeCompare(b.category);
        default:
          return 0;
      }
    });

    return sorted;
  }, [habits, filter, sortBy, searchQuery]);

  // Pagination
  const pagination = usePagination({
    items: filteredAndSortedHabits,
    itemsPerPage: 12,
  });

    return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {habitsLoading ? <GardenSkeleton /> : <HabitGarden />}
      
      {error && (
        <ErrorMessage 
          error={error} 
          onRetry={() => {
            setError(null);
            // Trigger re-fetch by updating user dependency
          }}
          className="mb-6"
        />
      )}

      <div className="mb-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Today's Habits</h2>
            {nextResetTime && (
              <div className="mt-1 flex items-center gap-1.5 text-sm text-gray-600">
                <Clock className="h-4 w-4" aria-hidden="true" />
                <span>Resets at {nextResetTime}</span>
                <Tooltip content="Habits reset daily at midnight. Complete them before then to maintain your streak!" />
              </div>
            )}
          </div>
          <motion.button
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/30 transition-all hover:shadow-xl hover:shadow-blue-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            onClick={handleAddClick}
          >
            <Plus className="h-5 w-5" />
            Add New Habit
          </motion.button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search habits by name or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Filters and Sort */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Filter Buttons */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Filter:</span>
            {(["All", "Completed", "Pending"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  filter === f
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Sort Options */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "streak" | "name" | "category")}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="streak">By Streak</option>
              <option value="name">By Name</option>
              <option value="category">By Category</option>
            </select>
          </div>

          {/* Results count */}
          <div className="ml-auto text-sm text-gray-600">
            Showing {filteredAndSortedHabits.length} of {habits.length} habits
          </div>
        </div>
      </div>

      {habitsLoading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {[...Array(6)].map((_, i) => (
            <HabitCardSkeleton key={i} />
          ))}
        </div>
      ) : habits.length === 0 ? (
        <EmptyState
          icon="🌱"
          title="Start Your Journey"
          description="Create your first habit to begin building consistency! Habits reset daily, so you can track your progress every day."
          actionLabel="Create Your First Habit"
          onAction={handleAddClick}
        />
      ) : filteredAndSortedHabits.length === 0 ? (
        <EmptyState
          variant="search"
          title="No habits found"
          description="Try adjusting your search or filters to find what you're looking for."
          onAction={() => {
            setSearchQuery("");
            setFilter("All");
          }}
          actionLabel="Clear Filters"
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <AnimatePresence mode="popLayout">
              {pagination.paginatedItems.map((habit, index) => (
              <motion.div
                key={habit.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -4 }}
                className="group relative overflow-hidden rounded-2xl border border-gray-200/50 bg-white p-6 shadow-md transition-all hover:shadow-xl"
              >
                {/* Gradient Border on Left */}
                <div className={`absolute left-0 top-0 h-full w-1 bg-gradient-to-b ${colorGradients[habit.color]}`} />
                
                {/* Category Badge */}
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1">
                  <span className="text-xs font-semibold text-gray-600">{habit.category}</span>
                </div>

                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    {/* Icon with Circular Background */}
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${colorGradients[habit.color]} text-white shadow-lg shadow-${habit.color}-500/30`}>
                      <span className="text-2xl" aria-hidden>{habit.icon}</span>
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900">{habit.name}</h3>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-2xl">🔥</span>
                        <span className="text-sm font-semibold text-gray-600">
                          {habit.streak} day{habit.streak === 1 ? "" : "s"} streak
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Action Buttons */}
                    <div className="flex items-center gap-1 opacity-0 transition-all group-hover:opacity-100">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        type="button"
                        onClick={() => handleEditClick(habit)}
                        className="rounded-lg bg-blue-50 p-2 text-blue-600 transition-colors hover:bg-blue-100"
                        aria-label="Edit habit"
                      >
                        <Pencil className="h-4 w-4" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        type="button"
                        onClick={() => handleDeleteHabit(habit.id)}
                        className="rounded-lg bg-red-50 p-2 text-red-600 transition-colors hover:bg-red-100"
                        aria-label="Delete habit"
                      >
                        <Trash2 className="h-4 w-4" />
                      </motion.button>
                    </div>
                    
                    {/* Checkbox */}
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      type="button"
                      onClick={() => toggleHabitCompleted(habit.id)}
                      disabled={actionLoading === `toggle-${habit.id}` || !isOnline}
                      className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                        habit.completed
                          ? "bg-gradient-to-br from-green-500 to-green-600 shadow-lg shadow-green-500/30"
                          : "border-2 border-gray-300 hover:border-green-400"
                      }`}
                      aria-label={habit.completed ? `Mark ${habit.name} as incomplete` : `Mark ${habit.name} as complete`}
                      aria-pressed={habit.completed}
                    >
                      {actionLoading === `toggle-${habit.id}` ? (
                        <LoadingSpinner size="sm" />
                      ) : habit.completed ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        >
                          <CheckCircle2 className="h-6 w-6 text-white" />
                        </motion.div>
                      ) : null}
                    </motion.button>
                  </div>
                </div>
              </motion.div>
              ))}
            </AnimatePresence>
          </div>
          
          {pagination.totalPages > 1 && (
            <div className="mt-8">
              <Pagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                onPageChange={pagination.goToPage}
                hasNextPage={pagination.hasNextPage}
                hasPrevPage={pagination.hasPrevPage}
                startIndex={pagination.startIndex}
                endIndex={pagination.endIndex}
                totalItems={pagination.totalItems}
              />
            </div>
          )}
        </>
      )}

      <AddHabitModal open={modalOpen} onClose={() => setModalOpen(false)} onCreate={(h) => handleCreateHabit(h)} onUpdate={handleUpdateHabit} editMode={editMode} habitToEdit={habitToEdit} />
      {habitForNote && (
        <HabitNoteModal
          open={noteModalOpen}
          habitName={habitForNote.name}
          onClose={() => {
            setNoteModalOpen(false);
            setHabitForNote(null);
          }}
          onSave={handleSaveNote}
        />
      )}
    </motion.div>
  );
}

