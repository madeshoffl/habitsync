'use client';

import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const stages = [
  { emoji: '🌱', name: 'Seed', xp: 0, message: 'Just getting started!' },
  { emoji: '🌿', name: 'Sprout', xp: 100, message: 'Your habits are taking root!' },
  { emoji: '🪴', name: 'Young Plant', xp: 300, message: 'Growing strong!' },
  { emoji: '🌳', name: 'Tree', xp: 600, message: 'Standing tall!' },
  { emoji: '🌸🌳', name: 'Blooming Tree', xp: 1000, message: 'In full bloom!' },
];

export default function HabitGarden() {
  const { user } = useAuth();
  const [xp, setXp] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (snapshot) => {
      if (snapshot.exists()) {
        setXp(snapshot.data().xp || 0);
      }
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [user]);

  const getCurrentStage = () => {
    for (let i = stages.length - 1; i >= 0; i--) {
      if (xp >= stages[i].xp) return stages[i];
    }
    return stages[0];
  };

  const getNextStage = () => {
    const currentStage = getCurrentStage();
    const currentIndex = stages.findIndex(s => s.xp === currentStage.xp);
    return currentIndex < stages.length - 1 ? stages[currentIndex + 1] : null;
  };

  const stage = getCurrentStage();
  const nextStage = getNextStage();
  const progress = nextStage 
    ? ((xp - stage.xp) / (nextStage.xp - stage.xp)) * 100 
    : 100;

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-2xl p-6 shadow-lg">
        <p className="text-center text-gray-600">Loading your garden...</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-gray-200/50 bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 p-8 shadow-xl mb-6"
    >
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 h-32 w-32 bg-gradient-to-bl from-blue-400/20 to-transparent rounded-bl-full" />
      <div className="absolute bottom-0 left-0 h-32 w-32 bg-gradient-to-tr from-green-400/20 to-transparent rounded-tr-full" />
      
      <div className="relative">
        <h2 className="text-3xl font-black text-gray-900 mb-6 flex items-center gap-2">
          <span className="text-4xl">🌱</span>
          Your Habit Garden
        </h2>
        
        <div className="flex flex-col sm:flex-row items-center gap-8">
          <motion.div
            key={stage.emoji}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="text-9xl"
          >
            {stage.emoji}
          </motion.div>

          <div className="flex-1 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-2xl font-bold text-gray-900">{stage.name}</p>
                <div className="rounded-full bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-1.5">
                  <p className="text-sm font-bold text-white">{xp} XP</p>
                </div>
              </div>
              <p className="text-base text-gray-600">{stage.message}</p>
            </div>

            {nextStage && (
              <div className="rounded-xl bg-white/60 backdrop-blur-sm p-4 border border-gray-200/50">
                <div className="flex items-center justify-between text-sm mb-3">
                  <span className="font-semibold text-gray-700">Progress to {nextStage.name}</span>
                  <span className="font-bold text-green-600">{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 rounded-full"
                  />
                </div>
                <p className="text-sm text-gray-600 mt-2 font-medium">
                  {nextStage.xp - xp} XP until {nextStage.emoji}
                </p>
              </div>
            )}

            {!nextStage && (
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className="rounded-xl bg-gradient-to-r from-green-500 to-blue-500 p-4 text-center"
              >
                <p className="text-white font-bold text-lg">🎉 Max level reached!</p>
                <p className="text-white/90 text-sm mt-1">Keep growing your habits!</p>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}