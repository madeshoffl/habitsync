"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, RefreshCw, X } from "lucide-react";
import { useState } from "react";

interface ErrorMessageProps {
  error: Error | string | null;
  onRetry?: () => void;
  className?: string;
  dismissible?: boolean;
}

export function ErrorMessage({ 
  error, 
  onRetry, 
  className = "",
  dismissible = false 
}: ErrorMessageProps) {
  const [dismissed, setDismissed] = useState(false);

  if (!error || dismissed) return null;

  const errorMessage = typeof error === "string" ? error : error.message;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={`rounded-xl border-2 border-red-200 bg-red-50 p-4 ${className}`}
        role="alert"
        aria-live="assertive"
      >
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-red-900 mb-1">Error</h3>
            <p className="text-sm text-red-700">{errorMessage}</p>
            {onRetry && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onRetry}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                aria-label="Retry action"
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </motion.button>
            )}
          </div>
          {dismissible && (
            <button
              onClick={() => setDismissed(true)}
              className="shrink-0 rounded-lg p-1 text-red-600 transition-colors hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500"
              aria-label="Dismiss error"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

