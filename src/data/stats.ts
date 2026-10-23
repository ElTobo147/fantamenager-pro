import type { PlayerStatsData, Ruolo } from '../types';
import { TEAM_METRICS } from '../constants';

export const PLAYER_STATS: Record<string, PlayerStatsData> = {
  'RAIMONDO|FROSINONE': { gol: 7, assist: 0, xg: 5.2, xa: 1.1 },
  'MALEN|ROMA': { gol: 6, assist: 1, xg: 4.8, xa: 2.3 },
  'VARELA|MONZA': { gol: 6, assist: 2, xg: 4.5, xa: 3.1 },
  'MALDINI|CAGLIARI': { gol: 4, assist: 1, xg: 3.2, xa: 1.8 },
  'MARTINEZ|INTER': { gol: 4, assist: 2, xg: 4.1, xa: 2.5 },
  'THURAM|INTER': { gol: 4, assist: 3, xg: 3.8, xa: 3.2 },
  'RABIOT|MILAN': { gol: 4, assist: 1, xg: 3.0, xa: 2.0 },
  'KRSTOVIC|ATALANTA': { gol: 4, assist: 0, xg: 3.5, xa: 0.8 },
  'ADZIC|SASSUOLO': { gol: 3, assist: 1, xg: 2.1, xa: 1.5 },
  'DE BRUYNE|NAPOLI': { gol: 3, assist: 4, xg: 2.5, xa: 5.2 },
  'KVERNADZE|FROSINONE': { gol: 3, assist: 1, xg: 2.0, xa: 1.2 },
  'OSMAJIC|GENOA': { gol: 3, assist: 0, xg: 2.8, xa: 0.5 },
  'CALHANOGLU|INTER': { gol: 3, assist: 2, xg: 2.3, xa: 3.5 },
  'FRATTESI|LAZIO': { gol: 3, assist: 1, xg: 2.2, xa: 1.8 },
  'MASTANTUONO|FIORENTINA': { gol: 3, assist: 2, xg: 2.5, xa: 2.8 },
  'MOREIRA|MILAN': { gol: 3, assist: 3, xg: 2.0, xa: 4.0 },
  'EKKELENKAMP|UDINESE': { gol: 3, assist: 1, xg: 2.1, xa: 2.2 },
  'DOUVIKAS|COMO': { gol: 3, assist: 1, xg: 2.4, xa: 1.5 },
  'ADAMS|TORINO': { gol: 3, assist: 1, xg: 2.0, xa: 1.0 },
};

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

export function getPlayerStats(nome: string, squadra: string, ruolo?: Ruolo, qt?: number): PlayerStatsData {
  const key = `${normalize(nome)}|${normalize(squadra)}`;
  if (PLAYER_STATS[key]) return PLAYER_STATS[key];

  // Fuzzy match by surname
  const normName = normalize(nome);
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
