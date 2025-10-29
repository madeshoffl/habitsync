"use client";

import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, Wifi } from "lucide-react";
import { useOnlineStatus } from "../hooks/useOnlineStatus";

export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-white shadow-lg"
          role="alert"
          aria-live="assertive"
        >
          <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
            <div className="flex items-center justify-center gap-2 text-sm font-medium">
              <WifiOff className="h-5 w-5" aria-hidden="true" />
              <span>You're offline. Some features may be limited.</span>
            </div>
          </div>
        </motion.div>
      )}
      {isOnline && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-50 bg-green-500 text-white shadow-lg"
          role="status"
          aria-live="polite"
        >
          <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
            <div className="flex items-center justify-center gap-2 text-sm font-medium">
              <Wifi className="h-5 w-5" aria-hidden="true" />
              <span>Back online!</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

