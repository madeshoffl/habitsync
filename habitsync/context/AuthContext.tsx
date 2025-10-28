"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { auth, db } from "../lib/firebase";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  xp: number;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  setXp: (xp: number) => Promise<void>;
};

const Ctx = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [xp, setXpState] = useState(0);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const userRef = doc(db, "users", u.uid);
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
          await setDoc(userRef, {
            email: u.email ?? null,
            displayName: u.displayName ?? null,
            xp: 0,
            createdAt: serverTimestamp(),
          });
          setXpState(0);
        } else {
          const data = snap.data();
          setXpState(Number(data.xp ?? 0));
        }
      } else {
        setXpState(0);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const setXp = async (nextXp: number) => {
    setXpState(nextXp);
    if (user) {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { xp: nextXp });
    }
  };

  const value = useMemo<AuthContextValue>(() => ({ user, loading, xp, signInWithGoogle, logout, setXp }), [user, loading, xp]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}


