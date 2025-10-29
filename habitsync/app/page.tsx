"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { motion } from "framer-motion";
import { Target, TrendingUp, Sparkles } from "lucide-react";

function SignInButton() {
  const { signInWithGoogle } = useAuth();
  const router = useRouter();
  return (
    <motion.button
      type="button"
      onClick={async () => {
        await signInWithGoogle();
        router.push("/dashboard");
      }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-4 text-base font-bold text-white shadow-lg shadow-blue-500/30 transition-all duration-200 hover:shadow-xl hover:shadow-blue-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
    >
      <span className="relative z-10 flex items-center justify-center gap-2">
        Sign in with Google
      </span>
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600"
        initial={{ x: "-100%" }}
        whileHover={{ x: 0 }}
        transition={{ duration: 0.3 }}
      />
    </motion.button>
  );
}

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Animated Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-blue-400/20 via-purple-400/20 to-pink-400/20"
          animate={{
            backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{
            backgroundSize: "200% 200%",
          }}
        />
      </div>

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 opacity-[0.03] [background-image:linear-gradient(to_right,#000_1px,transparent_1px),linear-gradient(to_bottom,#000_1px,transparent_1px)] [background-size:50px_50px]" />

      {/* Floating Circles */}
      <motion.div
        className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-purple-300/30 blur-3xl"
        animate={{
          x: [0, 50, 0],
          y: [0, 30, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-blue-300/30 blur-3xl"
        animate={{
          x: [0, -30, 0],
          y: [0, -50, 0],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <main className="relative mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative"
        >
          {/* Glassmorphism Card */}
          <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-white/80 p-12 shadow-2xl backdrop-blur-xl">
            {/* Shine Effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              animate={{
                x: ["-100%", "300%"],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "linear",
              }}
            />

            {/* Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              <div className="mb-6 text-7xl">🎯</div>
              <h1 className="mb-4 bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-6xl font-black tracking-tight text-transparent sm:text-7xl">
                HabitSync
              </h1>
              <p className="mb-2 text-2xl font-semibold text-gray-700">Your Personal Habit Tracker</p>
              <p className="text-base text-gray-500">Track habits. Build streaks. Win.</p>

              {/* Feature Highlights */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="mx-auto mt-10 grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3"
              >
                <div className="flex flex-col items-center gap-2 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/50 p-4 backdrop-blur-sm">
                  <div className="rounded-full bg-blue-500 p-3 text-white">
                    <Target className="h-6 w-6" />
                  </div>
                  <span className="font-semibold text-gray-900">Track Daily</span>
                  <span className="text-sm text-gray-600">Stay consistent</span>
                </div>
                <div className="flex flex-col items-center gap-2 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100/50 p-4 backdrop-blur-sm">
                  <div className="rounded-full bg-purple-500 p-3 text-white">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                  <span className="font-semibold text-gray-900">Build Streaks</span>
                  <span className="text-sm text-gray-600">Level up habits</span>
                </div>
                <div className="flex flex-col items-center gap-2 rounded-xl bg-gradient-to-br from-pink-50 to-pink-100/50 p-4 backdrop-blur-sm">
                  <div className="rounded-full bg-pink-500 p-3 text-white">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <span className="font-semibold text-gray-900">Stay Motivated</span>
                  <span className="text-sm text-gray-600">Reach goals</span>
                </div>
              </motion.div>

              {/* CTA Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.6 }}
                className="mt-12 w-full space-y-4"
              >
                <SignInButton />
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full rounded-xl border-2 border-gray-300 bg-white/60 px-8 py-4 text-base font-bold text-gray-900 shadow-md backdrop-blur-sm transition-all duration-200 hover:border-gray-400 hover:bg-white/80 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                >
                  Create Account
                </motion.button>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>

        {/* Bottom Illustration */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.6 }}
          className="absolute bottom-8 text-sm text-gray-400"
        >
          Built with ❤️ for better habits
        </motion.p>
      </main>
    </div>
  );
}
