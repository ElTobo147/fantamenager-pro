// European competition fixtures for Italian teams in 2026-27 season
// Champions League: Inter, Napoli, Roma, Como
// Europa League: Milan, Juventus
// Conference League: Atalanta

export type EuroCompetition = 'CL' | 'EL' | 'Conference';

export interface EuroFixture {
  competition: EuroCompetition;
  matchday: number;
  date: string; // ISO date
  team: string;
  opponent: string;
  home: boolean;
}

// Champions League matchday dates (2026-27 league phase)
// MD1: 8-10 Sep, MD2: 13-14 Oct, MD3: 20-21 Oct, MD4: 3-4 Nov, MD5: 24-25 Nov, MD6: 8-9 Dec, MD7: 19-20 Jan, MD8: 27 Jan

// Europa League matchday dates
// MD1: 16-17 Sep, MD2: 15 Oct, MD3: 22 Oct, MD4: 5 Nov, MD5: 26 Nov, MD6: 10 Dec, MD7: 21 Jan, MD8: 28 Jan

// Conference League matchday dates (starts at MD1 in October for league phase)
// MD1: 15 Oct, MD2: 22 Oct, MD3: 5 Nov, MD4: 26 Nov, MD5: 10 Dec, MD6: 17 Dec

export const EURO_TEAMS: Record<string, EuroCompetition> = {
  Inter: 'CL',
  Napoli: 'CL',
  Roma: 'CL',
  Como: 'CL',
  Milan: 'EL',
  Juventus: 'EL',
  Atalanta: 'Conference',
};

