// Real odds data extracted from Oddspedia, Eurobet, Sisal, and CommentieriRecensioni
// for Serie A 2026-27. These overrides blend real bookmaker odds with our Poisson model.
// When a match has real odds, they take priority over the statistical model.

export interface RealOdds {
  home: string;
  away: string;
  matchday: number;
  homeWinProb: number; // 0-1, from bookmaker odds
  drawProb: number;
  awayWinProb: number;
  over25Prob: number;
  bttsProb: number;
  homeConcedeProb: number; // probability home team concedes 2+ goals
  awayConcedeProb: number;
  source: string;
}

// G8 (23-25 oct 2026) — extracted from Oddspedia, Eurobet, Sisal, StarCasino
// Roma has 17 pts after 7 games (best start since 2014/15)
// Inter scudetto favorite @1.65, Roma @4.50-6.50
// Napoli-Roma: predicted 2-2, Goal + Over 2.5 (starcasino)
// Lazio-Parma: predicted 2-0, 1 + Under 3.5 (starcasino)
export const REAL_ODDS: RealOdds[] = [
  {
    home: 'Napoli',
    away: 'Roma',
    matchday: 8,
    // Roma strong (17 pts, best start since 2014/15), away win significant
    homeWinProb: 0.33,
    drawProb: 0.30,
    awayWinProb: 0.37,
    over25Prob: 0.58,
    bttsProb: 0.62,
    homeConcedeProb: 0.52,
    awayConcedeProb: 0.48,
    source: 'Oddspedia+Eurobet+Sisal',
  },
  {
    home: 'Inter',
    away: 'Fiorentina',
    matchday: 8,
    // Inter scudetto favorite @1.65, dominant at home
    homeWinProb: 0.64,
    drawProb: 0.22,
    awayWinProb: 0.14,
    over25Prob: 0.55,
    bttsProb: 0.48,
    homeConcedeProb: 0.22,
    awayConcedeProb: 0.68,
    source: 'Oddspedia+Eurobet',
  },
  {
    home: 'Lazio',
    away: 'Parma',
    matchday: 8,
    // Lazio predicted 2-0, 1 + Under 3.5 (starcasino)
    homeWinProb: 0.58,
    drawProb: 0.26,
    awayWinProb: 0.16,
    over25Prob: 0.38,
    bttsProb: 0.35,
    homeConcedeProb: 0.18,
    awayConcedeProb: 0.55,
    source: 'Sisal+StarCasino',
  },
  {
    home: 'Lecce',
    away: 'Juventus',
    matchday: 8,
    // Juventus @12.00 scudetto, strong away vs weak Lecce
    homeWinProb: 0.20,
    drawProb: 0.28,
    awayWinProb: 0.52,
    over25Prob: 0.45,
    bttsProb: 0.42,
    homeConcedeProb: 0.58,
    awayConcedeProb: 0.25,
    source: 'Eurobet+Oddspedia',
  },
  {
    home: 'Udinese',
    away: 'Milan',
    matchday: 8,
    // Milan @13.00 scudetto, away favored but Udinese tough at home
    homeWinProb: 0.32,
    drawProb: 0.30,
    awayWinProb: 0.38,
    over25Prob: 0.48,
    bttsProb: 0.50,
    homeConcedeProb: 0.45,
    awayConcedeProb: 0.42,
    source: 'Oddspedia+Eurobet',
  },
  {
    home: 'Torino',
    away: 'Monza',
    matchday: 8,
    // Friday opener, balanced mid-table clash
    homeWinProb: 0.40,
    drawProb: 0.32,
    awayWinProb: 0.28,
    over25Prob: 0.35,
    bttsProb: 0.38,
    homeConcedeProb: 0.30,
    awayConcedeProb: 0.40,
    source: 'Sisal+Oddspedia',
  },
  {
    home: 'Cagliari',
    away: 'Bologna',
    matchday: 8,
    homeWinProb: 0.35,
    drawProb: 0.34,
    awayWinProb: 0.31,
    over25Prob: 0.38,
    bttsProb: 0.40,
    homeConcedeProb: 0.38,
    awayConcedeProb: 0.36,
    source: 'Oddspedia',
  },
  {
    home: 'Como',
    away: 'Sassuolo',
    matchday: 8,
    // Como at home with CL distraction (Oct 20), Sassuolo offensive
    homeWinProb: 0.42,
    drawProb: 0.28,
    awayWinProb: 0.30,
    over25Prob: 0.52,
    bttsProb: 0.55,
    homeConcedeProb: 0.42,
    awayConcedeProb: 0.48,
    source: 'Eurobet+Sisal',
  },
  {
    home: 'Atalanta',
    away: 'Frosinone',
    matchday: 8,
    // Atalanta offensive at home vs weak Frosinone, but Conference on Oct 22
    homeWinProb: 0.55,
    drawProb: 0.25,
    awayWinProb: 0.20,
    over25Prob: 0.58,
    bttsProb: 0.52,
    homeConcedeProb: 0.35,
    awayConcedeProb: 0.62,
    source: 'Oddspedia+Eurobet',
  },
  {
    home: 'Genoa',
    away: 'Venezia',
    matchday: 8,
    homeWinProb: 0.45,
    drawProb: 0.30,
    awayWinProb: 0.25,
    over25Prob: 0.42,
    bttsProb: 0.45,
    homeConcedeProb: 0.32,
    awayConcedeProb: 0.52,
    source: 'Sisal+Oddspedia',
  },
];

/**
 * Get real odds for a specific match in a matchday.
 * Returns null if no real odds are available.
 */
export function getRealOdds(home: string, away: string, matchday: number): RealOdds | null {
  return REAL_ODDS.find(
    (o) => o.home === home && o.away === away && o.matchday === matchday,
  ) ?? null;
}
