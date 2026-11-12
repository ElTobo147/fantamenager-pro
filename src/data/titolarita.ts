import G8 from './probabili_formazioni_g8.json';
import INJURIES_G8 from './infortunati_g8.json';
import G7 from './probabili_formazioni_g7.json';
import INJURIES_G7 from './infortunati_g7.json';

interface TeamLineup {
  titolari: string[];
  panchina: string[];
}

type MatchdayLineupData = Record<string, TeamLineup>;
type MatchdayInjuryData = Record<string, string[]>;

interface MatchdayData {
  lineups: MatchdayLineupData;
  injuries: MatchdayInjuryData;
}

const MATCHDAY_DATA: Record<number, MatchdayData> = {
  7: {
    lineups: G7 as MatchdayLineupData,
    injuries: INJURIES_G7 as MatchdayInjuryData,
  },
  8: {
    lineups: G8 as MatchdayLineupData,
    injuries: INJURIES_G8 as MatchdayInjuryData,
  },
};

// Live data fetched from Supabase (populated by the "Aggiorna dati" sync from
// fantacalcio.it). Registered at runtime and merged over the static JSON.
const LIVE_LINEUPS: Record<number, MatchdayLineupData> = {};
const LIVE_INJURIES: Record<number, MatchdayInjuryData> = {};

export function registerLiveTitolarita(
  matchday: number,
  lineups: { squadra: string; titolari: string[]; panchina: string[] }[],
  injuries: { squadra: string; players: { nome: string }[] }[],
): void {
  if (lineups.length > 0) {
    const map: MatchdayLineupData = {};
    for (const l of lineups) map[l.squadra] = { titolari: l.titolari, panchina: l.panchina };
    LIVE_LINEUPS[matchday] = map;
  }
  if (injuries.length > 0) {
    const map: MatchdayInjuryData = {};
    for (const i of injuries) map[i.squadra] = i.players.map((p) => p.nome);
    LIVE_INJURIES[matchday] = map;
  }
}

function dataFor(matchdayNum: number): MatchdayData {
  const liveLineups = LIVE_LINEUPS[matchdayNum];
  const liveInjuries = LIVE_INJURIES[matchdayNum];
  const fallback = MATCHDAY_DATA[matchdayNum];
  if (!fallback) {
    return { lineups: liveLineups ?? {}, injuries: liveInjuries ?? {} };
  }
  return {
    lineups: { ...fallback.lineups, ...(liveLineups ?? {}) },
    injuries: { ...fallback.injuries, ...(liveInjuries ?? {}) },
  };
};

export const TITOLARE_VALUE = 1.0;
export const PANCHINA_VALUE = 0.5;
export const NOT_LISTED_VALUE = 0.3;
export const INJURED_VALUE = 0;

export type TitolaritaStatus = 'titolare' | 'panchina' | 'assente' | 'infortunato' | 'nd';

export function hasTitolaritaData(matchdayNum: number): boolean {
  return matchdayNum in MATCHDAY_DATA || matchdayNum in LIVE_LINEUPS || matchdayNum in LIVE_INJURIES;
}

function normalizeName(name: string): string {
  return name.toUpperCase().trim()
    .replace(/È/g, 'E').replace(/É/g, 'E').replace(/À/g, 'A').replace(/Ì/g, 'I').replace(/Ò/g, 'O').replace(/Ù/g, 'U')
    .replace(/è/g, 'E').replace(/é/g, 'E').replace(/à/g, 'A').replace(/ì/g, 'I').replace(/ò/g, 'O').replace(/ù/g, 'U');
}

function namesMatch(a: string, b: string): boolean {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (na === nb) return true;
  // Strip initials like "K." or "M." from the end for fuzzy match
  const stripInitial = (s: string) => s.replace(/\s+[A-Z]\.?$/, '').trim();
  const naStripped = stripInitial(na);
  const nbStripped = stripInitial(nb);
  if (naStripped === nbStripped && naStripped.length > 2) return true;
  // Partial match: one is prefix of the other
  if (naStripped.length > 2 && nbStripped.length > 2) {
    if (naStripped.startsWith(nbStripped) || nbStripped.startsWith(naStripped)) return true;
    // Match by surname (last word)
    const naLast = naStripped.split(' ').pop() ?? '';
    const nbLast = nbStripped.split(' ').pop() ?? '';
    if (naLast.length > 3 && naLast === nbLast) return true;
  }
  return false;
}

export function getTitolarita(matchdayNum: number, playerName: string, team: string): number {
  const data = dataFor(matchdayNum);
  if (!data.lineups[team] && !data.injuries[team]) return TITOLARE_VALUE;

  // Check injuries first — injured players are always 0%
  const teamInjuries = data.injuries[team];
  if (teamInjuries) {
    for (const injuredName of teamInjuries) {
      if (namesMatch(injuredName, playerName)) {
        return INJURED_VALUE;
      }
    }
  }

  const teamData = data.lineups[team];
  if (!teamData) return TITOLARE_VALUE;

  if (teamData.titolari.some((n) => namesMatch(n, playerName))) {
    return TITOLARE_VALUE;
  }
  if (teamData.panchina.some((n) => namesMatch(n, playerName))) {
    return PANCHINA_VALUE;
  }
  return NOT_LISTED_VALUE;
}

export function getTitolaritaStatus(matchdayNum: number, playerName: string, team: string): TitolaritaStatus {
  const data = dataFor(matchdayNum);
  if (!data.lineups[team] && !data.injuries[team]) return 'nd';

  const teamInjuries = data.injuries[team];
  if (teamInjuries) {
    for (const injuredName of teamInjuries) {
      if (namesMatch(injuredName, playerName)) {
        return 'infortunato';
      }
    }
  }

  const teamData = data.lineups[team];
  if (!teamData) return 'nd';

  if (teamData.titolari.some((n) => namesMatch(n, playerName))) {
    return 'titolare';
  }
  if (teamData.panchina.some((n) => namesMatch(n, playerName))) {
    return 'panchina';
  }
  return 'assente';
}

export function getMatchdayDataInfo(matchdayNum: number): { lineups: boolean; injuries: boolean } {
  const data = dataFor(matchdayNum);
  return {
    lineups: Object.keys(data.lineups).length > 0,
    injuries: Object.keys(data.injuries).length > 0,
  };
}
