import type { PlayerStatsData, Ruolo } from '../types';
import { TEAM_METRICS } from '../constants';
import STATS_JSON from './playerStatsData.json';

// Real season stats scraped from fantacalcio.it/statistiche-serie-a:
// gol, assist, fantamedia (fm) and partite a voto (pv) for every Serie A player.
// xg/xa are derived estimates from goals/assists + fantamedia quality.
export const PLAYER_STATS: Record<string, PlayerStatsData> = STATS_JSON as Record<string, PlayerStatsData>;

function normalize(s: string): string {
  return s.toUpperCase().trim()
    .replace(/È/g, 'E').replace(/É/g, 'E').replace(/À/g, 'A')
    .replace(/Ì/g, 'I').replace(/Ò/g, 'O').replace(/Ù/g, 'U')
    .replace(/Č/g, 'C').replace(/Ć/g, 'C').replace(/Ž/g, 'Z')
    .replace(/Š/g, 'S').replace(/Đ/g, 'D');
}

// Default team xG if not in TEAM_METRICS
const DEFAULT_TEAM_XG = 9.0;

// Role-based share of team xG and xA distribution
// Attaccanti get the most xG, Centrocampisti get more xA, Difensori/P little
const ROLE_XG_SHARE: Record<Ruolo, number> = {
  A: 0.35,
  C: 0.15,
  D: 0.08,
  P: 0.01,
};
const ROLE_XA_SHARE: Record<Ruolo, number> = {
  A: 0.18,
  C: 0.30,
  D: 0.10,
  P: 0.01,
};

// QT-based multiplier: high-QT players are more likely to score
// QT ranges roughly 1-30 in fantacalcio; map to 0.4x - 1.8x
function qtMultiplier(qt: number): number {
  if (qt <= 0) return 0.5;
  return 0.4 + Math.min(qt / 25, 1.4);
}

/**
 * Estimate xG/xA for a player based on role, quotazione, and team xG.
 * Used when no hardcoded stats exist.
 */
function estimateStats(nome: string, squadra: string, ruolo: Ruolo, qt: number): PlayerStatsData {
  const teamXG = TEAM_METRICS[squadra]?.xG ?? DEFAULT_TEAM_XG;
  const teamGoals = TEAM_METRICS[squadra]?.goals ?? Math.round(teamXG);

  const qm = qtMultiplier(qt);
  const xg = teamXG * ROLE_XG_SHARE[ruolo] * qm;
  const xa = teamXG * ROLE_XA_SHARE[ruolo] * qm * 0.7;

  // Estimate goals/assists from xG/xA (roughly 1 goal per 1.2 xG)
  const gol = Math.max(0, Math.round(xg / 1.2));
  const assist = Math.max(0, Math.round(xa / 1.5));

  return {
    gol,
    assist,
    xg: parseFloat(xg.toFixed(1)),
    xa: parseFloat(xa.toFixed(1)),
  };
}

// Live stats fetched from Supabase (populated by the "Aggiorna dati" sync from
// fantacalcio.it). Merged over the hardcoded snapshot: live wins.
const LIVE_STATS: Record<string, PlayerStatsData> = {};

export function registerLiveStats(rows: { nome: string; squadra: string; gol: number; assist: number; fm: number; pv: number }[]): void {
  for (const r of rows) {
    LIVE_STATS[`${normalize(r.nome)}|${normalize(r.squadra)}`] = {
      gol: r.gol,
      assist: r.assist,
      xg: r.fm,
      xa: 0,
      fm: r.fm,
      pv: r.pv,
    };
  }
}

function liveKey(normName: string, normSquadra: string): PlayerStatsData | null {
  if (LIVE_STATS[`${normName}|${normSquadra}`]) return LIVE_STATS[`${normName}|${normSquadra}`];
  // Fuzzy match by surname within the same team
  const playerName = normName.split(' ').pop() ?? normName;
  for (const k of Object.keys(LIVE_STATS)) {
    const [statName, statTeam] = k.split('|');
    if (statTeam !== normSquadra) continue;
    const statSurname = statName.split(' ').pop() ?? statName;
    if (statSurname.length > 3 && (statSurname === playerName || statSurname.startsWith(playerName) || playerName.startsWith(statSurname))) {
      return LIVE_STATS[k];
    }
  }
  return null;
}

export function getPlayerStats(nome: string, squadra: string, ruolo?: Ruolo, qt?: number): PlayerStatsData {
  const normName = normalize(nome);
  const normSquadra = normalize(squadra);
  const live = liveKey(normName, normSquadra);
  if (live) return live;

  const key = `${normName}|${normSquadra}`;
  if (PLAYER_STATS[key]) return PLAYER_STATS[key];

  // Fuzzy match by surname
  for (const k of Object.keys(PLAYER_STATS)) {
    const [statName, statTeam] = k.split('|');
    if (statTeam === normalize(squadra)) {
      const statSurname = statName.split(' ').pop() ?? statName;
      const playerName = normName.split(' ').pop() ?? normName;
      if (statSurname.length > 3 && (statSurname === playerName || statSurname.startsWith(playerName) || playerName.startsWith(statSurname))) {
        return PLAYER_STATS[k];
      }
    }
  }

  // No hardcoded stats: estimate from role, QT, and team metrics
  return estimateStats(nome, squadra, ruolo ?? 'C', qt ?? 5);
}

export function hasHardcodedStats(nome: string, squadra: string): boolean {
  const key = `${normalize(nome)}|${normalize(squadra)}`;
  if (PLAYER_STATS[key]) return true;
  const normName = normalize(nome);
  for (const k of Object.keys(PLAYER_STATS)) {
    const [statName, statTeam] = k.split('|');
    if (statTeam === normalize(squadra)) {
      const statSurname = statName.split(' ').pop() ?? statName;
      const playerName = normName.split(' ').pop() ?? normName;
      if (statSurname.length > 3 && (statSurname === playerName || statSurname.startsWith(playerName) || playerName.startsWith(statSurname))) {
        return true;
      }
    }
  }
  return false;
}