// All European fixtures for Italian teams
export const EURO_FIXTURES: EuroFixture[] = [
  // Champions League - Inter
  { competition: 'CL', matchday: 1, date: '2026-09-08', team: 'Inter', opponent: 'Shakhtar Donetsk', home: true },
  { competition: 'CL', matchday: 2, date: '2026-10-13', team: 'Inter', opponent: 'Real Madrid', home: false },
  { competition: 'CL', matchday: 3, date: '2026-10-20', team: 'Inter', opponent: 'Manchester United', home: true },
  { competition: 'CL', matchday: 4, date: '2026-11-03', team: 'Inter', opponent: 'Feyenoord', home: false },
  { competition: 'CL', matchday: 5, date: '2026-11-24', team: 'Inter', opponent: 'Arsenal', home: false },
  { competition: 'CL', matchday: 6, date: '2026-12-08', team: 'Inter', opponent: 'Borussia Dortmund', home: true },
  { competition: 'CL', matchday: 7, date: '2027-01-19', team: 'Inter', opponent: 'Aston Villa', home: false },
  { competition: 'CL', matchday: 8, date: '2027-01-27', team: 'Inter', opponent: 'AEK Athens', home: true },

  // Champions League - Napoli
  { competition: 'CL', matchday: 1, date: '2026-09-08', team: 'Napoli', opponent: 'Galatasaray', home: true },
  { competition: 'CL', matchday: 2, date: '2026-10-13', team: 'Napoli', opponent: 'Villarreal', home: false },
  { competition: 'CL', matchday: 3, date: '2026-10-20', team: 'Napoli', opponent: 'Barcelona', home: true },
  { competition: 'CL', matchday: 4, date: '2026-11-03', team: 'Napoli', opponent: 'Porto', home: false },
  { competition: 'CL', matchday: 5, date: '2026-11-24', team: 'Napoli', opponent: 'Manchester City', home: false },
  { competition: 'CL', matchday: 6, date: '2026-12-08', team: 'Napoli', opponent: 'RB Leipzig', home: true },
  { competition: 'CL', matchday: 7, date: '2027-01-19', team: 'Napoli', opponent: 'Sabah FK', home: false },
  { competition: 'CL', matchday: 8, date: '2027-01-27', team: 'Napoli', opponent: 'Real Betis', home: true },

  // Champions League - Roma
  { competition: 'CL', matchday: 1, date: '2026-09-08', team: 'Roma', opponent: 'Fenerbahce', home: false },
  { competition: 'CL', matchday: 2, date: '2026-10-13', team: 'Roma', opponent: 'Real Madrid', home: true },
  { competition: 'CL', matchday: 3, date: '2026-10-20', team: 'Roma', opponent: 'Slovan Bratislava', home: true },
  { competition: 'CL', matchday: 4, date: '2026-11-03', team: 'Roma', opponent: 'Manchester United', home: false },
  { competition: 'CL', matchday: 5, date: '2026-11-24', team: 'Roma', opponent: 'PSG', home: false },
  { competition: 'CL', matchday: 6, date: '2026-12-08', team: 'Roma', opponent: 'Sporting Lisbon', home: true },
  { competition: 'CL', matchday: 7, date: '2027-01-19', team: 'Roma', opponent: 'AEK Athens', home: false },
  { competition: 'CL', matchday: 8, date: '2027-01-27', team: 'Roma', opponent: 'Lille', home: true },

  // Champions League - Como
  { competition: 'CL', matchday: 1, date: '2026-09-08', team: 'Como', opponent: 'Shakhtar Donetsk', home: false },
  { competition: 'CL', matchday: 2, date: '2026-10-13', team: 'Como', opponent: 'Atlético Madrid', home: true },
  { competition: 'CL', matchday: 3, date: '2026-10-20', team: 'Como', opponent: 'Feyenoord', home: false },
  { competition: 'CL', matchday: 4, date: '2026-11-03', team: 'Como', opponent: 'Manchester City', home: false },
  { competition: 'CL', matchday: 5, date: '2026-11-24', team: 'Como', opponent: 'Borussia Dortmund', home: false },
  { competition: 'CL', matchday: 6, date: '2026-12-08', team: 'Como', opponent: 'Real Betis', home: true },
  { competition: 'CL', matchday: 7, date: '2027-01-19', team: 'Como', opponent: 'Lens', home: false },
  { competition: 'CL', matchday: 8, date: '2027-01-27', team: 'Como', opponent: 'AEK Athens', home: false },

  // Europa League - Milan
  { competition: 'EL', matchday: 1, date: '2026-09-16', team: 'Milan', opponent: 'Lyon', home: true },
  { competition: 'EL', matchday: 2, date: '2026-10-15', team: 'Milan', opponent: 'Ajax', home: false },
  { competition: 'EL', matchday: 3, date: '2026-10-22', team: 'Milan', opponent: 'Rangers', home: true },
  { competition: 'EL', matchday: 4, date: '2026-11-05', team: 'Milan', opponent: 'Lazio Moscow', home: false },
  { competition: 'EL', matchday: 5, date: '2026-11-26', team: 'Milan', opponent: 'Sevilla', home: true },
  { competition: 'EL', matchday: 6, date: '2026-12-10', team: 'Milan', opponent: 'Olympiacos', home: false },
  { competition: 'EL', matchday: 7, date: '2027-01-21', team: 'Milan', opponent: 'Fenerbahce', home: true },
  { competition: 'EL', matchday: 8, date: '2027-01-28', team: 'Milan', opponent: 'Braga', home: false },

  // Europa League - Juventus
  { competition: 'EL', matchday: 1, date: '2026-09-16', team: 'Juventus', opponent: 'Benfica', home: true },
  { competition: 'EL', matchday: 2, date: '2026-10-15', team: 'Juventus', opponent: 'Porto', home: false },
  { competition: 'EL', matchday: 3, date: '2026-10-22', team: 'Juventus', opponent: 'Celtic', home: true },
  { competition: 'EL', matchday: 4, date: '2026-11-05', team: 'Juventus', opponent: 'Lyon', home: false },
  { competition: 'EL', matchday: 5, date: '2026-11-26', team: 'Juventus', opponent: 'Rangers', home: true },
  { competition: 'EL', matchday: 6, date: '2026-12-10', team: 'Juventus', opponent: 'Sevilla', home: false },
  { competition: 'EL', matchday: 7, date: '2027-01-21', team: 'Juventus', opponent: 'Ajax', home: true },
  { competition: 'EL', matchday: 8, date: '2027-01-28', team: 'Juventus', opponent: 'Olympiacos', home: false },

  // Conference League - Atalanta
  { competition: 'Conference', matchday: 1, date: '2026-10-15', team: 'Atalanta', opponent: 'Basel', home: true },
  { competition: 'Conference', matchday: 2, date: '2026-10-22', team: 'Atalanta', opponent: 'Copenhagen', home: false },
  { competition: 'Conference', matchday: 3, date: '2026-11-05', team: 'Atalanta', opponent: 'Legia Warsaw', home: true },
  { competition: 'Conference', matchday: 4, date: '2026-11-26', team: 'Atalanta', opponent: 'Jagiellonia', home: false },
  { competition: 'Conference', matchday: 5, date: '2026-12-10', team: 'Atalanta', opponent: 'Olimpija', home: true },
  { competition: 'Conference', matchday: 6, date: '2026-12-17', team: 'Atalanta', opponent: 'Helsinki', home: false },
];

