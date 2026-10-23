import { useMemo } from 'react';
import { TrendingUp, AlertTriangle, Trophy, Shield, Target, Activity, Star, Flame } from 'lucide-react';
import type { Player, Calendario } from '../types';
import { getTeamTurnoverRisk, isEuroTeam, getTeamCompetition, TEAM_TIERS } from '../lib/players';
import { SERIE_A_TEAMS } from '../constants';
import { CALENDAR } from '../data/calendar';
import { predictMatch } from '../data/predictions';
import { getTeamForm, getFormColor, getFormLabel, formRatingColor } from '../data/teamForm';

interface Props {
  players: Player[];
  calendario: Calendario;
  matchdayNum: number;
}

const COMP_LABELS: Record<string, string> = {
  CL: 'Champions League',
  EL: 'Europa League',
  Conference: 'Conference League',
};

const COMP_COLORS: Record<string, string> = {
  CL: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  EL: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
  Conference: 'bg-green-500/20 text-green-300 border-green-500/40',
};

function riskColor(risk: number): string {
  if (risk >= 0.65) return 'text-red-400 bg-red-500/10 border-red-500/30';
  if (risk >= 0.35) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
  if (risk > 0) return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
  return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
}

function riskLabel(risk: number): string {
  if (risk >= 0.65) return 'Altissimo';
  if (risk >= 0.35) return 'Alto';
  if (risk > 0) return 'Moderato';
  return 'Nessuno';
}

function probBarColor(prob: number): string {
  const pct = Math.round(prob * 100);
  if (pct >= 60) return 'bg-green-500';
  if (pct >= 40) return 'bg-yellow-500';
  if (pct >= 25) return 'bg-orange-500';
  return 'bg-red-500';
}

function tierColor(tier: string): string {
  const colors: Record<string, string> = {
    S: 'text-green-400', A: 'text-blue-400', B: 'text-yellow-400', C: 'text-orange-400', D: 'text-red-400',
  };
  return colors[tier] ?? 'text-gray-400';
}

