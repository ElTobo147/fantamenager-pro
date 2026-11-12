import { Trash2, ArrowLeft, RefreshCw, Users } from 'lucide-react';
import type { Player, Calendario } from '../types';
import { RUOLO_STYLES, RUOLI } from '../constants';
import { formatXfp, matchLabel } from '../lib/players';
import { hasTitolaritaData, getTitolaritaStatus, PANCHINA_VALUE, TITOLARE_VALUE } from '../data/titolarita';

interface Props {
  players: Player[];
  onRemove: (id: string) => void;
  onClose: () => void;
  onReload: () => void;
  calendario: Calendario;
  matchdayNum: number;
}

const STATUS_COLORS: Record<string, string> = {
  titolare: 'text-green-400',
  panchina: 'text-yellow-400',
  assente: 'text-gray-500',
  infortunato: 'text-red-400',
  nd: 'text-gray-500',
};

export default function RosaList({ players, onRemove, onClose, onReload, calendario, matchdayNum }: Props) {
  const counts = RUOLI.map((r) => ({
    label: r.label,
    value: r.value,
    n: players.filter((p) => p.ruolo === r.value).length,
  }));

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
      <header className="bg-gray-800/80 backdrop-blur border-b border-gray-700/60 px-4 py-3.5 shadow-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition"
              aria-label="Torna all'app"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-lg md:text-xl font-bold text-white leading-tight flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" />
                Mia rosa
              </h1>
              <p className="text-xs text-gray-400">Letti direttamente dal database · aggiornamento in tempo reale</p>
            </div>
          </div>
          <button
            onClick={onReload}
            className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 transition"
            aria-label="Ricarica dal database"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 mt-4 mb-8 space-y-4">
        <div className="grid grid-cols-4 gap-3">
          {counts.map((c) => (
            <div key={c.value} className={`bg-gray-800/70 border-t-4 ${RUOLO_STYLES[c.value].border} rounded-xl p-3 text-center shadow-md`}>
              <div className="text-2xl font-black text-white">{c.n}</div>
              <div className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">{c.label}</div>
            </div>
          ))}
        </div>

        {players.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            <p className="text-lg">Nessun giocatore in rosa</p>
            <p className="text-sm mt-1">Torna al listone e aggiungi calciatori: compariranno qui dal database</p>
          </div>
        )}

        <ul className="divide-y divide-gray-800 bg-gray-800/60 rounded-2xl border border-gray-700/60 shadow-lg overflow-hidden">
          {players.map((g) => {
            const status = hasTitolaritaData(matchdayNum) ? getTitolaritaStatus(matchdayNum, g.nome, g.squadra) : 'nd';
            return (
              <li key={g.id} className="group flex items-center gap-3 px-4 py-3 hover:bg-gray-800/90 transition">
                <div className={`w-9 h-9 ${RUOLO_STYLES[g.ruolo].bg} rounded-lg flex items-center justify-center font-bold text-white text-sm shrink-0`}>
                  {g.ruolo}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-white leading-tight truncate">{g.nome}</p>
                  <p className="text-xs text-gray-400">
                    {g.squadra} · Qt {g.qt} · {matchLabel(g.squadra, calendario) || 'Riposo'}
                  </p>
                </div>
                <div className="text-right hidden sm:block">
                  <span className={`text-xs font-semibold ${STATUS_COLORS[status]}`}>
                    {hasTitolaritaData(matchdayNum)
                      ? status === 'titolare' ? 'Titolare'
                        : status === 'panchina' ? 'Panchina'
                          : status === 'infortunato' ? 'Infortunato'
                            : 'Non convocato'
                      : 'N/D'}
                  </span>
                </div>
                <div className="text-right w-16">
                  <div className="font-black text-green-400">{formatXfp(g, calendario, matchdayNum)}</div>
                  <div className="text-[9px] text-gray-500 uppercase">xFP</div>
                </div>
                <button
                  onClick={() => onRemove(g.id)}
                  className="p-2 text-gray-500 hover:text-red-400 transition"
                  aria-label={`Rimuovi ${g.nome}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            );
          })}
        </ul>

        <p className="text-xs text-gray-500">
          L'elenco è la tabella del database: ogni aggiunta dal listone e ogni rimozione qui viene salvata immediatamente.
        </p>
      </main>
    </div>
  );
}
