"use client";

import { useEffect, useMemo, useState } from "react";
import AddHabitModal from "../../../components/AddHabitModal";
import HabitGarden from "../../../components/HabitGarden";
import { useAuth } from "../../../context/AuthContext";
import { useRouter } from "next/navigation";
import { db } from "../../../lib/firebase";
import { collection, addDoc, onSnapshot, orderBy, query, where, serverTimestamp, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { Pencil, Trash2 } from 'lucide-react';

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

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/");
      return;
    }
    const q = query(collection(db, "habits"), where("userId", "==", user.uid), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
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
    });
    return () => unsub();
  }, [user, loading, router]);

  const longestStreak = useMemo(() => {
    return habits.reduce((max, h) => Math.max(max, h.streak), 0);
  }, [habits]);

  async function toggleHabitCompleted(habitId: number) {
    const h = habits.find((x) => x.id === habitId);
    if (!h) return;
    const newCompleted = !h.completed;
    const delta = newCompleted ? 1 : -1;
    const newStreak = Math.max(0, h.streak + delta);
    setHabits((prev) => prev.map((x) => x.id === h.id ? { ...x, completed: newCompleted, streak: newStreak } : x));
    await setXp(Math.max(0, (xp ?? 0) + (newCompleted ? 10 : -10)));
    const ref = doc(db, "habits", String(h.id));
    await updateDoc(ref, { completed: newCompleted, streak: newStreak });
  }

  async function handleCreateHabit(payload: { name: string; category: Habit["category"]; icon: string; color: Habit["color"]; }) {
    if (!user) return;
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
  }

  async function handleUpdateHabit(habitId: number | string, payload: { name: string; category: Habit["category"]; icon: string; color: Habit["color"]; }) {
    const ref = doc(db, "habits", String(habitId));
    await updateDoc(ref, {
      name: payload.name,
      icon: payload.icon,
      color: payload.color,
      category: payload.category,
    });
  }

  async function handleDeleteHabit(habitId: number) {
    if (!confirm("Are you sure you want to delete this habit?")) return;
    const ref = doc(db, "habits", String(habitId));
    await deleteDoc(ref);
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

  return (
    <>
      <HabitGarden />

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 sm:text-2xl">Today's Habits</h2>
        <button
          type="button"
          className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          onClick={handleAddClick}
        >
          + Add New Habit
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {habits.map((habit) => (
          <div key={habit.id} className="group relative flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:shadow-md">
            <div className="flex items-center gap-3">
              <div className="text-2xl" aria-hidden>{habit.icon}</div>
              <div>
                <div className="text-base font-medium text-gray-900">{habit.name}</div>
                <div className="text-sm text-gray-500">🔥 {habit.streak} day{habit.streak === 1 ? "" : "s"} streak</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => handleEditClick(habit)}
                  className="rounded-md p-2 text-blue-600 transition-colors hover:bg-blue-50 md:p-1.5"
                  aria-label="Edit habit"
                >
                  <Pencil className="h-[18px] w-[18px] md:h-4 md:w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteHabit(habit.id)}
                  className="rounded-md p-2 text-red-600 transition-colors hover:bg-red-50 md:p-1.5"
                  aria-label="Delete habit"
                >
                  <Trash2 className="h-[18px] w-[18px] md:h-4 md:w-4" />
                </button>
              </div>
              <input
                type="checkbox"
                checked={habit.completed}
                onChange={() => toggleHabitCompleted(habit.id)}
                className="h-5 w-5 cursor-pointer rounded border-gray-300 text-green-600 accent-green-600"
                aria-label={habit.completed ? "Completed today" : "Not completed"}
              />
            </div>
          </div>
        ))}
      </div>

      <AddHabitModal open={modalOpen} onClose={() => setModalOpen(false)} onCreate={(h) => handleCreateHabit(h)} onUpdate={handleUpdateHabit} editMode={editMode} habitToEdit={habitToEdit} />
    </>
  );
}

