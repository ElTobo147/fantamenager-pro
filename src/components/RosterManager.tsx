import { useState } from 'react';
import { Trash2, Plus, Info } from 'lucide-react';
import type { Player, PlayerDB, Ruolo, Calendario } from '../types';
import { SERIE_A_TEAMS, RUOLI, RUOLO_STYLES, ROSA_LIMITS, TEAM_METRICS } from '../constants';
import { formatXfp, matchLabel, opponentTierLabel, COACHES } from '../lib/players';
import { hasTitolaritaData, getTitolaritaStatus, INJURED_VALUE, PANCHINA_VALUE, NOT_LISTED_VALUE, TITOLARE_VALUE } from '../data/titolarita';
import { getPlayerStats, hasHardcodedStats } from '../data/stats';
import PlayerPicker from './PlayerPicker';

interface Props {
  players: Player[];
  onAdd: (p: Player) => void;
  onRemove: (id: string) => void;
  calendario: Calendario;
  matchdayNum: number;
}

type FilterTeam = string | 'ALL';
type FilterRole = Ruolo | 'ALL';

export default function RosterManager({ players, onAdd, onRemove, calendario, matchdayNum }: Props) {
  const [filterTeam, setFilterTeam] = useState<FilterTeam>('ALL');
  const [filterRole, setFilterRole] = useState<FilterRole>('ALL');
  const [error, setError] = useState('');

  const excludeNames = new Set(players.map((p) => p.nome.toUpperCase()));

  function handlePick(db: PlayerDB) {
    setError('');
    if (excludeNames.has(db.nome.toUpperCase())) {
      setError(`${db.nome} è già in rosa`);
      return;
    }
    const roleCount = players.filter((p) => p.ruolo === db.ruolo).length;
    if (roleCount >= ROSA_LIMITS[db.ruolo]) {
      const roleLabel = RUOLI.find((role) => role.value === db.ruolo)?.label ?? db.ruolo;
      setError(`Hai raggiunto il limite di ${ROSA_LIMITS[db.ruolo]} ${roleLabel.toLowerCase()}.`);
      return;
    }
    onAdd({
      ...db,
      id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
      bonus: parseFloat((Math.random() * 2 - 0.5).toFixed(1)),
      percentualeTitolarita: 1,
    });
  }

  const counts: Record<Ruolo, number> = {
    P: players.filter((p) => p.ruolo === 'P').length,
    D: players.filter((p) => p.ruolo === 'D').length,
    C: players.filter((p) => p.ruolo === 'C').length,
    A: players.filter((p) => p.ruolo === 'A').length,
  };

  const filtered = players.filter(
    (p) =>
      (filterTeam === 'ALL' || p.squadra === filterTeam) &&
      (filterRole === 'ALL' || p.ruolo === filterRole),
  );

  return (
    <div className="space-y-6">
      <div className="bg-gray-800/70 backdrop-blur p-5 rounded-2xl border border-gray-700/60 shadow-xl">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-white">
          <Plus className="w-5 h-5 text-green-400" />
          Aggiungi Giocatore dal Listone
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Filtra per squadra</label>
            <select
              value={filterTeam}
              onChange={(e) => setFilterTeam(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-green-500 transition"
            >
              <option value="ALL">Tutte le squadre</option>
              {SERIE_A_TEAMS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Filtra per ruolo</label>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value as FilterRole)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-green-500 transition"
            >
              <option value="ALL">Tutti i ruoli</option>
              {RUOLI.map((r) => (
                <option key={r.value} value={r.value}>{r.label} ({r.value})</option>
              ))}
            </select>
          </div>
        </div>

        <PlayerPicker
          selectedRole={filterRole}
          onPick={handlePick}
          excludeNames={excludeNames}
        />
        {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
        <p className="text-xs text-gray-500 mt-2.5">
          Rosa massima: 3 portieri, 8 difensori, 8 centrocampisti e 6 attaccanti. Cerca nel listone 2026/2027 e clicca per aggiungere.
        </p>
      </div>

      <div className="grid grid-cols-4 gap-3 md:gap-4">
        {(['P', 'D', 'C', 'A'] as Ruolo[]).map((r) => (
          <div
            key={r}
            className={`bg-gray-800/70 border-t-4 ${RUOLO_STYLES[r].border} rounded-xl p-3 shadow-md text-center`}
          >
            <div className="text-2xl md:text-3xl font-black text-white">
              {counts[r]}<span className="text-sm font-semibold text-gray-500">/{ROSA_LIMITS[r]}</span>
            </div>
            <div className="text-[10px] md:text-xs text-gray-400 uppercase tracking-wide mt-0.5">
              {RUOLI.find((x) => x.value === r)?.label}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-16 text-gray-500">
            <p className="text-lg">Nessun giocatore in rosa</p>
            <p className="text-sm mt-1">Cerca e aggiungi calciatori dal listone qui sopra</p>
          </div>
        )}
        {filtered.map((g) => {
          const style = RUOLO_STYLES[g.ruolo];
          return (
            <div
              key={g.id}
              className="group bg-gray-800/70 border border-gray-700/60 rounded-xl p-4 shadow-md hover:border-gray-600 transition relative fade-in"
            >
              <button
                onClick={() => onRemove(g.id)}
                className="absolute top-2.5 right-2.5 text-gray-500 hover:text-red-400 transition opacity-0 group-hover:opacity-100"
                aria-label="Rimuovi"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 ${style.bg} rounded-lg flex items-center justify-center font-bold text-lg text-white shadow-inner shrink-0`}>
                  {g.ruolo}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-white leading-tight truncate">{g.nome}</h3>
                  <p className="text-xs text-gray-400">{g.squadra} · {g.eta} anni</p>
                </div>
                <div className="ml-auto text-right pr-6">
                  <div className="text-2xl font-black text-green-400">{formatXfp(g, calendario, matchdayNum)}</div>
                  <div className="text-[10px] text-gray-400 uppercase">xFP atteso</div>
                </div>
              </div>
              <div className="bg-gray-900/60 rounded-lg p-2.5 text-xs border border-gray-700/50">
                <div className="flex justify-between items-center mb-1.5 pb-1.5 border-b border-gray-800">
                  <span className="text-gray-400">Match:</span>
                  <span className="font-semibold text-white">{matchLabel(g.squadra, calendario)}</span>
                </div>
                <div className="flex justify-between items-center text-gray-400">
                  <span>Quotazione: <span className="text-white font-semibold">{g.qt}</span></span>
                  <span>Bonus: <span className="text-green-400">{g.bonus >= 0 ? `+${g.bonus}` : g.bonus}</span></span>
                </div>
                <div className="mt-1.5 pt-1.5 border-t border-gray-800">
                  <div className="flex justify-between items-center text-gray-400">
                    <span>
                      Titolarità: {hasTitolaritaData(matchdayNum) ? (
                        <span className={`font-semibold ${
                          g.percentualeTitolarita === TITOLARE_VALUE ? 'text-green-400'
                            : g.percentualeTitolarita === PANCHINA_VALUE ? 'text-yellow-400'
                            : g.percentualeTitolarita === INJURED_VALUE ? 'text-red-400'
                            : 'text-gray-500'
                        }`}>
                          {Math.round(g.percentualeTitolarita * 100)}%
                        </span>
                      ) : (
                        <span className="text-gray-500">N/D</span>
                      )}
                    </span>
                    <span>xFP: <span className="text-white">{formatXfp(g, calendario, matchdayNum)}</span></span>
                  </div>
                  {hasTitolaritaData(matchdayNum) && (() => {
                    const status = getTitolaritaStatus(matchdayNum, g.nome, g.squadra);
                    const statusMap = {
                      titolare: { label: 'Titolare nelle probabili formazioni', color: 'text-green-500' },
                      panchina: { label: 'In panchina nelle probabili formazioni', color: 'text-yellow-500' },
                      assente: { label: 'Non presente nelle probabili formazioni', color: 'text-gray-500' },
                      infortunato: { label: 'INDISISPONIBILE — infortunato', color: 'text-red-500' },
                      nd: { label: '', color: '' },
                    };
                    const info = statusMap[status];
                    if (!info.label) return null;
                    return (
                      <div className="flex items-center gap-1 mt-1.5">
                        <Info className={`w-3 h-3 shrink-0 ${info.color}`} />
                        <span className={`text-[10px] ${info.color}`}>
                          {info.label}
                        </span>
                      </div>
                    );
                  })()}
                </div>
                {(() => {
                  const stats = g.stats ?? getPlayerStats(g.nome, g.squadra, g.ruolo, g.qt);
                  const isReal = hasHardcodedStats(g.nome, g.squadra);
                  return (
                    <div className="flex justify-between items-center mt-1.5 pt-1.5 border-t border-gray-800 text-gray-400">
                      <span>Gol: <span className="text-white font-semibold">{stats.gol}</span> · Assist: <span className="text-white font-semibold">{stats.assist}</span></span>
                      <span>xG: <span className="text-white">{stats.xg}</span> · xA: <span className="text-white">{stats.xa}</span>{!isReal && <span className="ml-1 text-[9px] text-gray-500 italic">(stim.)</span>}</span>
                    </div>
                  );
                })()}
                <div className="flex justify-between items-center mt-1.5 pt-1.5 border-t border-gray-800 text-gray-400">
                  <span>Avversario: <span className="text-white">{opponentTierLabel(g.squadra, calendario) || 'Riposo'}</span></span>
                  {COACHES[g.squadra] && <span>Allenatore: <span className="text-white">{COACHES[g.squadra].stile}</span></span>}
                </div>
                {TEAM_METRICS[g.squadra] && (
                  <div className="flex justify-between items-center mt-1.5 pt-1.5 border-t border-gray-800 text-gray-400">
                    <span>xG squadra: <span className="text-white">{TEAM_METRICS[g.squadra].xG}</span></span>
                    <span>Gol: <span className="text-white">{TEAM_METRICS[g.squadra].goals}</span></span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
