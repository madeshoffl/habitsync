"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../context/AuthContext";
import AddTodoModal from "../../../components/AddTodoModal";
import { db } from "../../../lib/firebase";
import { collection, addDoc, onSnapshot, query, where, orderBy, doc, updateDoc, deleteDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { Trash2 } from 'lucide-react';

type Priority = "High" | "Medium" | "Low";
type Status = "todo" | "inProgress" | "done";

type Todo = {
  id: string;
  title: string;
  priority: Priority;
  status: Status;
  dueDate?: Timestamp | null;
  createdAt: Timestamp;
};

const COLUMNS = [
  { id: "todo", title: "📝 To Do", bgColor: "bg-gray-50" },
  { id: "inProgress", title: "⚡ In Progress", bgColor: "bg-yellow-50" },
  { id: "done", title: "✅ Done", bgColor: "bg-green-50" },
] as const;

function priorityColor(priority: Priority): string {
  const map = { High: "bg-red-100 text-red-700", Medium: "bg-yellow-100 text-yellow-700", Low: "bg-green-100 text-green-700" };
  return map[priority];
}

export default function TodosPage() {
  const { user, loading } = useAuth();
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
      const list: Todo[] = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          ...data,
          status: data.status || (data.completed ? "done" : "todo"),
        };
      });
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
      status: "todo",
      dueDate: values.dueDate ? Timestamp.fromDate(new Date(values.dueDate)) : null,
      createdAt: serverTimestamp(),
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this todo?")) return;
    await deleteDoc(doc(db, "todos", id));
  }

  async function handleStatusChange(id: string, newStatus: Status) {
    await updateDoc(doc(db, "todos", id), { status: newStatus });
  }

  function getTodosByStatus(status: Status): Todo[] {
    return todos.filter(t => t.status === status);
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 sm:text-2xl">My Kanban Board</h2>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
        >
          + Add To-Do
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {COLUMNS.map((column) => {
          const columnTodos = getTodosByStatus(column.id as Status);
          return (
            <div key={column.id} className={`${column.bgColor} rounded-xl p-4 min-h-[400px]`}>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">{column.title}</h3>
                <span className="rounded-full bg-white px-2 py-1 text-xs font-medium text-gray-600">
                  {columnTodos.length}
                </span>
              </div>

              <div className="space-y-3">
                {columnTodos.length === 0 && (
                  <div className="rounded-lg border-2 border-dashed border-gray-300 bg-white/50 p-6 text-center text-sm text-gray-400">
                    Drop tasks here
                  </div>
                )}
                {columnTodos.map((todo) => (
                  <div
                    key={todo.id}
                    className="group relative rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-all hover:shadow-md"
                  >
                    <div className="mb-2 font-medium text-gray-900">{todo.title}</div>
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${priorityColor(todo.priority)}`}>
                        {todo.priority}
                      </span>
                      {todo.dueDate && (
                        <span className="text-xs text-gray-500">
                          📅 {todo.dueDate.toDate().toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                      {todo.status === "todo" && (
                        <button
                          onClick={() => handleStatusChange(todo.id, "inProgress")}
                          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700"
                        >
                          Start
                        </button>
                      )}
                      
                      {todo.status === "inProgress" && (
                        <>
                          <button
                            onClick={() => handleStatusChange(todo.id, "done")}
                            className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-700"
                          >
                            Complete
                          </button>
                          <button
                            onClick={() => handleStatusChange(todo.id, "todo")}
                            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
                          >
                            Back
                          </button>
                        </>
                      )}
                      
                      {todo.status === "done" && (
                        <button
                          onClick={() => handleStatusChange(todo.id, "todo")}
                          className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
                        >
                          Reopen
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleDelete(todo.id)}
                        className="ml-auto rounded-md p-1 text-red-600 hover:bg-red-50 opacity-0 transition-opacity group-hover:opacity-100"
                        aria-label="Delete todo"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <AddTodoModal open={modalOpen} onClose={() => setModalOpen(false)} onCreate={handleCreate} />
    </>
  );
}
