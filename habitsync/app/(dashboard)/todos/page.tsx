"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../context/AuthContext";
import AddTodoModal from "../../../components/AddTodoModal";
import { db } from "../../../lib/firebase";
import { collection, addDoc, onSnapshot, query, where, orderBy, doc, updateDoc, deleteDoc, serverTimestamp, Timestamp } from "firebase/firestore";

type Priority = "High" | "Medium" | "Low";

type Todo = {
  id: string;
  title: string;
  priority: Priority;
  dueDate?: Timestamp | null;
  completed: boolean;
  createdAt: Timestamp;
};

function todoPriorityXpAward(priority: Priority): number {
  const map = { High: 100, Medium: 50, Low: 10 };
  return map[priority];
}

function priorityColor(priority: Priority): string {
  const map = { High: "bg-red-100 text-red-700", Medium: "bg-yellow-100 text-yellow-700", Low: "bg-green-100 text-green-700" };
  return map[priority];
}

export default function TodosPage() {
  const { user, loading, xp, setXp } = useAuth();
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [todos, setTodos] = useState<Todo[]>([]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/");
      return;
    }
    const q = query(collection(db, "todos"), where("userId", "==", user.uid), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const list: Todo[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      list.sort((a, b) => Number(a.completed) - Number(b.completed));
      setTodos(list);
    });
    return () => unsub();
  }, [user, loading, router]);

  async function handleCreate(values: { title: string; priority: Priority; dueDate?: string }) {
    if (!user) return;
    await addDoc(collection(db, "todos"), {
      userId: user.uid,
      title: values.title,
      priority: values.priority,
      dueDate: values.dueDate ? Timestamp.fromDate(new Date(values.dueDate)) : null,
      completed: false,
      createdAt: serverTimestamp(),
    });
  }

  async function toggleComplete(id: string, completed: boolean, priority: Priority) {
    await updateDoc(doc(db, "todos", id), { completed });
    if (completed) {
      const xpAmount = todoPriorityXpAward(priority);
      await setXp(Math.max(0, (xp ?? 0) + xpAmount));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this todo?")) return;
    setTodos((prev) => prev.filter((t) => t.id !== id));
    await deleteDoc(doc(db, "todos", id));
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 sm:text-2xl">My To-Do List</h2>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
        >
          + Add To-Do
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {todos.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-gray-500 shadow-sm">
            No todos yet. Click "+ Add To-Do" to get started!
          </div>
        ) : (
          todos.map((todo) => (
            <div
              key={todo.id}
              className={`flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition ${todo.completed ? "opacity-60" : ""}`}
            >
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={(e) => toggleComplete(todo.id, e.target.checked, todo.priority)}
                className="h-5 w-5 cursor-pointer rounded border-gray-300 text-green-600 accent-green-600"
              />
              <div className="flex-1">
                <div className={`flex items-center gap-2 ${todo.completed ? "line-through" : ""}`}>
                  <span className="font-medium text-gray-900">{todo.title}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${priorityColor(todo.priority)}`}>
                    {todo.priority}
                  </span>
                  {todo.dueDate && (
                    <span className="text-xs text-gray-500">
                      Due: {todo.dueDate.toDate().toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(todo.id)}
                className="rounded-md p-1 text-red-600 hover:bg-red-50 transition"
                aria-label="Delete todo"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>

      <AddTodoModal open={modalOpen} onClose={() => setModalOpen(false)} onCreate={handleCreate} />
    </>
  );
}

