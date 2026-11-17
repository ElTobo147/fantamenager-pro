// Internal localStorage-based data layer.
// Replaces Supabase for all data persistence (roster, stats, formations,
// injuries, coaches, standings, data sources, sync log).

export interface RosterEntry {
  id: string;
  nome: string;
  squadra: string;
  ruolo: 'P' | 'D' | 'C' | 'A';
  qt: number;
  eta: number;
  bonus: number;
  percentuale_titolarita: number;
}

export interface StatRow {
  nome: string;
  squadra: string;
  gol: number;
  assist: number;
  fm: number;
  pv: number;
}

export interface StandingRow {
  posizione: number;
  squadra: string;
  gare: number;
  vittorie: number;
  pareggi: number;
  sconfitte: number;
  gol_fatti: number;
  gol_subiti: number;
  punti: number;
}

export interface CoachRow {
  squadra: string;
  allenatore: string;
  statuso: string | null;
}

export interface FormationRow {
  matchday: number;
  squadra: string;
  titolari: string[];
  panchina: string[];
}

export interface InjuryRow {
  matchday: number;
  squadra: string;
  players: { nome: string; nota?: string }[];
}

export interface DataSourceRow {
  id: string;
  source_key: string;
  label: string;
  url: string;
  parser_type: string;
  enabled: boolean;
}

export interface SyncLogRow {
  id: string;
  source: string;
  status: string;
  fetched_at: string;
}

const KEYS = {
  roster: 'fm_roster',
  stats: 'fm_stats',
  standings: 'fm_standings',
  coaches: 'fm_coaches',
  formations: 'fm_formations',
  injuries: 'fm_injuries',
  sources: 'fm_data_sources',
  syncLog: 'fm_sync_log',
} as const;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or unavailable
  }
}

// --- Roster ---
export function getRoster(): RosterEntry[] {
  return read<RosterEntry[]>(KEYS.roster, []);
}

export function saveRoster(entries: RosterEntry[]): void {
  write(KEYS.roster, entries);
}

export function addRosterEntry(entry: RosterEntry): void {
  const roster = getRoster();
  roster.push(entry);
  saveRoster(roster);
}

export function removeRosterEntry(id: string): void {
  const roster = getRoster().filter((r) => r.id !== id);
  saveRoster(roster);
}

// --- Stats ---
export function getStats(): StatRow[] {
  return read<StatRow[]>(KEYS.stats, []);
}

export function saveStats(rows: StatRow[]): void {
  // Merge: upsert by nome+squadra
  const existing = getStats();
  const map = new Map(existing.map((r) => [`${r.nome}|${r.squadra}`, r]));
  for (const row of rows) {
    map.set(`${row.nome}|${row.squadra}`, row);
  }
  write(KEYS.stats, [...map.values()]);
}

// --- Standings ---
export function getStandings(): StandingRow[] {
  return read<StandingRow[]>(KEYS.standings, []);
}

export function saveStandings(rows: StandingRow[]): void {
  const existing = getStandings();
  const map = new Map(existing.map((r) => [r.squadra, r]));
  for (const row of rows) {
    map.set(row.squadra, row);
  }
  write(KEYS.standings, [...map.values()]);
}

// --- Coaches ---
export function getCoaches(): CoachRow[] {
  return read<CoachRow[]>(KEYS.coaches, []);
}

export function saveCoaches(rows: CoachRow[]): void {
  const existing = getCoaches();
  const map = new Map(existing.map((r) => [r.squadra, r]));
  for (const row of rows) {
    map.set(row.squadra, row);
  }
  write(KEYS.coaches, [...map.values()]);
}

// --- Formations ---
export function getFormations(): FormationRow[] {
  return read<FormationRow[]>(KEYS.formations, []);
}

export function saveFormations(rows: FormationRow[]): void {
  const existing = getFormations();
  const map = new Map(existing.map((r) => [`${r.matchday}|${r.squadra}`, r]));
  for (const row of rows) {
    map.set(`${row.matchday}|${r.squadra}`, row);
  }
  write(KEYS.formations, [...map.values()]);
}

