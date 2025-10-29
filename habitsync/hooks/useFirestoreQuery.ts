"use client";

import { useState, useEffect, useRef } from "react";
import { Query, onSnapshot, QuerySnapshot, DocumentData } from "firebase/firestore";
import { toast } from "react-hot-toast";

interface UseFirestoreQueryOptions {
  onError?: (error: Error) => void;
  disableCache?: boolean;
}

export function useFirestoreQuery<T extends DocumentData>(
  queryFn: (() => Query) | null,
  cacheKey: string,
  options: UseFirestoreQueryOptions = {}
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const cacheRef = useRef<Map<string, { data: T[]; timestamp: number }>>(new Map());
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!queryFn) {
      setLoading(false);
      return;
    }

    const query = queryFn();
    const CACHE_DURATION = 30000; // 30 seconds

    // Check cache first
    if (!options.disableCache) {
      const cached = cacheRef.current.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        setData(cached.data);
        setLoading(false);
        // Still subscribe for updates, but show cached data immediately
      }
    }

    setLoading(true);
    setError(null);

    try {
      const unsubscribe = onSnapshot(
        query,
        (snapshot: QuerySnapshot) => {
          const items = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          } as T));

          // Update cache
          if (!options.disableCache) {
            cacheRef.current.set(cacheKey, {
              data: items,
              timestamp: Date.now(),
            });
          }

          setData(items);
          setLoading(false);
          setError(null);
        },
        (err) => {
          const error = err as Error;
          console.error("Firestore query error:", error);
          setError(error);
          setLoading(false);
          
          if (options.onError) {
            options.onError(error);
          } else {
            toast.error("Failed to load data. Please try again.");
          }
        }
      );

      unsubscribeRef.current = unsubscribe;

      return () => {
        unsubscribe();
      };
    } catch (err) {
      const error = err as Error;
      setError(error);
      setLoading(false);
      
      if (options.onError) {
        options.onError(error);
      } else {
        toast.error("Failed to load data. Please try again.");
      }
    }
  }, [queryFn, cacheKey, options.disableCache, options.onError]);

  return { data, loading, error };
}

