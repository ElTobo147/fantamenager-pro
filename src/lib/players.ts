import type { Player, Calendario, TeamTier, CoachInfo, PlayerStatsData } from '../types';
import { TEAM_METRICS } from '../constants';
import { getTitolarita, INJURED_VALUE } from '../data/titolarita';
import { getTurnoverRisk, isEuroTeam, getTeamCompetition } from '../data/europeanFixtures';
import { getTeamPrediction } from '../data/predictions';
import { getMatchdayDate } from '../data/calendar';

export const TEAM_TIERS: Record<string, TeamTier> = {
  Inter: 'S', Roma: 'S', Napoli: 'S',
  Juventus: 'A', Milan: 'A', Lazio: 'A', Atalanta: 'A',
  Fiorentina: 'B', Bologna: 'B', Como: 'B', Udinese: 'B',
  Sassuolo: 'C', Genoa: 'C', Monza: 'C', Cagliari: 'C', Torino: 'C',
  Frosinone: 'D', Parma: 'D', Lecce: 'D', Venezia: 'D',
};

export const COACHES: Record<string, CoachInfo> = {
  // Offensivi
  Atalanta: { squadra: 'Atalanta', allenatore: 'Maurizio Sarri', stile: 'offensivo' },
  Como: { squadra: 'Como', allenatore: 'Cesc Fàbregas', stile: 'offensivo' },
  Juventus: { squadra: 'Juventus', allenatore: 'Luciano Spalletti', stile: 'offensivo' },
  Lecce: { squadra: 'Lecce', allenatore: 'Eusebio Di Francesco', stile: 'offensivo' },
  Milan: { squadra: 'Milan', allenatore: 'Rúben Amorim', stile: 'offensivo' },
  Roma: { squadra: 'Roma', allenatore: 'Gian Piero Gasperini', stile: 'offensivo' },
  Sassuolo: { squadra: 'Sassuolo', allenatore: 'Alberto Aquilani', stile: 'offensivo' },
  // Equilibrati
  Bologna: { squadra: 'Bologna', allenatore: 'Raffaele Palladino', stile: 'bilanciato' },
  Cagliari: { squadra: 'Cagliari', allenatore: 'Fabio Pisacane', stile: 'bilanciato' },
  Fiorentina: { squadra: 'Fiorentina', allenatore: 'Paolo Vanoli', stile: 'bilanciato' },
  Genoa: { squadra: 'Genoa', allenatore: 'Daniele De Rossi', stile: 'bilanciato' },
  Inter: { squadra: 'Inter', allenatore: 'Cristian Chivu', stile: 'bilanciato' },
  Parma: { squadra: 'Parma', allenatore: 'Alberto Gilardino', stile: 'bilanciato' },
  Torino: { squadra: 'Torino', allenatore: 'Ignazio Abate', stile: 'bilanciato' },
  Venezia: { squadra: 'Venezia', allenatore: 'Davide Nicola', stile: 'bilanciato' },
  // Difensivi
  Frosinone: { squadra: 'Frosinone', allenatore: 'Massimiliano Alvini', stile: 'difensivo' },
  Lazio: { squadra: 'Lazio', allenatore: 'Gennaro Gattuso', stile: 'difensivo' },
  Monza: { squadra: 'Monza', allenatore: 'Ivan Jurić', stile: 'difensivo' },
  Napoli: { squadra: 'Napoli', allenatore: 'Massimiliano Allegri', stile: 'difensivo' },
  Udinese: { squadra: 'Udinese', allenatore: 'Kosta Runjaić', stile: 'difensivo' },
};

const TIER_STRENGTH: Record<TeamTier, number> = {
  S: 1.0,
  A: 0.8,
  B: 0.6,
  C: 0.4,
  D: 0.2,
};

function tierOf(team: string): TeamTier {
  return TEAM_TIERS[team] ?? 'C';
}

