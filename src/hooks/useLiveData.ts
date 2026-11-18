import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
  saveFormations, saveInjuries, saveStats, saveCoaches,
  type SyncResultData,
} from '@/lib/localDb';

export interface SyncInfo {
  loaded: boolean;
  error: string | null;
  lastSync: string | null;
  refresh: () => void;
  syncVersion: number;
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
        const [formationsRes, injuriesRes, statsRes, coachesRes, logRes] = await Promise.all([
          supabase.from('team_formations').select('matchday, squadra, titolari, panchina'),
          supabase.from('team_injuries').select('matchday, squadra, players'),
          supabase.from('player_stats').select('nome, squadra, gol, assist, fm, pv'),
          supabase.from('coaches').select('squadra, allenatore, statuso'),
          supabase.from('data_sync_log').select('fetched_at').order('fetched_at', { ascending: false }).limit(1).maybeSingle(),
        ]);

        if (cancelled) return;
        if (formationsRes.error) throw formationsRes.error;
        if (injuriesRes.error) throw injuriesRes.error;
        if (statsRes.error) throw statsRes.error;
        if (coachesRes.error) throw coachesRes.error;

        // Sync Supabase data into localDb so titolarita/stats modules can read it
        const syncData: SyncResultData = {
          formations: (formationsRes.data ?? []).map((r) => ({
            matchday: r.matchday as number,
            squadra: r.squadra as string,
            titolari: (r.titolari as string[]) ?? [],
            panchina: (r.panchina as string[]) ?? [],
          })),
          injuries: (injuriesRes.data ?? []).map((r) => ({
            matchday: r.matchday as number,
            squadra: r.squadra as string,
            players: (r.players as { nome: string; nota?: string }[]) ?? [],
          })),
          stats: (statsRes.data ?? []).map((r) => ({
            nome: r.nome as string,
            squadra: r.squadra as string,
            gol: (r.gol as number) ?? 0,
            assist: (r.assist as number) ?? 0,
            fm: (r.fm as number) ?? 0,
            pv: (r.pv as number) ?? 0,
          })),
          coaches: (coachesRes.data ?? []).map((r) => ({
            squadra: r.squadra as string,
            allenatore: r.allenatore as string,
            statuso: (r.statuso as string | null) ?? null,
          })),
        };
        saveFormations(syncData.formations ?? []);
        saveInjuries(syncData.injuries ?? []);
        saveStats(syncData.stats ?? []);
        saveCoaches(syncData.coaches ?? []);

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

  return { loaded, error, lastSync, refresh, syncVersion: version };
}
