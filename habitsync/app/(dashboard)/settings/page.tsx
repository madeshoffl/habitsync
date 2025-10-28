"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "../../../context/AuthContext";
import { useEffect } from "react";

export default function SettingsPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/");
      return;
    }
  }, [user, loading, router]);

  // Debug logging
  useEffect(() => {
    if (user) {
      console.log('Full user object:', user);
      console.log('Photo URL:', user.photoURL);
      console.log('Display Name:', user.displayName);
      console.log('Email:', user.email);
    }
  }, [user]);

  return (
    <>
      <h2 className="mb-4 text-xl font-semibold text-gray-900 sm:text-2xl">Settings</h2>
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col items-center space-y-4 mb-8">
          {user?.photoURL ? (
            <img 
              src={user.photoURL}
              alt="Profile Picture"
              className="w-32 h-32 rounded-full border-4 border-blue-500 shadow-lg object-cover"
              referrerPolicy="no-referrer"
              onError={(e) => {
                console.error('Image failed to load:', user.photoURL);
                e.currentTarget.style.display = 'none';
              }}
              onLoad={() => console.log('✅ Image loaded successfully!')}
            />
          ) : (
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-5xl font-bold shadow-lg">
              {user?.displayName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || '?'}
            </div>
          )}
          
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-800">{user?.displayName || 'User'}</h2>
            <p className="text-gray-600 mt-1">{user?.email}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={async () => {
            await logout();
            router.replace("/");
          }}
          className="mt-6 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700"
        >
          Log Out
        </button>
      </div>
    </>
  );
}
