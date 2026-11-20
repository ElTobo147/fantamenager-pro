import { useMemo } from 'react';
import type { Player, PlayerStatsData, Calendario } from '../types';
import { getPlayerStats } from '../data/stats';
import {
  getTitolarita, hasTitolaritaData,
  TITOLARE_VALUE, PANCHINA_VALUE, NOT_LISTED_VALUE, INJURED_VALUE,
} from '../data/titolarita';
import type {
  LiveStatsRow,
  LiveFormationRow,
  LiveInjuryRow,
} from '../hooks/useLiveData';

function normalize(s: string): string {
  return s.toUpperCase().trim()
    .replace(/È/g, 'E').replace(/É/g, 'E').replace(/À/g, 'A')
    .replace(/Ì/g, 'I').replace(/Ò/g, 'O').replace(/Ù/g, 'U')
    .replace(/è/g, 'E').replace(/é/g, 'E').replace(/à/g, 'A')
    .replace(/ì/g, 'I').replace(/ò/g, 'O').replace(/ù/g, 'U')
    .replace(/Č/g, 'C').replace(/Ć/g, 'C').replace(/Ž/g, 'Z')
    .replace(/Š/g, 'S').replace(/Đ/g, 'D')
    .replace(/&#x27;/g, "'").replace(/&apos;/g, "'");
}

function namesMatch(a: string, b: string): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return true;
  const stripInitial = (s: string) => s.replace(/\s+[A-Z]\.?$/, '').trim();
  const naStripped = stripInitial(na);
  const nbStripped = stripInitial(nb);
  if (naStripped === nbStripped && naStripped.length > 2) return true;
  if (naStripped.length > 2 && nbStripped.length > 2) {
    if (naStripped.startsWith(nbStripped) || nbStripped.startsWith(naStripped)) return true;
    const naLast = naStripped.split(' ').pop() ?? '';
    const nbLast = nbStripped.split(' ').pop() ?? '';
    if (naLast.length > 3 && naLast === nbLast) return true;
  }
  return false;
}

/**
 * Build a lookup map from live stats rows, keyed by normalized "NOME|SQUADRA".
 * Also supports fuzzy surname match fallback.
 */
function buildStatsMap(stats: LiveStatsRow[]): Map<string, LiveStatsRow> {
  const map = new Map<string, LiveStatsRow>();
  for (const s of stats) {
    const key = `${normalize(s.nome)}|${normalize(s.squadra)}`;
    map.set(key, s);
  }
  return map;
}

/**
 * Find a live stat row for a roster player by exact name match, then fuzzy surname.
 */
function findLiveStat(
  statsMap: Map<string, LiveStatsRow>,
  nome: string,
  squadra: string,
): LiveStatsRow | null {
  const key = `${normalize(nome)}|${normalize(squadra)}`;
  const exact = statsMap.get(key);
  if (exact) return exact;

  const normSquadra = normalize(squadra);
  const playerSurname = normalize(nome).split(' ').pop() ?? normalize(nome);
  for (const [k, row] of statsMap) {
    const [statName, statTeam] = k.split('|');
    if (statTeam !== normSquadra) continue;
    const statSurname = statName.split(' ').pop() ?? statName;
    if (statSurname.length > 3 && namesMatch(playerSurname, statSurname)) {
      return row;
    }
  }
  return null;
}

/**
 * Find titolarita for a player from live formation/injury data.
 * Returns the numeric multiplier (1.0, 0.5, 0.3, or 0).
 */
function findLiveTitolarita(
  formations: LiveFormationRow[],
  injuries: LiveInjuryRow[],
  matchdayNum: number,
  nome: string,
  squadra: string,
): number | null {
  const mdFormations = formations.filter((f) => f.matchday === matchdayNum && f.squadra === squadra);
  const mdInjuries = injuries.filter((f) => f.matchday === matchdayNum && f.squadra === squadra);

  // Check injuries first
  for (const inj of mdInjuries) {
    for (const p of inj.players) {
      if (namesMatch(p.nome, nome)) return INJURED_VALUE;
    }
  }

  // Check formations
  for (const f of mdFormations) {
    if (f.titolari.some((n) => namesMatch(n, nome))) return TITOLARE_VALUE;
    if (f.panchina.some((n) => namesMatch(n, nome))) return PANCHINA_VALUE;
    return NOT_LISTED_VALUE;
  }

  return null;
}

/**
 * Merge a roster player with live stats data.
 * Downloaded goals, assists, FantaMedia and appearances always override estimates.
 */
function mergeStats(base: PlayerStatsData, live: LiveStatsRow | null): PlayerStatsData {
  if (!live) return base;
  return {
    gol: live.gol,
    assist: live.assist,
    xg: base.xg, // keep estimated xg — Supabase fm=0 would destroy it
    xa: base.xa, // keep estimated xa
    fm: live.fm,
    mv: live.mv,
    pv: live.pv,
  };
}

export interface EnrichedPlayer extends Player {
  liveStatsFound: boolean;
  liveTitolaritaFound: boolean;
}

/**
 * The core merge function: takes the roster and live data, returns enriched players
 * with stats and titolarita joined by player name.
 */
export function enrichRoster(
  players: Player[],
  matchdayNum: number,
  liveStats: LiveStatsRow[],
  liveFormations: LiveFormationRow[],
  liveInjuries: LiveInjuryRow[],
): EnrichedPlayer[] {
  const statsMap = buildStatsMap(liveStats);

  return players.map((p) => {
    // 1. Find live stats by name
    const liveStat = findLiveStat(statsMap, p.nome, p.squadra);
    const baseStats = getPlayerStats(p.nome, p.squadra, p.ruolo, p.qt);
    const mergedStats = mergeStats(baseStats, liveStat);

    // 2. Find live titolarita
    const liveTit = findLiveTitolarita(liveFormations, liveInjuries, matchdayNum, p.nome, p.squadra);
    const hasLiveData = liveFormations.some((f) => f.matchday === matchdayNum) ||
                        liveInjuries.some((f) => f.matchday === matchdayNum);
    const titolarita = hasLiveData
      ? (liveTit ?? (hasTitolaritaData(matchdayNum) ? getTitolarita(matchdayNum, p.nome, p.squadra) : TITOLARE_VALUE))
      : TITOLARE_VALUE;

    return {
      ...p,
      stats: mergedStats,
      percentualeTitolarita: titolarita,
      liveStatsFound: !!liveStat,
      liveTitolaritaFound: liveTit !== null,
    } as EnrichedPlayer;
  });
}

/**
 * The core merge hook: same as enrichRoster, memoized on live data changes.
 */
export function useEnrichedTeam(
  players: Player[],
  matchdayNum: number,
  liveStats: LiveStatsRow[],
  liveFormations: LiveFormationRow[],
  liveInjuries: LiveInjuryRow[],
): EnrichedPlayer[] {
  return useMemo(
    () => enrichRoster(players, matchdayNum, liveStats, liveFormations, liveInjuries),
    [players, matchdayNum, liveStats, liveFormations, liveInjuries],
  );
}