function opponentModifier(playerTeam: string, opponent: string, isHome: boolean): number {
  const oppTier = tierOf(opponent);
  const oppStrength = TIER_STRENGTH[oppTier];
  // Facing a top team reduces expected points; facing weak teams increases
  let mod = (0.5 - oppStrength) * 2; // ranges from -1.5 (vs S) to +1.6 (vs D)
  // Home advantage reduces penalty / increases bonus
  if (isHome) mod += 0.3;
  else mod -= 0.2;
  return mod;
}

function coachModifier(playerTeam: string, ruolo: Player['ruolo']): number {
  const coach = COACHES[playerTeam];
  if (!coach) return 0;
  if (coach.stile === 'offensivo') {
    if (ruolo === 'A') return 0.8;
    if (ruolo === 'C') return 0.4;
    if (ruolo === 'D') return -0.2;
    if (ruolo === 'P') return -0.3;
  }
  if (coach.stile === 'difensivo') {
    if (ruolo === 'D') return 0.6;
    if (ruolo === 'P') return 0.5;
    if (ruolo === 'A') return -0.5;
    if (ruolo === 'C') return -0.1;
  }
  if (coach.stile === 'bilanciato') {
    if (ruolo === 'D') return 0.3;
    if (ruolo === 'P') return 0.2;
    if (ruolo === 'C') return 0.15;
    if (ruolo === 'A') return -0.1;
  }
  return 0;
}

export function calcolaXfp(
  giocatore: Player,
  calendario: Calendario,
  matchdayNum: number,
): number {
  const partita = calendario[giocatore.squadra];

  // If no match (riposo), player can't score
  if (!partita) return 0;

  // Injured = 0
  const titolarita = getTitolarita(matchdayNum, giocatore.nome, giocatore.squadra);
  if (titolarita === INJURED_VALUE) return 0;

  const isHome = partita.casa;
  const opponent = partita.avversario;

  // Base from quotazione
  let xfp = giocatore.qt * 0.15;

  // xG / xA contribution
  const stats = giocatore.stats;
  if (stats) {
    if (giocatore.ruolo === 'A') {
      xfp += stats.xg * 1.2 + stats.xa * 0.6;
    } else if (giocatore.ruolo === 'C') {
      xfp += stats.xg * 0.8 + stats.xa * 1.0;
    } else if (giocatore.ruolo === 'D') {
      xfp += stats.xg * 0.5 + stats.xa * 0.3;
    } else {
      xfp += stats.xg * 0.3;
    }
  }

  // Team metrics
  const metrics = TEAM_METRICS[giocatore.squadra];
  if (metrics) {
    xfp += (metrics.xG - 9.4) * 0.2;
    xfp += (metrics.goals - 9) * 0.08;
  }

  // Home/away + opponent tier
  xfp += opponentModifier(giocatore.squadra, opponent, isHome);

  // Coach style
  xfp += coachModifier(giocatore.squadra, giocatore.ruolo);

  // --- Rischio Turnover (Coppe Europee) ---
  // Se la squadra gioca una partita europea entro 4 giorni, riduci xFP
  const matchDate = getMatchdayDate(matchdayNum);
  if (isEuroTeam(giocatore.squadra)) {
    const turnover = getTurnoverRisk(giocatore.squadra, matchDate);
    if (turnover.risk > 0) {
      // Il turnover colpisce più forte i titolari "importanti" che potrebbero essere riposati
      // Portieri e difensori sono più colpiti (rotazione difensiva frequente)
      let turnoverPenalty = turnover.risk;
      if (giocatore.ruolo === 'P') turnoverPenalty *= 1.0;
      else if (giocatore.ruolo === 'D') turnoverPenalty *= 0.9;
      else if (giocatore.ruolo === 'C') turnoverPenalty *= 0.7;
      else if (giocatore.ruolo === 'A') turnoverPenalty *= 0.6;

      // Applica il malus: riduce l'xFP proporzionalmente al rischio
      xfp *= (1 - turnoverPenalty);
    }
  }

  // --- Impatto Pronostici (Forebet/NerdyTips) ---
  // Se la squadra del giocatore ha alta probabilità di subire 1.5+ gol,
  // applica un forte malus a portieri e difensori
  const prediction = getTeamPrediction(giocatore.squadra, calendario, tierOf);
  if (prediction) {
    const isHome = partita.casa;
    const concedeProb = isHome ? prediction.homeConcedeProb : prediction.awayConcedeProb;

    // Soglia: se probabilità di subire 2+ gol > 35%, applica malus difensivo
    if (concedeProb > 0.35) {
      const concedeExcess = (concedeProb - 0.35) / 0.65; // normalizza 0-1
      if (giocatore.ruolo === 'P') {
        xfp *= (1 - concedeExcess * 0.50); // fino a -50% per portieri
      } else if (giocatore.ruolo === 'D') {
        xfp *= (1 - concedeExcess * 0.40); // fino a -40% per difensori
      }
    }

    // Bonus per attaccanti se la loro squadra ha alta probabilità di segnare
    // (il pronostico indica che la squadra avversaria subisce molti gol)
    const opponentConcede = isHome ? prediction.awayConcedeProb : prediction.homeConcedeProb;
    if (giocatore.ruolo === 'A' && opponentConcede > 0.35) {
      const scoringExcess = (opponentConcede - 0.35) / 0.65;
      xfp *= (1 + scoringExcess * 0.30); // fino a +30% per attaccanti
    } else if (giocatore.ruolo === 'C' && opponentConcede > 0.40) {
      const scoringExcess = (opponentConcede - 0.40) / 0.60;
      xfp *= (1 + scoringExcess * 0.15); // fino a +15% per centrocampisti
    }
  }

  // Titolarita multiplier
  xfp *= titolarita;

  // Bonus
  xfp += giocatore.bonus;

  return Math.max(0, xfp);
}

