// Match predictions model combining real odds data from Oddspedia, Eurobet,
// Sisal, and CommentieriRecensioni with a Poisson-based statistical model.
// When real bookmaker odds are available (realOdds.ts), they take priority.
// The Poisson model fills gaps for matches without extracted odds.

import { TEAM_METRICS } from '../constants';
import type { Calendario, TeamTier } from '../types';
import { getRealOdds } from './realOdds';

export interface MatchPrediction {
  home: string;
  away: string;
  homeWinProb: number; // 0-1
  drawProb: number;
  awayWinProb: number;
  over25Prob: number; // probability of over 2.5 goals
  bttsProb: number; // both teams to score
  expectedGoalsHome: number;
  expectedGoalsAway: number;
  homeConcedeProb: number; // probability home team concedes 1.5+ goals
  awayConcedeProb: number; // probability away team concedes 1.5+ goals
  source: string;
}

// Team tier to strength mapping (0-1 scale)
const TIER_STRENGTH: Record<TeamTier, number> = {
  S: 0.92,
  A: 0.78,
  B: 0.62,
  C: 0.45,
  D: 0.30,
};

// Home advantage
const HOME_ADVANTAGE = 0.15;

// Default xG per team if not in TEAM_METRICS
const DEFAULT_XG = 9.0;

/**
 * Poisson probability of scoring exactly k goals given expected value lambda
 */
function poissonProb(k: number, lambda: number): number {
  return Math.exp(-lambda) * Math.pow(lambda, k) / factorial(k);
}

function factorial(n: number): number {
  if (n <= 1) return 1;
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

/**
 * Probability of over 2.5 goals given two expected values
 */
function over25Prob(lambdaHome: number, lambdaAway: number): number {
  let prob = 0;
  for (let h = 0; h <= 8; h++) {
    for (let a = 0; a <= 8; a++) {
      if (h + a > 2.5) {
        prob += poissonProb(h, lambdaHome) * poissonProb(a, lambdaAway);
      }
    }
  }
  return prob;
}

/**
 * Probability both teams score at least 1
 */
function bttsProb(lambdaHome: number, lambdaAway: number): number {
  let prob = 0;
  for (let h = 1; h <= 8; h++) {
    for (let a = 1; a <= 8; a++) {
      prob += poissonProb(h, lambdaHome) * poissonProb(a, lambdaAway);
    }
  }
  return prob;
}

/**
 * Probability a team concedes 1.5+ goals (i.e. opponent scores 2+)
 */
function concede15Prob(lambdaOpponent: number): number {
  let prob = 0;
  for (let k = 2; k <= 8; k++) {
    prob += poissonProb(k, lambdaOpponent);
  }
  return prob;
}

/**
 * Calculate win/draw/loss probabilities using Poisson model
 */
function matchOutcomeProbs(lambdaHome: number, lambdaAway: number): {
  home: number; draw: number; away: number;
} {
  let home = 0, draw = 0, away = 0;
  for (let h = 0; h <= 8; h++) {
    for (let a = 0; a <= 8; a++) {
      const p = poissonProb(h, lambdaHome) * poissonProb(a, lambdaAway);
      if (h > a) home += p;
      else if (h === a) draw += p;
      else away += p;
    }
  }
  return { home, draw, away };
}

/**
 * Generate a prediction for a single match.
 * Uses team xG metrics as base, adjusts for home/away, and produces
 * probabilities in the style of Forebet (1X2, O/U 2.5, BTTS).
 */
export function predictMatch(
  home: string,
  away: string,
  homeTier: TeamTier,
  awayTier: TeamTier,
): MatchPrediction {
  // Check for real bookmaker odds first
  const real = getRealOdds(home, away, 8); // G8 is the current matchday
  if (real) {
    return {
      home,
      away,
      homeWinProb: real.homeWinProb,
      drawProb: real.drawProb,
      awayWinProb: real.awayWinProb,
      over25Prob: real.over25Prob,
      bttsProb: real.bttsProb,
      expectedGoalsHome: parseFloat((real.homeWinProb * 2.5).toFixed(2)),
      expectedGoalsAway: parseFloat((real.awayWinProb * 2.5).toFixed(2)),
      homeConcedeProb: real.homeConcedeProb,
      awayConcedeProb: real.awayConcedeProb,
      source: real.source,
    };
  }

  // Fall back to Poisson model for matches without real odds
  const homeXG = TEAM_METRICS[home]?.xG ?? DEFAULT_XG;
  const awayXG = TEAM_METRICS[away]?.xG ?? DEFAULT_XG;

  // Convert team xG (season total ~8 matchdays) to per-match expected
  const homePerMatch = homeXG / 8;
  const awayPerMatch = awayXG / 8;

  // Adjust for tier difference
  const homeStrength = TIER_STRENGTH[homeTier];
  const awayStrength = TIER_STRENGTH[awayTier];
  const strengthRatio = homeStrength / (homeStrength + awayStrength);

  // Expected goals: base from team xG, adjusted by relative strength and home advantage
  const lambdaHome = Math.max(0.3, homePerMatch * (0.7 + strengthRatio * 0.6) * (1 + HOME_ADVANTAGE));
  const lambdaAway = Math.max(0.2, awayPerMatch * (0.7 + (1 - strengthRatio) * 0.6) * (1 - HOME_ADVANTAGE * 0.5));

  const outcome = matchOutcomeProbs(lambdaHome, lambdaAway);
  const o25 = over25Prob(lambdaHome, lambdaAway);
  const btts = bttsProb(lambdaHome, lambdaAway);
  const homeConcede = concede15Prob(lambdaAway);
  const awayConcede = concede15Prob(lambdaHome);

  return {
    home,
    away,
    homeWinProb: parseFloat(outcome.home.toFixed(2)),
    drawProb: parseFloat(outcome.draw.toFixed(2)),
    awayWinProb: parseFloat(outcome.away.toFixed(2)),
    over25Prob: parseFloat(o25.toFixed(2)),
    bttsProb: parseFloat(btts.toFixed(2)),
    expectedGoalsHome: parseFloat(lambdaHome.toFixed(2)),
    expectedGoalsAway: parseFloat(lambdaAway.toFixed(2)),
    homeConcedeProb: parseFloat(homeConcede.toFixed(2)),
    awayConcedeProb: parseFloat(awayConcede.toFixed(2)),
    source: 'Poisson model (statistico)',
  };
}

/**
 * Get predictions for all matches in a matchday.
 */
export function getMatchdayPredictions(
  matches: { home: string; away: string }[],
  calendario: Calendario,
  getTier: (team: string, calendario: Calendario) => TeamTier,
): MatchPrediction[] {
  return matches.map((m) => {
    const homeTier = getTier(m.home, calendario);
    const awayTier = getTier(m.away, calendario);
    return predictMatch(m.home, m.away, homeTier, awayTier);
  });
}

/**
 * Get the prediction for a specific team's match in a matchday.
 */
export function getTeamPrediction(
  team: string,
  calendario: Calendario,
  getTier: (team: string, calendario: Calendario) => TeamTier,
): MatchPrediction | null {
  const match = calendario[team];
  if (!match) return null;

  const homeTier = match.casa ? getTier(team, calendario) : getTier(match.avversario, calendario);
  const awayTier = match.casa ? getTier(match.avversario, calendario) : getTier(team, calendario);

  const home = match.casa ? team : match.avversario;
  const away = match.casa ? match.avversario : team;

  return predictMatch(home, away, homeTier, awayTier);
}