// --- Injuries ---
export function getInjuries(): InjuryRow[] {
  return read<InjuryRow[]>(KEYS.injuries, []);
}

export function saveInjuries(rows: InjuryRow[]): void {
  const existing = getInjuries();
  const map = new Map(existing.map((r) => [`${r.matchday}|${r.squadra}`, r]));
  for (const row of rows) {
    map.set(`${row.matchday}|${r.squadra}`, row);
  }
  write(KEYS.injuries, [...map.values()]);
}

// --- Data Sources ---
export function getDataSources(): DataSourceRow[] {
  return read<DataSourceRow[]>(KEYS.sources, []);
}

export function saveDataSources(rows: DataSourceRow[]): void {
  write(KEYS.sources, rows);
}

export function upsertDataSource(row: DataSourceRow): void {
  const sources = getDataSources();
  const idx = sources.findIndex((s) => s.id === row.id);
  if (idx >= 0) {
    sources[idx] = row;
  } else {
    sources.push(row);
  }
  saveDataSources(sources);
}

export function deleteDataSource(id: string): void {
  saveDataSources(getDataSources().filter((s) => s.id !== id));
}

// --- Sync Log ---
export function getSyncLog(): SyncLogRow[] {
  return read<SyncLogRow[]>(KEYS.syncLog, []);
}

export function addSyncLog(source: string, status: string): void {
  const log = getSyncLog();
  log.unshift({
    id: crypto.randomUUID(),
    source,
    status,
    fetched_at: new Date().toISOString(),
  });
  // Keep last 50 entries
  write(KEYS.syncLog, log.slice(0, 50));
}

export function getLastSync(): SyncLogRow | null {
  const log = getSyncLog();
  return log.length > 0 ? log[0] : null;
}

// --- Initialize default data sources if empty ---
const DEFAULT_SOURCES: DataSourceRow[] = [
  { id: crypto.randomUUID(), source_key: 'formazioni', label: 'Probabili Formazioni', url: 'https://www.fantacalcio.it/probabili-formazioni-serie-a', parser_type: 'probabili_formazioni', enabled: true },
  { id: crypto.randomUUID(), source_key: 'infortunati', label: 'Infortunati', url: 'https://www.fantacalcio.it/infortunati-serie-a', parser_type: 'infortunati', enabled: true },
  { id: crypto.randomUUID(), source_key: 'stats', label: 'Statistiche giocatori', url: 'https://www.fantacalcio.it/statistiche-serie-a', parser_type: 'stats', enabled: true },
  { id: crypto.randomUUID(), source_key: 'allenatori', label: 'Allenatori (panchine)', url: 'https://sport.sky.it/calciomercato/allenatori-serie-a-2026-2027-situazione-panchine-squadre', parser_type: 'coaches', enabled: true },
  { id: crypto.randomUUID(), source_key: 'esonerati', label: 'Allenatori esonerati', url: 'https://sport.sky.it/calcio/serie-a/serie-a-2026-2027-allenatori-esonerati', parser_type: 'esonerati', enabled: true },
  { id: crypto.randomUUID(), source_key: 'classifica', label: 'Classifica', url: 'https://www.whoscored.com/regions/108/tournaments/5/seasons/11126/stages/25518/show/italy-serie-a-2026-2027', parser_type: 'standings', enabled: true },
];

export function ensureDefaultSources(): void {
  if (getDataSources().length === 0) {
    saveDataSources(DEFAULT_SOURCES);
  }
}

// --- Sync results (what the edge function returns) ---
export interface SyncResultData {
  formations?: FormationRow[];
  injuries?: InjuryRow[];
  stats?: StatRow[];
  coaches?: CoachRow[];
  standings?: StandingRow[];
}

export function applySyncResult(data: SyncResultData): void {
  if (data.formations && data.formations.length > 0) saveFormations(data.formations);
  if (data.injuries && data.injuries.length > 0) saveInjuries(data.injuries);
  if (data.stats && data.stats.length > 0) saveStats(data.stats);
  if (data.coaches && data.coaches.length > 0) saveCoaches(data.coaches);
  if (data.standings && data.standings.length > 0) saveStandings(data.standings);
}
