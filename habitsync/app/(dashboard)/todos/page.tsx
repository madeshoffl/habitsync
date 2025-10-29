"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../context/AuthContext";
import AddTodoModal from "../../../components/AddTodoModal";
import { db } from "../../../lib/firebase";
import { collection, addDoc, onSnapshot, query, where, orderBy, doc, updateDoc, deleteDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { Trash2, Plus, CheckCircle2, Circle } from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion";

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

type TemplateTask = {
  title: string;
  priority: Priority;
};

type TemplateCardProps = {
  icon: string;
  title: string;
  tasks: TemplateTask[];
  bgColor: string;
  onCreate: (values: { title: string; priority: Priority; dueDate?: string }) => void;
  userId?: string;
};

function TemplateCard({ icon, title, tasks, bgColor, onCreate, userId }: TemplateCardProps) {
  async function handleUseTemplate() {
    if (!userId) return;
    const confirmed = confirm(`Add ${tasks.length} tasks from "${title}"?`);
    if (!confirmed) return;

    for (const task of tasks) {
      await onCreate({
        title: task.title,
        priority: task.priority,
      });
    }
    alert(`✅ Added ${tasks.length} tasks from ${title}!`);
  }

  return (
    <div className={`relative min-h-48 rounded-lg bg-gradient-to-br ${bgColor} p-4 text-white shadow-md transition-transform hover:scale-105`}>
      <div className="flex items-center gap-2 mb-2">
        <div className="text-xl">{icon}</div>
        <h4 className="text-base font-semibold line-clamp-1">{title}</h4>
      </div>
      <div className="mb-2 text-xs text-white/80">{tasks.length} tasks</div>
      <div className="mb-3 space-y-1 text-xs">
        {tasks.slice(0, 2).map((task, idx) => (
          <div key={idx} className="flex items-center gap-1.5">
            <span className="text-xs">•</span>
            <span className="line-clamp-1">{task.title}</span>
          </div>
        ))}
        {tasks.length > 2 && (
          <div className="text-xs opacity-75">+ {tasks.length - 2} more...</div>
        )}
      </div>
      <button
        onClick={handleUseTemplate}
        className="w-full rounded bg-white px-3 py-1.5 text-xs font-semibold text-gray-900 transition-colors hover:bg-gray-100"
      >
        Use Template
      </button>
    </div>
  );
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900">My Kanban Board</h2>
        <motion.button
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/30 transition-all hover:shadow-xl hover:shadow-blue-500/40"
        >
          <Plus className="h-5 w-5" />
          Add To-Do
        </motion.button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {COLUMNS.map((column, colIndex) => {
          const columnTodos = getTodosByStatus(column.id as Status);
          return (
            <motion.div
              key={column.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: colIndex * 0.1 }}
              className={`rounded-2xl ${column.bgColor} p-4 min-h-[400px] border border-gray-200/50 shadow-md`}
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-bold text-gray-800">{column.title}</h3>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-gray-700 shadow-sm">
                  {columnTodos.length}
                </span>
              </div>

              <div className="space-y-3">
                {columnTodos.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="rounded-xl border-2 border-dashed border-gray-300 bg-white/60 p-6 text-center"
                  >
                    <div className="text-4xl mb-2">📭</div>
                    <span className="text-sm text-gray-500">No tasks yet</span>
                  </motion.div>
                )}
                <AnimatePresence mode="popLayout">
                  {columnTodos.map((todo, index) => (
                    <motion.div
                      key={todo.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: index * 0.05 }}
                      layout
                      className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-md transition-all hover:shadow-lg"
                    >
                      <div className="mb-3 text-sm font-bold text-gray-900">{todo.title}</div>
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span className={`rounded-lg px-2.5 py-1 text-xs font-bold ${priorityColor(todo.priority)}`}>
                          {todo.priority}
                        </span>
                        {todo.dueDate && (
                          <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                            📅 {todo.dueDate.toDate().toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap items-center gap-2">
                        {todo.status === "todo" && (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleStatusChange(todo.id, "inProgress")}
                            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-all hover:shadow-md"
                          >
                            <Circle className="h-3 w-3" />
                            Start
                          </motion.button>
                        )}
                        
                        {todo.status === "inProgress" && (
                          <>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleStatusChange(todo.id, "done")}
                              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-green-600 to-green-700 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-all hover:shadow-md"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              Complete
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleStatusChange(todo.id, "todo")}
                              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 transition-all hover:bg-gray-50"
                            >
                              Back
                            </motion.button>
                          </>
                        )}
                        
                        {todo.status === "done" && (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleStatusChange(todo.id, "todo")}
                            className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 transition-all hover:bg-blue-100"
                          >
                            Reopen
                          </motion.button>
                        )}
                        
                        <motion.button
                          onClick={() => handleDelete(todo.id)}
                          className="ml-auto rounded-lg bg-red-50 p-1.5 text-red-600 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-100"
                          aria-label="Delete todo"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <Trash2 size={14} />
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Quick Start Templates */}
      <div className="mt-8">
        <h3 className="mb-6 text-2xl font-bold text-gray-900">🚀 Quick Start Templates</h3>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <TemplateCard
            icon="📅"
            title="Morning Routine"
            tasks={[
              { title: "Wake up early ⏰", priority: "High" as Priority },
              { title: "Exercise 30 mins 🏃", priority: "Medium" as Priority },
              { title: "Healthy breakfast 🍳", priority: "Medium" as Priority },
              { title: "Review daily goals 📋", priority: "High" as Priority },
              { title: "Meditate 10 mins 🧘", priority: "Low" as Priority },
            ]}
            bgColor="from-blue-500 to-cyan-500"
            onCreate={handleCreate}
            userId={user?.uid}
          />
          <TemplateCard
            icon="💼"
            title="Work Day Essentials"
            tasks={[
              { title: "Check emails 📧", priority: "High" as Priority },
              { title: "Team standup meeting 👥", priority: "High" as Priority },
              { title: "Focus work block 💻", priority: "High" as Priority },
              { title: "Lunch break 🍽️", priority: "Medium" as Priority },
              { title: "Review progress 📊", priority: "Medium" as Priority },
              { title: "Plan tomorrow 📝", priority: "Low" as Priority },
            ]}
            bgColor="from-indigo-500 to-purple-500"
            onCreate={handleCreate}
            userId={user?.uid}
          />
          <TemplateCard
            icon="🏠"
            title="Weekend Chores"
            tasks={[
              { title: "Grocery shopping 🛒", priority: "High" as Priority },
              { title: "Laundry 👕", priority: "Medium" as Priority },
              { title: "Clean apartment 🧹", priority: "Medium" as Priority },
              { title: "Meal prep 🍱", priority: "Low" as Priority },
              { title: "Pay bills 💳", priority: "High" as Priority },
            ]}
            bgColor="from-green-500 to-emerald-500"
            onCreate={handleCreate}
            userId={user?.uid}
          />
          <TemplateCard
            icon="🎯"
            title="Productivity Boost"
            tasks={[
              { title: "Clear inbox to zero 📥", priority: "High" as Priority },
              { title: "Organize workspace 🗂️", priority: "Medium" as Priority },
              { title: "Update task lists 📝", priority: "High" as Priority },
              { title: "Learn something new 📚", priority: "Low" as Priority },
              { title: "Network/reach out 🤝", priority: "Medium" as Priority },
            ]}
            bgColor="from-orange-500 to-red-500"
            onCreate={handleCreate}
            userId={user?.uid}
          />
          <TemplateCard
            icon="💪"
            title="Self Care Sunday"
            tasks={[
              { title: "Sleep in 😴", priority: "High" as Priority },
              { title: "Skincare routine ✨", priority: "Medium" as Priority },
              { title: "Read a book 📖", priority: "Low" as Priority },
              { title: "Call family/friends 📞", priority: "Medium" as Priority },
              { title: "Journal & reflect 📓", priority: "Low" as Priority },
            ]}
            bgColor="from-pink-500 to-rose-500"
            onCreate={handleCreate}
            userId={user?.uid}
          />
        </div>
      </div>

      <AddTodoModal open={modalOpen} onClose={() => setModalOpen(false)} onCreate={handleCreate} />
    </motion.div>
  );
}
