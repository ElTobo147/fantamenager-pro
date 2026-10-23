// Team form data in the style of WhoScored: recent match results, form rating,
// tactical tendencies, and key player ratings.
// Based on team xG/goals metrics and tier strength to simulate realistic form data.

import { TEAM_METRICS } from '../constants';
import { COACHES } from '../lib/players';
import type { TeamTier } from '../types';

export type FormResult = 'W' | 'D' | 'L';

export interface TeamForm {
  team: string;
  recentResults: FormResult[]; // last 5 matches, most recent first
  formRating: number; // 0-10 scale
  goalsForAvg: number; // goals scored per match
  goalsAgainstAvg: number; // goals conceded per match
  cleanSheetRate: number; // 0-1
  possessionAvg: number; // 0-1
  shotsPerMatch: number;
  shotsOnTargetPerMatch: number;
  passAccuracy: number; // 0-1
  pressingIntensity: number; // 0-1 (high press)
  attackingThreat: number; // 0-1
  defensiveSolidity: number; // 0-1
  tacticalStyle: string; // short description
  keyPlayer: string;
  keyPlayerRating: number; // 0-10
  notes: string; // tactical preview note
}

const TIER_FORM_BASE: Record<TeamTier, number> = {
  S: 7.8,
  A: 7.0,
  B: 6.3,
  C: 5.5,
  D: 4.8,
};

const TIER_THREAT: Record<TeamTier, number> = {
  S: 0.85,
  A: 0.70,
  B: 0.55,
  C: 0.40,
  D: 0.28,
};

const TIER_DEFENSE: Record<TeamTier, number> = {
  S: 0.80,
  A: 0.68,
  B: 0.52,
  C: 0.38,
  D: 0.25,
};

// Key players per team (realistic star players for 2026-27 season)
const KEY_PLAYERS: Record<string, { name: string; rating: number }> = {
  Inter: { name: 'L. Martinez', rating: 8.3 },
  Napoli: { name: 'K. De Bruyne', rating: 8.1 },
  Roma: { name: 'P. Dybala', rating: 7.9 },
  Juventus: { name: 'D. Vlahovic', rating: 7.8 },
  Milan: { name: 'C. Pulisic', rating: 7.7 },
  Lazio: { name: 'M. Zaccagni', rating: 7.3 },
  Atalanta: { name: 'A. Lookman', rating: 7.4 },
  Fiorentina: { name: 'M. Kean', rating: 7.2 },
  Bologna: { name: 'R. Orsolini', rating: 7.0 },
  Como: { name: 'A. Belotti', rating: 7.1 },
  Udinese: { name: 'F. Thauvin', rating: 6.9 },
  Sassuolo: { name: 'D. Frattesi', rating: 7.0 },
  Genoa: { name: 'A. Pinamonti', rating: 6.8 },
  Monza: { name: 'D. Mota', rating: 6.7 },
  Cagliari: { name: 'R. Piccoli', rating: 6.5 },
  Torino: { name: 'D. Zapata', rating: 6.8 },
  Frosinone: { name: 'C. Raimondo', rating: 6.3 },
  Parma: { name: 'A. Bonny', rating: 6.4 },
  Lecce: { name: 'N. Krstovic', rating: 6.3 },
  Venezia: { name: 'J. Oristanio', rating: 6.2 },
};

const TEAM_TIERS_RECORD: Record<string, TeamTier> = {
  Inter: 'S', Roma: 'S', Napoli: 'S',
  Juventus: 'A', Milan: 'A', Lazio: 'A', Atalanta: 'A',
  Fiorentina: 'B', Bologna: 'B', Como: 'B', Udinese: 'B',
  Sassuolo: 'C', Genoa: 'C', Monza: 'C', Cagliari: 'C', Torino: 'C',
  Frosinone: 'D', Parma: 'D', Lecce: 'D', Venezia: 'D',
};

// Seeded pseudo-random for deterministic form per team
function seededResults(seed: number, tier: TeamTier): FormResult[] {
  const results: FormResult[] = [];
  const winBase = tier === 'S' ? 0.6 : tier === 'A' ? 0.48 : tier === 'B' ? 0.36 : tier === 'C' ? 0.28 : 0.20;
  const drawBase = 0.25;
  let s = seed;
  for (let i = 0; i < 5; i++) {
    s = (s * 9301 + 49297) % 233280;
    const r = s / 233280;
    if (r < winBase) results.push('W');
    else if (r < winBase + drawBase) results.push('D');
    else results.push('L');
  }
  return results;
}

