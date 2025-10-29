"use client";

import { motion } from "framer-motion";

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-gray-200 ${className}`}
      aria-label="Loading"
    />
  );
}

export function HabitCardSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative overflow-hidden rounded-2xl border border-gray-200/50 bg-white p-6 shadow-md"
    >
      {/* Gradient Border on Left */}
      <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-gray-300 to-gray-400" />
      
      {/* Category Badge */}
      <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1">
        <Skeleton className="h-4 w-16" />
      </div>

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 flex-1">
          {/* Icon */}
          <Skeleton className="h-12 w-12 rounded-2xl" />
          
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-32" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </div>

        {/* Checkbox */}
        <Skeleton className="h-10 w-10 rounded-xl" />
      </div>
    </motion.div>
  );
}

export function TodoCardSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-gray-200 bg-white p-4 shadow-md"
    >
      <Skeleton className="mb-3 h-5 w-full" />
      <div className="mb-3 flex gap-2">
        <Skeleton className="h-6 w-16 rounded-lg" />
        <Skeleton className="h-6 w-20 rounded-lg" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>
    </motion.div>
  );
}

export function GardenSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-200/50 bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 p-8 shadow-xl mb-6">
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="flex flex-col sm:flex-row items-center gap-8">
          <Skeleton className="h-32 w-32 rounded-full" />
          <div className="flex-1 space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-full" />
            </div>
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function StatsCardSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-200/50 bg-white p-6 shadow-md">
      <Skeleton className="mb-4 h-6 w-32" />
      <Skeleton className="h-12 w-full mb-2" />
      <Skeleton className="h-4 w-24" />
    </div>
  );
}

export function LoadingSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-3",
    lg: "h-12 w-12 border-4",
  };

  return (
    <div
      className={`${sizeClasses[size]} animate-spin rounded-full border-t-blue-600 border-r-transparent border-b-transparent border-l-transparent`}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

