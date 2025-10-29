"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../context/AuthContext";
import { db } from "../../../lib/firebase";
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from "date-fns";

type CompletionRecord = {
  date: string;
  habitsCompleted: number;
  todosCompleted: number;
  habitsTotal: number;
  todosTotal: number;
};

type CompletionData = {
  [date: string]: {
    habits: string[];
    todos: string[];
  };
};

export default function CalendarPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [completionData, setCompletionData] = useState<CompletionData>({});
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [monthSummary, setMonthSummary] = useState<CompletionRecord[]>([]);
  const [bestDay, setBestDay] = useState<{ date: string; percentage: number } | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/");
      return;
    }
    fetchCompletionData();
  }, [user, loading, router, currentDate]);

  async function fetchCompletionData() {
    if (!user) return;

    // Get date range for current month
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);

    try {
      // Fetch habits with lastCompletedDate
      const habitsQuery = query(
        collection(db, "habits"),
        where("userId", "==", user.uid)
      );
      const habitsSnapshot = await getDocs(habitsQuery);
      
      // Fetch todos with completions
      const todosQuery = query(
        collection(db, "todos"),
        where("userId", "==", user.uid)
      );
      const todosSnapshot = await getDocs(todosQuery);

      // Process habits
      const habitsData: CompletionData = {};
      habitsSnapshot.forEach((doc) => {
        const data = doc.data();
        const lastCompletedDate = data.lastCompletedDate;
        
        if (lastCompletedDate) {
          const date = format(lastCompletedDate.toDate(), "yyyy-MM-dd");
          if (!habitsData[date]) {
            habitsData[date] = { habits: [], todos: [] };
          }
          habitsData[date].habits.push(data.name);
        }
      });

      // Process todos (those with status "done")
      const todosData: CompletionData = {};
      todosSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.status === "done" && data.completedAt) {
          const date = format(data.completedAt.toDate(), "yyyy-MM-dd");
          if (!todosData[date]) {
            todosData[date] = { habits: [], todos: [] };
          }
          todosData[date].todos.push(data.title);
        }
      });

      // Merge data
      const merged: CompletionData = {};
      
      // Merge habits
      Object.keys(habitsData).forEach((date) => {
        merged[date] = merged[date] || { habits: [], todos: [] };
        merged[date].habits = habitsData[date].habits;
      });

      // Merge todos
      Object.keys(todosData).forEach((date) => {
        merged[date] = merged[date] || { habits: [], todos: [] };
        merged[date].todos = todosData[date].todos;
      });

      setCompletionData(merged);
      
      // Calculate month summary
      const habitsTotal = habitsSnapshot.size;
      const todosTotal = todosSnapshot.size;
      
      const monthDays = eachDayOfInterval({
        start: startOfMonth(currentDate),
        end: endOfMonth(currentDate),
      });

      const summary: CompletionRecord[] = monthDays.map((day) => {
        const dateKey = format(day, "yyyy-MM-dd");
        const data = merged[dateKey] || { habits: [], todos: [] };
      
        return {
          date: dateKey,
          habitsCompleted: data.habits.length,
          todosCompleted: data.todos.length,
          habitsTotal,
          todosTotal,
        };
      });

      setMonthSummary(summary);

      // Find best day
      const best = summary.reduce(
        (best, current) => {
          const currentTotal = current.habitsTotal + current.todosTotal;
          const currentCompleted = current.habitsCompleted + current.todosCompleted;
          const currentPercentage = currentTotal > 0 ? (currentCompleted / currentTotal) * 100 : 0;

          const bestTotal = best.habitsTotal + best.todosTotal;
          const bestCompleted = best.habitsCompleted + best.todosCompleted;
          const bestPercentage = bestTotal > 0 ? (bestCompleted / bestTotal) * 100 : 0;

          return currentPercentage > bestPercentage ? current : best;
        },
        summary[0] || { date: "", habitsCompleted: 0, todosCompleted: 0, habitsTotal: 0, todosTotal: 0 }
      );

      const bestTotal = best.habitsTotal + best.todosTotal;
      const bestCompleted = best.habitsCompleted + best.todosCompleted;
      const bestPercentage = bestTotal > 0 ? (bestCompleted / bestTotal) * 100 : 0;

      if (bestPercentage > 0) {
        setBestDay({
          date: format(new Date(best.date), "MMM d"),
          percentage: Math.round(bestPercentage),
        });
      }
    } catch (error) {
      console.error("Error fetching completion data:", error);
    }
  }

  function tileClassName({ date }: { date: Date }) {
    const dateKey = format(date, "yyyy-MM-dd");
    const today = format(new Date(), "yyyy-MM-dd");
    const data = completionData[dateKey];

    let classes = "react-calendar__tile";

    // Highlight today
    if (dateKey === today) {
      classes += " today";
    }

    // Add completion indicator
    if (data && (data.habits.length > 0 || data.todos.length > 0)) {
      const totalItems = data.habits.length + data.todos.length;
      if (totalItems >= 3) {
        classes += " high-completion";
      } else if (totalItems >= 2) {
        classes += " medium-completion";
      } else {
        classes += " low-completion";
      }
    }

    return classes;
  }

  function tileContent({ date }: { date: Date }) {
    const dateKey = format(date, "yyyy-MM-dd");
    const data = completionData[dateKey];
    
    if (!data || (data.habits.length === 0 && data.todos.length === 0)) {
      return null;
    }

    return (
      <div className="mt-1 flex justify-center gap-0.5">
        {data.habits.length > 0 && (
          <div className="h-1.5 w-1.5 rounded-full bg-green-500" title="Habits completed" />
        )}
        {data.todos.length > 0 && (
          <div className="h-1.5 w-1.5 rounded-full bg-blue-500" title="Todos completed" />
        )}
      </div>
    );
  }

  function getSelectedDayData() {
    if (!selectedDate) return null;
    const dateKey = format(selectedDate, "yyyy-MM-dd");
    return completionData[dateKey];
  }

  const selectedDayData = getSelectedDayData();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Activity Calendar</h2>
          <p className="mt-1 text-sm text-gray-600">
            Track your habits and todos completion over time
          </p>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="rounded-xl border border-gray-300 bg-white p-2 text-gray-700 shadow-sm transition-all hover:bg-gray-50"
          >
            <ChevronLeft className="h-5 w-5" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="rounded-xl border border-gray-300 bg-white p-2 text-gray-700 shadow-sm transition-all hover:bg-gray-50"
          >
            <ChevronRight className="h-5 w-5" />
          </motion.button>
        </div>
      </div>

      {/* Stats Summary */}
      {bestDay && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 rounded-2xl border border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50 p-6 shadow-sm"
        >
          <div className="flex items-center gap-2 text-gray-900">
            <span className="text-2xl">🏆</span>
            <span className="text-lg font-bold">
              Best day this month: {bestDay.percentage}% on {bestDay.date}
            </span>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
            <style jsx global>{`
              .react-calendar {
                width: 100%;
                border: none;
                font-family: inherit;
              }
              .react-calendar__tile {
                padding: 1em 0.5em;
                border-radius: 0.5rem;
                position: relative;
              }
              .react-calendar__tile:hover {
                background-color: rgb(243 244 246);
              }
              .react-calendar__tile.today {
                background-color: rgb(219 234 254);
                color: rgb(37 99 235);
                font-weight: bold;
              }
              .react-calendar__tile.high-completion {
                background-color: rgb(220 252 231);
              }
              .react-calendar__tile.medium-completion {
                background-color: rgb(254 249 195);
              }
              .react-calendar__tile.low-completion {
                background-color: rgb(254 226 226);
              }
              .react-calendar__tile--active {
                background-color: rgb(59 130 246) !important;
                color: white !important;
              }
              .react-calendar__month-view__weekdays__weekday {
                font-weight: 600;
                color: rgb(107 114 128);
                padding: 1em;
              }
              .react-calendar__navigation {
                padding: 1.5em 0.5em;
                background-color: rgb(249 250 251);
              }
              .react-calendar__navigation button {
                font-size: 1.125rem;
                font-weight: 600;
                color: rgb(31 41 55);
              }
            `}</style>
            <Calendar
              value={currentDate}
              onChange={(date) => {
                if (date instanceof Date) {
                  setSelectedDate(date);
                }
              }}
              tileClassName={tileClassName}
              tileContent={tileContent}
              calendarType="gregory"
              view="month"
            />
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap items-center gap-6 rounded-xl border border-gray-200 bg-white p-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-full bg-green-500" />
              <span className="text-gray-600">Habit completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-full bg-blue-500" />
              <span className="text-gray-600">Todo completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded border-2 border-blue-500 bg-blue-50" />
              <span className="text-gray-600">Today</span>
            </div>
          </div>
        </div>

        {/* Selected Day Details */}
        <div>
          <div className="sticky top-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
            <h3 className="mb-4 text-xl font-bold text-gray-900">
              {selectedDate ? format(selectedDate, "MMM d, yyyy") : "Select a day"}
            </h3>

            {selectedDate && selectedDayData ? (
              <div className="space-y-4">
                {/* Habits */}
                {selectedDayData.habits.length > 0 && (
                  <div>
                    <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <span className="text-green-500">✓</span>
                      Habits Completed ({selectedDayData.habits.length})
                    </h4>
                    <div className="space-y-1">
                      {selectedDayData.habits.map((habit, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-gray-700"
                        >
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          {habit}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Todos */}
                {selectedDayData.todos.length > 0 && (
                  <div>
                    <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <span className="text-blue-500">✓</span>
                      Todos Completed ({selectedDayData.todos.length})
                    </h4>
                    <div className="space-y-1">
                      {selectedDayData.todos.map((todo, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-gray-700"
                        >
                          <CheckCircle2 className="h-4 w-4 text-blue-600" />
                          {todo}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* No activity */}
                {selectedDayData.habits.length === 0 && selectedDayData.todos.length === 0 && (
                  <div className="rounded-xl border-2 border-dashed border-gray-300 p-8 text-center">
                    <div className="text-4xl mb-2">📭</div>
                    <p className="text-sm text-gray-500">No activity recorded on this day</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border-2 border-dashed border-gray-300 p-8 text-center">
                <div className="text-4xl mb-2">📅</div>
                <p className="text-sm text-gray-500">Click on a date to see details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