export default function MatchInsights({ players, calendario, matchdayNum }: Props) {
  const rosterTeams = useMemo(
    () => [...new Set(players.map((p) => p.squadra))],
    [players],
  );

  const matchday = CALENDAR.find((m) => m.num === matchdayNum);
  const allMatches = matchday?.matches ?? [];

  // All matchday predictions (Forebet-style: every match)
  const allPredictions = useMemo(() => {
    return allMatches.map((m) => {
      const pred = predictMatch(m.home, m.away, TEAM_TIERS[m.home] ?? 'C', TEAM_TIERS[m.away] ?? 'C');
      const homeTurnover = getTeamTurnoverRisk(m.home, matchdayNum);
      const awayTurnover = getTeamTurnoverRisk(m.away, matchdayNum);
      const rosterRelevant = rosterTeams.includes(m.home) || rosterTeams.includes(m.away);
      return {
        ...m,
        pred,
        homeTurnover,
        awayTurnover,
        rosterRelevant,
      };
    });
  }, [allMatches, matchdayNum, rosterTeams]);

  // Team form data (WhoScored-style)
  const rosterForms = useMemo(() => {
    return rosterTeams.map((team) => getTeamForm(team));
  }, [rosterTeams]);

  const euroTeamsPlaying = allPredictions.filter(
    (m) => m.homeTurnover.risk > 0 || m.awayTurnover.risk > 0,
  );

  if (rosterTeams.length === 0) {
    return (
      <div className="text-center py-16">
        <TrendingUp className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <p className="text-lg text-gray-400 mb-2">Nessun dato da mostrare</p>
        <p className="text-sm text-gray-500">Aggiungi giocatori alla rosa per visualizzare pronostici e forma</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* === FOREBET: Pronostici Partite === */}
      <div className="bg-gray-800/60 rounded-xl border border-gray-700/50 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-700/50 bg-gray-800/80">
          <TrendingUp className="w-5 h-5 text-green-400" />
          <h3 className="font-bold text-sm text-white">Pronostici Giornata {matchdayNum} — Quote Reali</h3>
          <span className="text-xs text-gray-500 ml-auto">Oddspedia · Eurobet · Sisal · 1X2 · O/U 2.5 · Subisce 2+</span>
        </div>

        {/* Table for all matches */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400 border-b border-gray-700/40">
                <th className="text-left px-3 py-2 font-medium">Partita</th>
                <th className="px-2 py-2 font-medium">1</th>
                <th className="px-2 py-2 font-medium">X</th>
                <th className="px-2 py-2 font-medium">2</th>
                <th className="px-2 py-2 font-medium">O 2.5</th>
                <th className="px-2 py-2 font-medium">Gol 2+</th>
                <th className="px-2 py-2 font-medium">Turnover</th>
                <th className="text-left px-2 py-2 font-medium">Fonte</th>
              </tr>
            </thead>
            <tbody>
              {allPredictions.map((m) => {
                const homeRisk = m.homeTurnover.risk;
                const awayRisk = m.awayTurnover.risk;
                const maxRisk = Math.max(homeRisk, awayRisk);
                const homeHighConcede = m.pred.homeConcedeProb > 0.35;
                const awayHighConcede = m.pred.awayConcedeProb > 0.35;

                return (
                  <tr
                    key={`${m.home}-${m.away}`}
                    className={`border-b border-gray-800/60 transition hover:bg-gray-700/20 ${
                      m.rosterRelevant ? 'bg-gray-700/10' : ''
                    }`}
                  >
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-white text-[13px]">{m.home}</span>
                        <span className="text-gray-500 text-[10px] px-1 rounded bg-gray-700/40">{m.pred.expectedGoalsHome}</span>
                        <span className="text-gray-500">-</span>
                        <span className="font-semibold text-white text-[13px]">{m.away}</span>
                        <span className="text-gray-500 text-[10px] px-1 rounded bg-gray-700/40">{m.pred.expectedGoalsAway}</span>
                        {m.rosterRelevant && (
                          <Star className="w-3 h-3 text-yellow-400 flex-shrink-0" />
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      <span className={`font-mono font-bold ${m.pred.homeWinProb > 0.5 ? 'text-green-400' : 'text-gray-300'}`}>
                        {Math.round(m.pred.homeWinProb * 100)}%
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      <span className="font-mono text-gray-400">{Math.round(m.pred.drawProb * 100)}%</span>
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      <span className={`font-mono font-bold ${m.pred.awayWinProb > 0.5 ? 'text-green-400' : 'text-gray-300'}`}>
                        {Math.round(m.pred.awayWinProb * 100)}%
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      <span className={`font-mono ${m.pred.over25Prob > 0.5 ? 'text-green-400' : 'text-gray-300'}`}>
                        {Math.round(m.pred.over25Prob * 100)}%
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      <div className="flex flex-col gap-0.5">
                        <span className={`font-mono ${homeHighConcede ? 'text-red-400 font-bold' : 'text-gray-400'}`}>
                          {m.home.slice(0, 3)}: {Math.round(m.pred.homeConcedeProb * 100)}%
                        </span>
                        <span className={`font-mono ${awayHighConcede ? 'text-red-400 font-bold' : 'text-gray-400'}`}>
                          {m.away.slice(0, 3)}: {Math.round(m.pred.awayConcedeProb * 100)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      {maxRisk > 0 ? (
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border ${riskColor(maxRisk)}`}>
                          <AlertTriangle className="w-2.5 h-2.5" />
                          {Math.round(maxRisk * 100)}%
                        </span>
                      ) : (
                        <span className="text-gray-600 text-[10px]">-</span>
                      )}
                    </td>
                    <td className="px-2 py-2.5 text-left">
                      <span className={`text-[9px] ${m.pred.source.startsWith('Poisson') ? 'text-gray-600' : 'text-green-500/70'}`}>
                        {m.pred.source}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-2 text-[10px] text-gray-500 border-t border-gray-700/40 bg-gray-800/40">
          <Star className="w-3 h-3 inline text-yellow-400" /> = squadra in tua rosa ·
          xG = gol attesi · Gol 2+ = prob. subire 2 o piu gol (rosso = malus difesa) ·
          Turnover = rischio rotazione per coppe europee
        </div>
      </div>

      {/* === Rischio Turnover === */}
      {euroTeamsPlaying.length > 0 && (
        <div className="bg-gray-800/60 rounded-xl border border-gray-700/50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            <h3 className="font-bold text-sm text-white">Rischio Turnover — Coppe Europee</h3>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {euroTeamsPlaying.map((m) => {
              const showHome = m.homeTurnover.risk > 0;
              const showAway = m.awayTurnover.risk > 0;
              return (
                <div key={`${m.home}-${m.away}`} className="space-y-1.5">
                  {showHome && (
                    <div className={`rounded-lg border p-3 ${riskColor(m.homeTurnover.risk)}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sm">{m.home} vs {m.away}</span>
                        <span className="text-xs font-bold">{COMP_LABELS[m.homeTurnover.competition ?? '']}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span>Rischio: <strong>{riskLabel(m.homeTurnover.risk)}</strong></span>
                        <span className="font-mono">{Math.round(m.homeTurnover.risk * 100)}%</span>
                      </div>
                      {m.homeTurnover.daysBetween !== null && (
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          {m.homeTurnover.daysBetween}g dalla gara europea vs {m.homeTurnover.opponent}
                        </div>
                      )}
                      <div className="mt-1.5 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-current rounded-full transition-all" style={{ width: `${m.homeTurnover.risk * 100}%` }} />
                      </div>
                    </div>
                  )}
                  {showAway && (
                    <div className={`rounded-lg border p-3 ${riskColor(m.awayTurnover.risk)}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sm">{m.away} @ {m.home}</span>
                        <span className="text-xs font-bold">{COMP_LABELS[m.awayTurnover.competition ?? '']}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span>Rischio: <strong>{riskLabel(m.awayTurnover.risk)}</strong></span>
                        <span className="font-mono">{Math.round(m.awayTurnover.risk * 100)}%</span>
                      </div>
                      {m.awayTurnover.daysBetween !== null && (
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          {m.awayTurnover.daysBetween}g dalla gara europea vs {m.awayTurnover.opponent}
                        </div>
                      )}
                      <div className="mt-1.5 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-current rounded-full transition-all" style={{ width: `${m.awayTurnover.risk * 100}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* === WHOSCORED: Forma Squadre === */}
      <div className="bg-gray-800/60 rounded-xl border border-gray-700/50 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-700/50 bg-gray-800/80">
          <Activity className="w-5 h-5 text-cyan-400" />
          <h3 className="font-bold text-sm text-white">WhoScored — Stato di Forma Squadze</h3>
          <span className="text-xs text-gray-500 ml-auto">Ultimi 5 match · Rating · Tattiche</span>
        </div>

        <div className="grid gap-3 p-4 lg:grid-cols-2">
          {rosterForms.map((form) => {
            const match = calendario[form.team];
            if (!match) return null;

            return (
              <div key={form.team} className="rounded-lg border border-gray-700/40 bg-gray-900/40 p-3.5">
                {/* Header: team + form rating + results */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{form.team}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${tierColor(TEAM_TIERS[form.team] ?? 'C')} bg-gray-800`}>
                      Tier {TEAM_TIERS[form.team] ?? 'C'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">
                      {form.recentResults.map((r, i) => (
                        <span
                          key={i}
                          className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center ${getFormColor(r)}`}
                        >
                          {getFormLabel(r)}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-orange-400" />
                      <span className={`font-bold text-sm ${formRatingColor(form.formRating)}`}>
                        {form.formRating.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Match info */}
                <div className="mb-2.5 pb-2.5 border-b border-gray-800">
                  <span className="text-[10px] text-gray-500">Prossima: </span>
                  <span className="text-xs font-semibold text-white">
                    {match.casa ? 'vs' : '@'} {match.avversario}
                  </span>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Gol/match</span>
                    <span className="text-white font-semibold">{form.goalsForAvg}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Subiti/match</span>
                    <span className={`font-semibold ${form.goalsAgainstAvg > 1.3 ? 'text-red-400' : 'text-white'}`}>
                      {form.goalsAgainstAvg}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Possesso</span>
                    <span className="text-white font-semibold">{Math.round(form.possessionAvg * 100)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Tiri/match</span>
                    <span className="text-white font-semibold">{form.shotsPerMatch}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Clean sheet</span>
                    <span className="text-white font-semibold">{Math.round(form.cleanSheetRate * 100)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Pass. precisi</span>
                    <span className="text-white font-semibold">{Math.round(form.passAccuracy * 100)}%</span>
                  </div>
                </div>

                {/* Progress bars for threat / defense */}
                <div className="mt-2.5 space-y-1.5">
                  <div className="flex items-center gap-2 text-[10px]">
                    <Target className="w-3 h-3 text-orange-400 flex-shrink-0" />
                    <span className="text-gray-400 w-16">Attacco</span>
                    <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-500 rounded-full" style={{ width: `${form.attackingThreat * 100}%` }} />
                    </div>
                    <span className="text-gray-300 font-mono w-6 text-right">{Math.round(form.attackingThreat * 100)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px]">
                    <Shield className="w-3 h-3 text-green-400 flex-shrink-0" />
                    <span className="text-gray-400 w-16">Difesa</span>
                    <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: `${form.defensiveSolidity * 100}%` }} />
                    </div>
                    <span className="text-gray-300 font-mono w-6 text-right">{Math.round(form.defensiveSolidity * 100)}</span>
                  </div>
                </div>

                {/* Key player */}
                <div className="mt-2.5 pt-2.5 border-t border-gray-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Star className="w-3 h-3 text-yellow-400" />
                    <span className="text-[11px] text-gray-300">{form.keyPlayer}</span>
                  </div>
                  <span className={`text-xs font-bold ${formRatingColor(form.keyPlayerRating)}`}>
                    {form.keyPlayerRating.toFixed(1)}
                  </span>
                </div>

                {/* Tactical note */}
                <div className="mt-2 text-[10px] text-gray-500 italic leading-snug">
                  {form.notes}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* === Calendario Coppe Europee === */}
      <div className="bg-gray-800/60 rounded-xl border border-gray-700/50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-5 h-5 text-blue-400" />
          <h3 className="font-bold text-sm text-white">Calendario Coppe Europee — Squadre Serie A</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {SERIE_A_TEAMS.filter((t) => isEuroTeam(t)).map((team) => {
            const comp = getTeamCompetition(team);
            const turnover = getTeamTurnoverRisk(team, matchdayNum);
            return (
              <div key={team} className={`rounded-lg border px-3 py-2 text-xs ${COMP_COLORS[comp ?? '']}`}>
                <div className="font-semibold">{team}</div>
                <div className="text-gray-400">{COMP_LABELS[comp ?? '']}</div>
                {turnover.risk > 0 ? (
                  <div className="mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Turnover: {Math.round(turnover.risk * 100)}%</span>
                  </div>
                ) : (
                  <div className="mt-1 text-gray-500">Nessun impegno vicino</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
