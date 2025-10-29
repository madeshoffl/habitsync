"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BookOpen } from "lucide-react";
import NotesHistory from "../../../components/NotesHistory";

export default function NotesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/");
      return;
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="mb-6 flex items-center gap-3">
        <BookOpen className="h-8 w-8 text-blue-600" />
        <h2 className="text-3xl font-bold text-gray-900">Habit Notes & Journal</h2>
      </div>
      <p className="mb-6 text-gray-600">
        Review your reflections and notes from habit completions. This helps you track your journey and identify patterns.
      </p>
      <NotesHistory />
    </motion.div>
  );
}

