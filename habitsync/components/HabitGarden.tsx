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
      className="bg-gradient-to-br from-green-50 to-blue-50 rounded-2xl p-6 shadow-lg mb-6"
    >
      <h2 className="text-2xl font-bold text-gray-800 mb-4">🌱 Your Habit Garden</h2>
      
      <div className="flex items-center gap-6">
        <motion.div
          key={stage.emoji}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="text-8xl"
        >
          {stage.emoji}
        </motion.div>

        <div className="flex-1 space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-lg font-semibold text-gray-800">{stage.name}</p>
              <p className="text-sm text-gray-600">{xp} XP</p>
            </div>
            <p className="text-sm text-gray-600 mb-2">{stage.message}</p>
          </div>

          {nextStage && (
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-600">Progress to {nextStage.name}</span>
                <span className="font-semibold text-green-600">{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                  className="h-full bg-gradient-to-r from-green-400 to-blue-500 rounded-full"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {nextStage.xp - xp} XP until {nextStage.emoji}
              </p>
            </div>
          )}

          {!nextStage && (
            <div className="text-center py-2">
              <p className="text-green-600 font-semibold">🎉 Max level reached!</p>
              <p className="text-sm text-gray-600">Keep growing your habits!</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}