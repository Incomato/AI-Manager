
import { useState, useEffect, useCallback } from 'react';
import { MediaFile, GeneratedPost, ScheduledPost } from '../types';
import * as db from '../services/dbService';
import { useAuth } from '../contexts/AuthContext';

// Generic hook modified to accept a dependency
export function useDb<T>(fetcher: () => Promise<T[]>, dep: any) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    // Only fetch if the dependency is valid (e.g., user is logged in)
    if (!dep) {
      setData([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      setData(result);
    } catch (e: any) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [fetcher, dep]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

export const useMediaFiles = (userId?: string) => useDb<MediaFile>(
    useCallback(() => db.getAllMediaFiles(userId!), [userId]), 
    userId
);
export const useGeneratedPosts = (userId?: string) => {
    const { data, loading, error, refresh } = useDb<GeneratedPost>(
        useCallback(() => db.getAllGeneratedPosts(userId!), [userId]),
        userId
    );

    useEffect(() => {
        const handleRefresh = () => refresh();
        // FIX: Property 'addEventListener' does not exist on type 'Window'. Casting to any to bypass TS lib issue.
        (window as any).addEventListener('posts-updated', handleRefresh);
        // FIX: Property 'removeEventListener' does not exist on type 'Window'. Casting to any to bypass TS lib issue.
        return () => (window as any).removeEventListener('posts-updated', handleRefresh);
    }, [refresh]);
    
    return { data, loading, error, refresh };
};

export const useScheduledPosts = (userId?: string) => {
    const { data, loading, error, refresh } = useDb<ScheduledPost>(
        useCallback(() => db.getAllScheduledPosts(userId!), [userId]), 
        userId
    );

    useEffect(() => {
        const handleRefresh = () => refresh();
        // FIX: Property 'addEventListener' does not exist on type 'Window'. Casting to any to bypass TS lib issue.
        (window as any).addEventListener('posts-updated', handleRefresh);
        // FIX: Property 'removeEventListener' does not exist on type 'Window'. Casting to any to bypass TS lib issue.
        return () => (window as any).removeEventListener('posts-updated', handleRefresh);
    }, [refresh]);

    return { data, loading, error, refresh };
}
