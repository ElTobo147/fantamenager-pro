import { useState, useMemo } from 'react';
import { Zap, ClipboardCopy, Check, Info, TrendingUp, Shield, Crown, Star } from 'lucide-react';
import type { Player, Formazione, Calendario } from '../types';
import { RUOLO_STYLES, TEAM_METRICS } from '../constants';
import { calcolaXfp, formatXfp, matchLabel, opponentTierLabel } from '../lib/players';
import { calcolaFormazioneOttimale, formazioneToWhatsApp } from '../lib/autoFormation';
import { hasTitolaritaData, getTitolaritaStatus } from '../data/titolarita';
import { COACHES } from '../lib/players';
import PitchPlayer from './PitchPlayer';

interface Props {
  players: Player[];
  calendario: Calendario;
  matchdayNum: number;
}

export default function FormationView({ players, calendario, matchdayNum }: Props) {
  const [formazione, setFormazione] = useState<Formazione | null>(null);
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const autoCalc = useMemo(() => {
    return calcolaFormazioneOttimale(players, calendario, matchdayNum);
  }, [players, calendario, matchdayNum]);

  function calculate() {
    setFormazione(autoCalc);
  }

  function copiaWhatsApp() {
    if (!formazione) return;
    const text = formazioneToWhatsApp(formazione, calendario, matchdayNum);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const linee: { giocatori: Player[]; key: 'A' | 'C' | 'D' | 'P' }[] = formazione
    ? [
        { giocatori: formazione.titolari.A, key: 'A' },
        { giocatori: formazione.titolari.C, key: 'C' },
        { giocatori: formazione.titolari.D, key: 'D' },
        { giocatori: formazione.titolari.P, key: 'P' },
      ]
    : [];

  const bestModulo = autoCalc?.modulo ?? '—';
  const hasEnough = autoCalc !== null;

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="w-full lg:w-1/3 flex flex-col gap-6">
        <div className="bg-gray-800/70 backdrop-blur p-5 rounded-2xl border border-gray-700/60 shadow-xl">
          <h2 className="text-lg font-bold mb-2 text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-green-400" />
            Schieramento Automatico
          </h2>
          <p className="text-xs text-gray-400 mb-4">
            L'algoritmo simula tutti i moduli e seleziona l'11 con la somma xFP piu alta.
          </p>

          {hasEnough ? (
            <div className="bg-gray-900/60 rounded-lg p-3 mb-4 border border-gray-700/50">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Modulo ottimale:</span>
                <span className="text-2xl font-black text-green-400">{bestModulo}</span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-sm text-gray-400">xFP totale:</span>
                <span className="text-lg font-bold text-white">{autoCalc!.totaleXfp.toFixed(1)}</span>
              </div>
            </div>
          ) : (
            <p className="text-red-400 text-sm mb-4">Servono almeno 1 portiere + difensori, centrocampisti e attaccanti.</p>
          )}

          {formazione?.capitano && (
            <div className="bg-gradient-to-r from-yellow-900/40 to-amber-900/30 rounded-lg p-3 mb-4 border border-yellow-700/40">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-4 h-4 text-yellow-400" />
                <span className="text-sm font-bold text-yellow-400">Capitano</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="text-white font-bold truncate">{formazione.capitano.nome}</div>
                  <div className="text-xs text-gray-400">{formazione.capitano.squadra} · {formazione.capitano.ruolo}</div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <div className="text-xl font-black text-yellow-400">{formatXfp(formazione.capitano, calendario, matchdayNum)}</div>
                  <div className="text-[10px] text-gray-400">xFP</div>
                </div>
              </div>
              <p className="text-[10px] text-gray-400 mt-2">
                Il giocatore con il voto atteso piu alto. Se prende 6,5 in pagella, il bonus capitano raddoppia il +0.5.
              </p>
            </div>
          )}

          {formazione?.viceCapitano && (
            <div className="bg-gray-900/40 rounded-lg p-2.5 mb-4 border border-gray-700/40">
              <div className="flex items-center gap-2">
                <Star className="w-3.5 h-3.5 text-gray-300" />
                <span className="text-xs font-semibold text-gray-300">Vice Capitano</span>
                <span className="text-white font-medium text-sm truncate ml-1">{formazione.viceCapitano.nome}</span>
                <span className="text-green-400 font-bold text-sm ml-auto shrink-0">{formatXfp(formazione.viceCapitano, calendario, matchdayNum)}</span>
              </div>
            </div>
          )}

          <button
            onClick={calculate}
            disabled={!hasEnough}
            className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition shadow-lg shadow-green-600/20 flex items-center justify-center gap-2 mb-3"
          >
            <Zap className="w-4 h-4" /> Calcola Formazione Automatica
          </button>
          <button
            onClick={copiaWhatsApp}
            disabled={!formazione}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-2.5 px-4 rounded-lg transition flex items-center justify-center gap-2 mb-3"
          >
            {copied ? <Check className="w-4 h-4" /> : <ClipboardCopy className="w-4 h-4" />}
            {copied ? 'Copiato!' : 'Copia per WhatsApp'}
          </button>

          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full text-xs text-gray-400 hover:text-gray-300 transition flex items-center justify-center gap-1"
          >
            <Info className="w-3 h-3" /> {showDetails ? 'Nascondi' : 'Mostra'} dettagli valutazione
          </button>

          {showDetails && (
            <div className="mt-3 space-y-2 text-xs text-gray-400 bg-gray-900/50 rounded-lg p-3 border border-gray-700/40">
              <div className="flex items-center gap-1.5 text-gray-300 font-semibold">
                <TrendingUp className="w-3.5 h-3.5 text-green-400" /> Come viene calcolato l'xFP
              </div>
              <p>• Base: quotazione × 0.15</p>
              <p>• xG e xA pesati per ruolo</p>
              <p>• +0.3 casa / -0.2 trasferta</p>
              <p>• Malus vs top team (tier S/A)</p>
              <p>• Bonus vs squadre deboli (tier C/D)</p>
              <div className="flex items-center gap-1.5 text-gray-300 font-semibold pt-1">
                <Shield className="w-3.5 h-3.5 text-blue-400" /> Allenatori
              </div>
              <p>• Offensivi: +A, +C, -D, -P</p>
              <p>• Difensivi: +D, +P, -A, -C</p>
            </div>
          )}

          {hasTitolaritaData(matchdayNum) && (
            <div className="mt-3 flex items-start gap-2 text-xs text-gray-400 bg-gray-900/50 rounded-lg p-2.5 border border-gray-700/40">
              <Info className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" />
              <span>
                Titolarita da <strong className="text-white">fantacalcio.it</strong> — Giornata {matchdayNum}.
                <span className="text-green-400"> Titolari 100%</span> ·
                <span className="text-yellow-400"> Panchina 50%</span> ·
                <span className="text-gray-500"> Assenti 30%</span> ·
                <span className="text-red-400"> Infortunati 0%</span>
              </span>
            </div>
          )}
        </div>

        <div className="bg-gray-800/70 backdrop-blur p-5 rounded-2xl border border-gray-700/60 shadow-xl flex-1">
          <h2 className="text-lg font-bold mb-4 border-b border-gray-700/60 pb-2 text-white">Panchina</h2>
          {!formazione ? (
            <p className="text-gray-500 italic text-sm">Calcola la formazione per vedere la panchina.</p>
          ) : formazione.panchina.length === 0 ? (
            <p className="text-gray-500 italic text-sm">Nessun giocatore in panchina.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {formazione.panchina.map((p, i) => {
                const style = RUOLO_STYLES[p.ruolo];
                return (
                  <li
                    key={p.id}
                    className="flex items-center gap-3 bg-gray-900/50 rounded-lg px-3 py-2 border border-gray-700/40"
                  >
                    <span className="text-gray-500 text-xs w-4">{i + 1}</span>
                    <span className={`w-7 h-7 ${style.bg} rounded flex items-center justify-center font-bold text-xs text-white`}>
                      {p.ruolo}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-white font-medium truncate">{p.nome}</div>
                      <div className="text-xs text-gray-400">{p.squadra}</div>
                    </div>
                    <span className="text-green-400 font-bold">{formatXfp(p, calendario, matchdayNum)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="w-full lg:w-2/3">
        <div className="pitch-bg w-full h-[500px] md:h-[600px] rounded-2xl shadow-2xl relative">
          <div className="pitch-lines" />
          <div className="pitch-center" />
          <div className="pitch-circle" />
          <div className="pitch-area-top" />
          <div className="pitch-area-bottom" />
          <div className="absolute inset-0 flex flex-col justify-between py-8 px-4 z-10">
            {!formazione ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center px-6">
                  <Zap className="w-12 h-12 text-green-400/50 mx-auto mb-3" />
                  <p className="text-white/60 text-sm">
                    Premi <span className="font-bold text-white">Calcola Formazione Automatica</span> per schierare la squadra
                  </p>
                </div>
              </div>
            ) : (
              linee.map((linea) => (
                <div key={linea.key} className="flex justify-center gap-3 md:gap-6 lg:gap-8 w-full">
                  {linea.giocatori.map((g) => (
                    <PitchPlayer key={g.id} player={g} calendario={calendario} matchdayNum={matchdayNum} />
                  ))}
                </div>
              ))
            )}
          </div>
        </div>

        {formazione && (
          <div className="mt-4 bg-gray-800/70 backdrop-blur p-4 rounded-2xl border border-gray-700/60 shadow-xl">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-400" />
              Dettaglio Titolari — xFP per giocatore
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(['P', 'D', 'C', 'A'] as const).flatMap((r) =>
                formazione.titolari[r].map((p) => {
                  const style = RUOLO_STYLES[p.ruolo];
                  const coach = COACHES[p.squadra];
                  const tier = opponentTierLabel(p.squadra, calendario);
                  const status = hasTitolaritaData(matchdayNum) ? getTitolaritaStatus(matchdayNum, p.nome, p.squadra) : 'nd';
                  const isCap = formazione.capitano?.id === p.id;
                  const isVice = formazione.viceCapitano?.id === p.id;
                  return (
                    <div key={p.id} className={`flex items-center gap-2 rounded-lg px-3 py-2 border ${isCap ? 'bg-yellow-900/30 border-yellow-700/50' : 'bg-gray-900/50 border-gray-700/40'}`}>
                      <span className={`w-6 h-6 ${style.bg} rounded flex items-center justify-center font-bold text-[10px] text-white shrink-0`}>
                        {p.ruolo}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-white font-medium truncate flex items-center gap-1">
                          {p.nome}
                          {isCap && <Crown className="w-3.5 h-3.5 text-yellow-400 shrink-0" />}
                          {isVice && <Star className="w-3 h-3 text-gray-300 shrink-0" />}
                        </div>
                        <div className="text-[10px] text-gray-400 truncate">
                          {matchLabel(p.squadra, calendario)}
                          {tier && <span className="ml-1 text-gray-500">· Avv: {tier}</span>}
                          {coach && <span className="ml-1 text-gray-500">· {coach.stile}</span>}
                          {status !== 'nd' && <span className={`ml-1 ${status === 'titolare' ? 'text-green-400' : status === 'panchina' ? 'text-yellow-400' : status === 'infortunato' ? 'text-red-400' : 'text-gray-500'}`}>· {status}</span>}
                        </div>
                      </div>
                      <span className="text-green-400 font-bold text-sm shrink-0">{formatXfp(p, calendario, matchdayNum)}</span>
                    </div>
                  );
                }),
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
