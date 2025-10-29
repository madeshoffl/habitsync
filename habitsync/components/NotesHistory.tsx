"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Calendar as CalendarIcon } from "lucide-react";
import { getNotesByDate } from "../lib/notes";
import { useAuth } from "../context/AuthContext";
import { format } from "date-fns";

export default function NotesHistory({ habitId }: { habitId?: string }) {
  const { user } = useAuth();
  const [notesByDate, setNotesByDate] = useState<Array<{ date: string; notes: Array<{ habitName: string; note: string; time: string }> }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchNotes();
    }
  }, [user, habitId]);

  async function fetchNotes() {
    if (!user) return;
    try {
      setLoading(true);
      const notes = await getNotesByDate(user.uid);
      setNotesByDate(notes);
    } catch (error) {
      console.error("Error fetching notes:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading notes...</div>
      </div>
    );
  }

  if (notesByDate.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
        <BookOpen className="mx-auto mb-4 h-12 w-12 text-gray-400" />
        <h3 className="mb-2 text-lg font-semibold text-gray-900">No notes yet</h3>
        <p className="text-sm text-gray-600">Start adding notes when you complete habits to see your reflection history here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {notesByDate.map((dateGroup, index) => (
        <motion.div
          key={dateGroup.date}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
        >
          <div className="mb-3 flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-gray-500" />
            <h3 className="font-semibold text-gray-900">
              {format(new Date(dateGroup.date), "EEEE, MMMM d, yyyy")}
            </h3>
          </div>
          <div className="space-y-3">
            {dateGroup.notes.map((note, noteIndex) => (
              <div
                key={noteIndex}
                className="rounded-lg border-l-4 border-blue-500 bg-blue-50 p-3"
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-semibold text-blue-900">{note.habitName}</span>
                  <span className="text-xs text-blue-700">{note.time}</span>
                </div>
                <p className="text-sm text-blue-800">{note.note}</p>
              </div>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

