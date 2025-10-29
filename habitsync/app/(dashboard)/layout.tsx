"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart3, Home, ListTodo, Settings, Calendar, TrendingUp, BookOpen } from "lucide-react";
import { calculateLevel } from "../../lib/stats";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const { user, xp } = useAuth();

  // Calculate level and progress using utility function
  const level = calculateLevel(xp ?? 0);
  const xpInLevel = (xp ?? 0) % 100;
  const progressPercent = xpInLevel;

  // Track scroll for header shadow
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const linkBase = "flex items-center gap-3 rounded-xl px-4 py-3 font-medium transition-all hover:bg-gray-100";
  const getActiveClass = (href: string) => 
    pathname === href ? "bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 shadow-sm" : "text-gray-700";

  const navItems = [
    { href: "/dashboard", icon: Home, label: "Home" },
    { href: "/calendar", icon: Calendar, label: "Calendar" },
    { href: "/analytics", icon: TrendingUp, label: "Analytics" },
    { href: "/stats", icon: BarChart3, label: "Stats" },
    { href: "/todos", icon: ListTodo, label: "To-Dos" },
    { href: "/notes", icon: BookOpen, label: "Notes" },
    { href: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <motion.header 
        className={`sticky top-0 z-50 border-b transition-all duration-300 ${
          scrolled 
            ? "border-gray-200/50 bg-white/90 shadow-lg backdrop-blur-xl" 
            : "border-transparent bg-white/70 backdrop-blur-md"
        }`}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-xl p-2 text-gray-600 transition-all hover:bg-gray-100 sm:hidden"
              onClick={() => setSidebarOpen((v) => !v)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
              </svg>
            </button>
            <div className="flex items-center gap-3">
              <div className="text-3xl">🎯</div>
              <span className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                HabitSync
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* XP Badge */}
            <motion.div 
              className="hidden items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2 text-white shadow-lg sm:flex"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <span className="text-lg">⭐</span>
              <div className="flex flex-col">
                <span className="text-xs font-medium opacity-90">Level {level}</span>
                <span className="text-sm font-bold">{xp} XP</span>
              </div>
            </motion.div>

            {/* Progress Bar */}
            <div className="hidden items-center gap-3 sm:flex">
              <div className="relative h-2.5 w-24 overflow-hidden rounded-full bg-gray-200 shadow-inner">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
              <span className="text-xs font-semibold text-gray-600">{xpInLevel}/100</span>
            </div>

            {/* Profile Picture */}
            {user?.photoURL && (
              <motion.img
                src={user.photoURL}
                alt="Profile"
                className="h-10 w-10 rounded-full border-2 border-white shadow-md"
                whileHover={{ scale: 1.1 }}
                transition={{ type: "spring", stiffness: 400 }}
              />
            )}
          </div>
        </div>
      </motion.header>

      <div className="mx-auto flex max-w-7xl gap-8 px-4 py-8 sm:px-6">
        <aside className="hidden w-64 shrink-0 rounded-2xl border border-gray-200/50 bg-white/80 p-6 shadow-lg backdrop-blur-sm sm:block">
          <nav className="space-y-2">
            {navItems.map((item, index) => (
              <motion.div
                key={item.href}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link 
                  href={item.href} 
                  className={`${linkBase} ${getActiveClass(item.href)}`}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              </motion.div>
            ))}
          </nav>
        </aside>

        <AnimatePresence>
          {sidebarOpen && (
            <motion.div 
              className="fixed inset-0 z-40 sm:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
              <motion.div
                initial={{ x: -300 }}
                animate={{ x: 0 }}
                exit={{ x: -300 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="absolute left-0 top-0 h-full w-72 border-r border-gray-200 bg-white/95 p-6 shadow-2xl backdrop-blur-xl"
              >
                <div className="mb-6 flex items-center justify-between">
                  <span className="text-xl font-bold text-gray-900">HabitSync</span>
                  <button 
                    type="button" 
                    onClick={() => setSidebarOpen(false)} 
                    className="rounded-xl p-2 transition-all hover:bg-gray-100"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-6 w-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <nav className="space-y-2">
                  {navItems.map((item, index) => (
                    <motion.div
                      key={item.href}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Link 
                        href={item.href} 
                        className={`${linkBase} ${getActiveClass(item.href)}`}
                        onClick={() => setSidebarOpen(false)}
                      >
                        <item.icon className="h-5 w-5" />
                        <span>{item.label}</span>
                      </Link>
                    </motion.div>
                  ))}
                </nav>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.section 
          className="flex-1"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {children}
        </motion.section>
      </div>
    </div>
  );
}
