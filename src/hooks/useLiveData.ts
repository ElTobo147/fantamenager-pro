import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { registerLiveTitolarita } from '@/data/titolarita';
import { registerLiveStats } from '@/data/stats';

export interface SyncInfo {
  loaded: boolean;
  error: string | null;
  lastSync: string | null;
  refresh: () => void;
}

export function useLiveData(matchdayNum: number): SyncInfo {
  const [version, setVersion] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [formationsRes, injuriesRes, statsRes, logRes] = await Promise.all([
          supabase.from('team_formations').select('squadra, titolari, panchina, matchday'),
          supabase.from('team_injuries').select('squadra, players, matchday'),
          supabase.from('player_stats').select('nome, squadra, gol, assist, fm, pv'),
          supabase.from('data_sync_log').select('fetched_at').order('fetched_at', { ascending: false }).limit(1).maybeSingle(),
        ]);

        if (cancelled) return;
        if (formationsRes.error) throw formationsRes.error;
        if (injuriesRes.error) throw injuriesRes.error;
        if (statsRes.error) throw statsRes.error;

        const formations = (formationsRes.data ?? []).map((r) => ({
          squadra: r.squadra as string,
          titolari: (r.titolari as string[]) ?? [],
          panchina: (r.panchina as string[]) ?? [],
        }));
        const injuries = (injuriesRes.data ?? []).map((r) => ({
          squadra: r.squadra as string,
          players: (r.players as { nome: string }[]) ?? [],
        }));

        const lineupsMd = formationsRes.data?.[0]?.matchday ?? matchdayNum;
        const injuriesMd = injuriesRes.data?.[0]?.matchday ?? matchdayNum;
        registerLiveTitolarita(lineupsMd, formations, injuries);

        const stats = (statsRes.data ?? []).map((r) => ({
          nome: r.nome as string,
          squadra: r.squadra as string,
          gol: r.gol ?? 0,
          assist: r.assist ?? 0,
          fm: r.fm ?? 0,
          pv: r.pv ?? 0,
        }));
        if (stats.length > 0) registerLiveStats(stats);

        setLastSync(logRes.data?.fetched_at ?? null);
        setError(null);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [matchdayNum, version]);

  return { loaded, error, lastSync, refresh };
}
