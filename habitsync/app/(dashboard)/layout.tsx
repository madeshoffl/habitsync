"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../../context/AuthContext";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { xp } = useAuth();

  // Calculate level and progress
  const level = Math.floor((xp ?? 0) / 100) || 1;
  const xpInLevel = (xp ?? 0) % 100;
  const progressPercent = xpInLevel;

  const linkBase = "block rounded-md px-3 py-2 hover:bg-gray-50";
  const getActiveClass = (href: string) => pathname === href ? " bg-blue-50 text-blue-700" : "";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md p-2 text-gray-600 hover:bg-gray-100 sm:hidden"
              onClick={() => setSidebarOpen((v) => !v)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
              </svg>
            </button>
            <div className="text-2xl">🎯</div>
            <span className="text-xl font-bold text-gray-900">HabitSync</span>
          </div>
          <div className="flex items-center gap-3 text-sm sm:text-base">
            <div className="flex items-center gap-2 rounded-md bg-gray-100 px-3 py-1.5 text-gray-800">
              <span>⭐</span>
              <span className="font-medium">{xp} XP</span>
              <span className="font-semibold">•</span>
              <span className="font-semibold">Level {level}</span>
            </div>
            <div className="hidden items-center gap-2 sm:flex">
              <div className="relative h-2 w-20 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full bg-blue-600 transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-xs font-medium text-gray-600">{xpInLevel}/100</span>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6">
        <aside className="hidden w-56 shrink-0 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:block">
          <nav className="space-y-1 text-gray-700">
            <Link className={linkBase + getActiveClass("/dashboard")} href="/dashboard">🏠 Home</Link>
            <Link className={linkBase + getActiveClass("/stats")} href="/stats">📊 Stats</Link>
            <Link className={linkBase + getActiveClass("/todos")} href="/todos">🗒️ To-Dos</Link>
            <Link className={linkBase + getActiveClass("/settings")} href="/settings">⚙️ Settings</Link>
          </nav>
        </aside>

        {sidebarOpen && (
          <div className="fixed inset-0 z-40 sm:hidden">
            <div className="absolute inset-0 bg-black/30" onClick={() => setSidebarOpen(false)} />
            <div className="absolute left-0 top-0 h-full w-64 border-r border-gray-200 bg-white p-4 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <span className="font-semibold text-gray-900">HabitSync</span>
                <button type="button" onClick={() => setSidebarOpen(false)} className="rounded-md p-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <nav className="space-y-1 text-gray-700">
                <Link className={linkBase + getActiveClass("/dashboard")} href="/dashboard">🏠 Home</Link>
                <Link className={linkBase + getActiveClass("/stats")} href="/stats">📊 Stats</Link>
                <Link className={linkBase + getActiveClass("/todos")} href="/todos">🗒️ To-Dos</Link>
                <Link className={linkBase + getActiveClass("/settings")} href="/settings">⚙️ Settings</Link>
              </nav>
            </div>
          </div>
        )}

        <section className="flex-1">
          {children}
        </section>
      </div>
    </div>
  );
}
