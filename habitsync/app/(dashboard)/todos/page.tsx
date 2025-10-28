"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../context/AuthContext";
import AddTodoModal from "../../../components/AddTodoModal";
import { db } from "../../../lib/firebase";
import { collection, addDoc, onSnapshot, query, where, orderBy, doc, updateDoc, deleteDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Pencil, Trash2 } from 'lucide-react';

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

  async function handleDragEnd(result: DropResult) {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const newStatus = destination.droppableId as Status;
    
    await updateDoc(doc(db, "todos", draggableId), { status: newStatus });
  }

  function getTodosByStatus(status: Status): Todo[] {
    return todos.filter(t => t.status === status);
  }

  const todoList = getTodosByStatus("todo");
  const inProgressList = getTodosByStatus("inProgress");
  const doneList = getTodosByStatus("done");

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

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {COLUMNS.map((column) => {
            const columnTodos = getTodosByStatus(column.id as Status);
            return (
              <div key={column.id} className={`${column.bgColor} rounded-xl p-4 min-h-[400px]`}>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-800">
                    {column.title}
                  </h3>
                  <span className="rounded-full bg-white px-2 py-1 text-xs font-medium text-gray-600">
                    {columnTodos.length}
                  </span>
                </div>

                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-[200px] space-y-3 transition-colors ${
                        snapshot.isDraggingOver ? "bg-white/50 rounded-lg" : ""
                      }`}
                    >
                      {columnTodos.length === 0 && (
                        <div className="rounded-lg border-2 border-dashed border-gray-300 bg-white/50 p-6 text-center text-sm text-gray-400">
                          Drop tasks here
                        </div>
                      )}
                      {columnTodos.map((todo, index) => (
                        <Draggable key={todo.id} draggableId={todo.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`group relative rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-all hover:shadow-md ${
                                snapshot.isDragging ? "rotate-2 shadow-lg" : ""
                              }`}
                            >
                              <div className="mb-2 font-medium text-gray-900">{todo.title}</div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${priorityColor(todo.priority)}`}>
                                  {todo.priority}
                                </span>
                                {todo.dueDate && (
                                  <span className="text-xs text-gray-500">
                                    📅 {todo.dueDate.toDate().toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                              
                              <div className="mt-3 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                <button
                                  type="button"
                                  onClick={() => handleDelete(todo.id)}
                                  className="rounded-md p-1 text-red-600 hover:bg-red-50"
                                  aria-label="Delete todo"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      <AddTodoModal open={modalOpen} onClose={() => setModalOpen(false)} onCreate={handleCreate} />
    </>
  );
}
