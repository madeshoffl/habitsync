"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";

function SignInButton() {
  const { signInWithGoogle } = useAuth();
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await signInWithGoogle();
        router.push("/dashboard");
      }}
      className="w-full rounded-lg bg-blue-600 px-6 py-4 text-base font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-50"
    >
      Sign in with Google
    </button>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 text-center">
        <div className="mb-8 text-6xl">🎯</div>
        <h1 className="text-5xl font-extrabold tracking-tight text-gray-900">HabitSync</h1>
        <p className="mt-3 text-lg text-gray-600">Your Personal Habit Tracker</p>
        <p className="mt-1 text-sm text-gray-500">Track habits. Build streaks. Win.</p>

        <div className="mt-10 w-full space-y-3">
          <SignInButton />
          <button
            type="button"
            className="w-full rounded-lg border border-gray-300 bg-white px-6 py-4 text-base font-semibold text-gray-900 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-50"
          >
            Create Account
          </button>
        </div>
      </main>
    </div>
  );
}