function formRatingFromResults(results: FormResult[], tierBase: number): number {
  const points = results.reduce((sum, r) => sum + (r === 'W' ? 3 : r === 'D' ? 1 : 0), 0);
  const maxPoints = 15;
  return parseFloat((tierBase + (points / maxPoints - 0.5) * 2).toFixed(1));
}

export function getTeamForm(team: string): TeamForm {
  const tier = TEAM_TIERS_RECORD[team] ?? 'C';
  const metrics = TEAM_METRICS[team];
  const coach = COACHES[team];
  const keyPlayer = KEY_PLAYERS[team] ?? { name: 'N/D', rating: 6.5 };

  const seed = team.charCodeAt(0) * 137 + (team.charCodeAt(1) ?? 0) * 31;
  const results = seededResults(seed, tier);
  const formRating = formRatingFromResults(results, TIER_FORM_BASE[tier]);

  const goalsForAvg = metrics ? parseFloat((metrics.goals / 8).toFixed(2)) : 1.0;
  const goalsAgainstAvg = parseFloat((2.2 - TIER_DEFENSE[tier] * 1.5).toFixed(2));
  const cleanSheetRate = parseFloat((TIER_DEFENSE[tier] * 0.5).toFixed(2));
  const possessionAvg = parseFloat((0.40 + TIER_THREAT[tier] * 0.20).toFixed(2));
  const shotsPerMatch = Math.round(8 + TIER_THREAT[tier] * 8);
  const shotsOnTargetPerMatch = Math.round(3 + TIER_THREAT[tier] * 4);
  const passAccuracy = parseFloat((0.72 + TIER_THREAT[tier] * 0.15).toFixed(2));
  const pressingIntensity = coach?.stile === 'offensivo' ? 0.75 : coach?.stile === 'difensivo' ? 0.45 : 0.58;
  const attackingThreat = TIER_THREAT[tier];
  const defensiveSolidity = TIER_DEFENSE[tier];

  const styleMap: Record<string, string> = {
    offensivo: 'Pressing alto, costruzione dal basso, ali aggressive',
    difensivo: 'Difesa posizionale, contropiede, bassa bloc',
    bilanciato: 'Costruzione mista, transizioni rapide, pressing intermittente',
  };
  const tacticalStyle = styleMap[coach?.stile ?? 'bilanciato'] ?? 'Stile non definito';

  const notesMap: Record<TeamTier, string[]> = {
    S: [
      'Squadra dominante nel possesso, crea occasioni chiare con regolarita',
      'Solidita difensiva eccellente, raramente concede piu di un gol',
      'Cambi di ritmo devastanti in attacco, pericolosi sulle transizioni',
    ],
    A: [
      'Buon livello tecnico, crea pericolosita dalle fasce',
      'Difesa affidabile ma esposta contro squadre top',
      'Varieta tattica: sa adattarsi all\'avversario',
    ],
    B: [
      'Squadra solida a centrocampo, cerca il controllo del gioco',
      'Difficolta contro pressione alta, errori in uscita',
      'Occasioni da palle inattive, pericolosita sui calci piazzati',
    ],
    C: [
      'Approccio prudente, si concede poco in attacco',
      'Vulnerabile sui fuori gioco, difficolta in transizione difensiva',
      'Punta di riferimento isolata, poca varieta offensiva',
    ],
    D: [
      'Lotta per non retrocedere, approccio molto conservativo',
      'Pochi goal segnati, affida tutto alla difesa',
      'Rischio alto di subire gol da squadre piu forti',
    ],
  };
  const noteIdx = seed % 3;
  const notes = notesMap[tier][noteIdx];

  return {
    team,
    recentResults: results,
    formRating,
    goalsForAvg,
    goalsAgainstAvg,
    cleanSheetRate,
    possessionAvg,
    shotsPerMatch,
    shotsOnTargetPerMatch,
    passAccuracy,
    pressingIntensity,
    attackingThreat,
    defensiveSolidity,
    tacticalStyle,
    keyPlayer: keyPlayer.name,
    keyPlayerRating: keyPlayer.rating,
    notes,
  };
}

export function getFormColor(result: FormResult): string {
  switch (result) {
    case 'W': return 'bg-green-600 text-white';
    case 'D': return 'bg-gray-600 text-white';
    case 'L': return 'bg-red-700 text-white';
  }
}

export function getFormLabel(result: FormResult): string {
  switch (result) {
    case 'W': return 'V';
    case 'D': return 'N';
    case 'L': return 'S';
  }
}

export function formRatingColor(rating: number): string {
  if (rating >= 7.5) return 'text-green-400';
  if (rating >= 6.5) return 'text-yellow-400';
  if (rating >= 5.5) return 'text-orange-400';
  return 'text-red-400';
}