/**
 * Get European fixtures for a team around a given Serie A matchday date.
 * Returns fixtures within 4 days before or after the Serie A match date.
 */
export function getEuroFixturesAroundDate(team: string, serieADate: string): EuroFixture[] {
  const matchTime = new Date(serieADate).getTime();
  const FOUR_DAYS = 4 * 24 * 60 * 60 * 1000;

  return EURO_FIXTURES.filter(
    (f) => f.team === team && Math.abs(new Date(f.date).getTime() - matchTime) <= FOUR_DAYS,
  );
}

/**
 * Get the nearest European fixture for a team around a Serie A matchday.
 */
export function getNearestEuroFixture(team: string, serieADate: string): EuroFixture | null {
  const fixtures = getEuroFixturesAroundDate(team, serieADate);
  if (fixtures.length === 0) return null;

  const matchTime = new Date(serieADate).getTime();
  return fixtures.reduce((nearest, f) => {
    const dist = Math.abs(new Date(f.date).getTime() - matchTime);
    const nearestDist = Math.abs(new Date(nearest.date).getTime() - matchTime);
    return dist < nearestDist ? f : nearest;
  });
}

/**
 * Calculate turnover risk for a team on a given Serie A matchday.
 * Returns 0 (no risk) to 1 (maximum risk).
 * If a team has a European match within 4 days, risk is high.
 */
export function getTurnoverRisk(team: string, serieAMatchDate: string): {
  risk: number;
  fixture: EuroFixture | null;
  daysBetween: number | null;
} {
  const nearest = getNearestEuroFixture(team, serieAMatchDate);
  if (!nearest) return { risk: 0, fixture: null, daysBetween: null };

  const serieATime = new Date(serieAMatchDate).getTime();
  const euroTime = new Date(nearest.date).getTime();
  const daysBetween = Math.abs(euroTime - serieATime) / (24 * 60 * 60 * 1000);

  // Within 1 day: maximum turnover risk
  // 2 days: high risk
  // 3 days: moderate risk
  // 4 days: low risk
  let risk = 0;
  if (daysBetween <= 1) risk = 0.85;
  else if (daysBetween <= 2) risk = 0.65;
  else if (daysBetween <= 3) risk = 0.40;
  else if (daysBetween <= 4) risk = 0.20;

  // European match is AFTER the Serie A match: slightly less risk
  // (teams more likely to rest key players to prepare for European match)
  if (euroTime > serieATime) risk *= 1.1; // pre-European rotation
  else risk *= 0.9; // post-European fatigue

  return {
    risk: Math.min(risk, 1),
    fixture: nearest,
    daysBetween: parseFloat(daysBetween.toFixed(1)),
  };
}

export function isEuroTeam(team: string): boolean {
  return team in EURO_TEAMS;
}

export function getTeamCompetition(team: string): EuroCompetition | null {
  return EURO_TEAMS[team] ?? null;
}