export function formatXfp(giocatore: Player, calendario: Calendario, matchdayNum: number): string {
  return calcolaXfp(giocatore, calendario, matchdayNum).toFixed(1);
}

export function sortByXfp(players: Player[], calendario: Calendario, matchdayNum: number): Player[] {
  return [...players].sort(
    (a, b) => calcolaXfp(b, calendario, matchdayNum) - calcolaXfp(a, calendario, matchdayNum),
  );
}

export function matchLabel(squadra: string, calendario: Calendario): string {
  const partita = calendario[squadra];
  if (!partita) return 'Riposo';
  return partita.casa ? `vs ${partita.avversario} (Casa)` : `@ ${partita.avversario} (Trasf.)`;
}

export function opponentTierLabel(squadra: string, calendario: Calendario): string {
  const partita = calendario[squadra];
  if (!partita) return '';
  const tier = tierOf(partita.avversario);
  const labels: Record<TeamTier, string> = { S: 'Top', A: 'Forte', B: 'Medio', C: 'Debole', D: 'Mini' };
  return labels[tier];
}

export function randomBonus(): number {
  return parseFloat((Math.random() * 2 - 0.5).toFixed(1));
}

// --- Funzioni esportate per UI: Rischio Turnover e Pronostici ---

export function getTeamTurnoverRisk(squadra: string, matchdayNum: number): {
  risk: number;
  competition: string | null;
  opponent: string | null;
  daysBetween: number | null;
} {
  if (!isEuroTeam(squadra)) {
    return { risk: 0, competition: null, opponent: null, daysBetween: null };
  }
  const matchDate = getMatchdayDate(matchdayNum);
  const turnover = getTurnoverRisk(squadra, matchDate);
  const comp = getTeamCompetition(squadra);
  return {
    risk: turnover.risk,
    competition: comp,
    opponent: turnover.fixture?.opponent ?? null,
    daysBetween: turnover.daysBetween,
  };
}

export function getTeamMatchPrediction(squadra: string, calendario: Calendario) {
  return getTeamPrediction(squadra, calendario, tierOf);
}

export { isEuroTeam, getTeamCompetition };
