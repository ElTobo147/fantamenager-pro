import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
  saveFormations, saveInjuries, saveStats, saveCoaches,
  type SyncResultData,
  type StatRow,
  type FormationRow,
  type InjuryRow,
  type CoachRow,
} from '@/lib/localDb';
import { registerLiveCoaches } from '../lib/players';

export interface LiveStatsRow {
  nome: string;
  squadra: string;
  gol: number;
  assist: number;
  fm: number;
  mv: number;
  pv: number;
}

export interface LiveFormationRow {
  matchday: number;
  squadra: string;
  titolari: string[];
  panchina: string[];
}

export interface LiveInjuryRow {
  matchday: number;
  squadra: string;
  players: { nome: string; nota?: string }[];
}

export interface LiveCoachRow {
  squadra: string;
  allenatore: string;
  statuso: string | null;
}

export interface SyncInfo {
  loaded: boolean;
  error: string | null;
  lastSync: string | null;
  refresh: () => void;
  syncVersion: number;
  stats: LiveStatsRow[];
  formations: LiveFormationRow[];
  injuries: LiveInjuryRow[];
  coaches: LiveCoachRow[];
}

export function useLiveData(matchdayNum: number): SyncInfo {
  const [version, setVersion] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [stats, setStats] = useState<LiveStatsRow[]>([]);
  const [formations, setFormations] = useState<LiveFormationRow[]>([]);
  const [injuries, setInjuries] = useState<LiveInjuryRow[]>([]);
  const [coaches, setCoaches] = useState<LiveCoachRow[]>([]);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [formationsRes, injuriesRes, statsRes, coachesRes, logRes] = await Promise.all([
          supabase.from('team_formations').select('matchday, squadra, titolari, panchina'),
          supabase.from('team_injuries').select('matchday, squadra, players'),
          supabase.from('player_stats').select('nome, squadra, gol, assist, fm, mv, pv'),
          supabase.from('coaches').select('squadra, allenatore, statuso'),
          supabase.from('data_sync_log').select('fetched_at').order('fetched_at', { ascending: false }).limit(1).maybeSingle(),
        ]);

        if (cancelled) return;
        if (formationsRes.error) throw formationsRes.error;
        if (injuriesRes.error) throw injuriesRes.error;
        if (statsRes.error) throw statsRes.error;
        if (coachesRes.error) throw coachesRes.error;

        const liveStats: LiveStatsRow[] = (statsRes.data ?? []).map((r) => ({
          nome: r.nome as string,
          squadra: r.squadra as string,
          gol: (r.gol as number) ?? 0,
          assist: (r.assist as number) ?? 0,
          fm: (r.fm as number) ?? 0,
          mv: (r.mv as number) ?? 0,
          pv: (r.pv as number) ?? 0,
        }));
        const liveFormations: LiveFormationRow[] = (formationsRes.data ?? []).map((r) => ({
          matchday: r.matchday as number,
          squadra: r.squadra as string,
          titolari: (r.titolari as string[]) ?? [],
          panchina: (r.panchina as string[]) ?? [],
        }));
        const liveInjuries: LiveInjuryRow[] = (injuriesRes.data ?? []).map((r) => ({
          matchday: r.matchday as number,
          squadra: r.squadra as string,
          players: (r.players as { nome: string; nota?: string }[]) ?? [],
        }));
        const liveCoaches: LiveCoachRow[] = (coachesRes.data ?? []).map((r) => ({
          squadra: r.squadra as string,
          allenatore: r.allenatore as string,
          statuso: (r.statuso as string | null) ?? null,
        }));

        if (!cancelled) {
          setStats(liveStats);
          setFormations(liveFormations);
          setInjuries(liveInjuries);
          setCoaches(liveCoaches);
        }

        // Also sync to localStorage for legacy modules (titolarita, stats)
        const syncData: SyncResultData = {
          formations: liveFormations as FormationRow[],
          injuries: liveInjuries as InjuryRow[],
          stats: liveStats as StatRow[],
          coaches: liveCoaches as CoachRow[],
        };
        saveFormations(syncData.formations ?? []);
        saveInjuries(syncData.injuries ?? []);
        saveStats(syncData.stats ?? []);
        saveCoaches(syncData.coaches ?? []);

        // Register live coaches
        registerCoaches(liveCoaches);

        if (!cancelled) {
          setLastSync(logRes.data?.fetched_at ?? null);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [matchdayNum, version]);

  return { loaded, error, lastSync, refresh, syncVersion: version, stats, formations, injuries, coaches };
}

// Register live coaches into the players module
function registerCoaches(rows: LiveCoachRow[]): void {
  registerLiveCoaches(rows.map((r) => ({
    squadra: r.squadra,
    allenatore: r.allenatore,
    statuso: r.statuso ?? undefined,
  })));
}
