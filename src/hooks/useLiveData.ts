import { useEffect, useState, useCallback } from 'react';
import { getLastSync } from '@/lib/localDb';

export interface SyncInfo {
  loaded: boolean;
  error: string | null;
  lastSync: string | null;
  refresh: () => void;
}

export function useLiveData(_matchdayNum: number): SyncInfo {
  const [version, setVersion] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [error] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    const log = getLastSync();
    setLastSync(log?.fetched_at ?? null);
    setLoaded(true);
  }, [version]);

  return { loaded, error, lastSync, refresh };
}
