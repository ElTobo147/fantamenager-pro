import { useEffect, useState, useCallback } from 'react';
import { X, RefreshCw, Database, ListOrdered, User, Activity, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface StatRow { nome: string; squadra: string; gol: number; assist: number; fm: number; pv: number }
interface StandingRow {
  posizione: number; squadra: string; gare: number; vittorie: number;
  pareggi: number; sconfitte: number; gol_fatti: number; gol_subiti: number; punti: number;
}
interface CoachRow { squadra: string; allenatore: string; statuso: string | null }
interface FormationRow { squadra: string; titolari: string[] }
interface InjuryRow { squadra: string; players: { nome: string; nota?: string }[] }

interface Props {
  open: boolean;
  onClose: () => void;
}

export const SYNC_SOURCES: Record<string, { label: string; site: string }> = {
  stats: { label: 'Statistiche giocatori', site: 'fantacalcio.it' },
  formazioni: { label: 'Probabili formazioni', site: 'fantacalcio.it' },
  infortunati: { label: 'Infortunati', site: 'fantacalcio.it' },
  allenatori: { label: 'Allenatori', site: 'sport.sky.it' },
  classifica: { label: 'Classifica', site: 'whoscored.com' },
};

function fmColor(fm: number): string {
  if (fm >= 8) return 'text-green-400';
  if (fm >= 7) return 'text-yellow-400';
  if (fm >= 6) return 'text-orange-400';
  return 'text-gray-400';
}

type Section = 'stats' | 'formazioni' | 'infortunati' | 'allenatori' | 'classifica';

/**
 * Contenuto del pannello dati: carica dal database tutto ciò che è stato
 * scaricato dai siti (fantacalcio.it, sport.sky.it, whoscored.com) e lo
 * mostra in schede. Usato sia nel modal dopo "Aggiorna dati" sia nella
 * scheda "Dati" dell'app.
 */
export function SyncReportContent() {
  const [section, setSection] = useState<Section>('stats');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatRow[]>([]);
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [coaches, setCoaches] = useState<CoachRow[]>([]);
  const [formations, setFormations] = useState<FormationRow[]>([]);
  const [injuries, setInjuries] = useState<InjuryRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, standingsRes, coachesRes, formationsRes, injuriesRes] = await Promise.all([
        supabase.from('player_stats').select('nome, squadra, gol, assist, fm, pv').order('fm', { ascending: false }).limit(100),
        supabase.from('standings').select('*').order('posizione'),
        supabase.from('coaches').select('squadra, allenatore, statuso').order('squadra'),
        supabase.from('team_formations').select('squadra, titolari').order('squadra'),
        supabase.from('team_injuries').select('squadra, players').order('squadra'),
      ]);
      if (statsRes.error) throw statsRes.error;
      if (standingsRes.error) throw standingsRes.error;
      if (coachesRes.error) throw coachesRes.error;
      if (formationsRes.error) throw formationsRes.error;
      if (injuriesRes.error) throw injuriesRes.error;

      setStats((statsRes.data ?? []) as StatRow[]);
      setStandings((standingsRes.data ?? []) as StandingRow[]);
      setCoaches((coachesRes.data ?? []) as CoachRow[]);
      setFormations((formationsRes.data ?? []) as FormationRow[]);
      setInjuries(((injuriesRes.data ?? []) as { squadra: string; players: unknown }[]).map((r) => ({
        squadra: r.squadra,
        players: (r.players as InjuryRow['players']) ?? [],
      })));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const tabs: { id: Section; label: string; count: number; icon: typeof User }[] = [
    { id: 'stats', label: 'Statistiche', count: stats.length, icon: Activity },
    { id: 'classifica', label: 'Classifica', count: standings.length, icon: ListOrdered },
    { id: 'allenatori', label: 'Allenatori', count: coaches.length, icon: User },
    { id: 'formazioni', label: 'Formazioni', count: formations.length, icon: Users },
    { id: 'infortunati', label: 'Infortunati', count: injuries.reduce((n, i) => n + i.players.length, 0), icon: Database },
  ];

  return (
    <>
      <div className="flex gap-1.5 px-5 py-3 border-b border-gray-800 overflow-x-auto">
        {tabs.map(({ id, label, count, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setSection(id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
              section === id ? 'bg-green-600/90 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
            <span className={`px-1.5 py-0.5 rounded text-[10px] ${section === id ? 'bg-green-800 text-green-200' : 'bg-gray-700 text-gray-300'}`}>
              {count}
            </span>
          </button>
        ))}
        <button
          onClick={load}
          disabled={loading}
          className="ml-auto p-1.5 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition disabled:opacity-50"
          aria-label="Ricarica dati"
          title="Ricarica"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 text-green-400 animate-spin" />
          </div>
        ) : error ? (
          <p className="text-red-400 text-sm text-center py-8">{error}</p>
        ) : (
          <>
            {section === 'stats' && (
              stats.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">Nessuna statistica ancora scaricata. Premi "Aggiorna dati" per scaricarla da fantacalcio.it.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-xs text-gray-500 uppercase sticky top-0 bg-gray-900">
                    <tr>
                      <th className="text-left py-2">Giocatore</th>
                      <th className="text-left py-2">Squadra</th>
                      <th className="text-center py-2">Gol</th>
                      <th className="text-center py-2">Ass</th>
                      <th className="text-center py-2">FM</th>
                      <th className="text-center py-2">PV</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {stats.map((s) => (
                      <tr key={`${s.squadra}-${s.nome}`} className="hover:bg-gray-800/50">
                        <td className="py-1.5 font-medium text-gray-200">{s.nome}</td>
                        <td className="py-1.5 text-gray-400 text-xs">{s.squadra}</td>
                        <td className="py-1.5 text-center text-gray-300">{s.gol}</td>
                        <td className="py-1.5 text-center text-gray-300">{s.assist}</td>
                        <td className={`py-1.5 text-center font-semibold ${fmColor(s.fm)}`}>{s.fm.toFixed(2)}</td>
                        <td className="py-1.5 text-center text-gray-500">{s.pv}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}

            {section === 'classifica' && (
              standings.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">
                  Classifica non ancora scaricata. Premi "Aggiorna dati" per scaricarla da whoscored.com.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-xs text-gray-500 uppercase sticky top-0 bg-gray-900">
                    <tr>
                      <th className="text-center py-2">#</th>
                      <th className="text-left py-2">Squadra</th>
                      <th className="text-center py-2">G</th>
                      <th className="text-center py-2">V</th>
                      <th className="text-center py-2">N</th>
                      <th className="text-center py-2">P</th>
                      <th className="text-center py-2">GF</th>
                      <th className="text-center py-2">GS</th>
                      <th className="text-center py-2">Pti</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {standings.map((s) => (
                      <tr key={s.squadra} className="hover:bg-gray-800/50">
                        <td className="py-1.5 text-center text-gray-500">{s.posizione}</td>
                        <td className="py-1.5 font-medium text-gray-200">{s.squadra}</td>
                        <td className="py-1.5 text-center text-gray-300">{s.gare}</td>
                        <td className="py-1.5 text-center text-gray-300">{s.vittorie}</td>
                        <td className="py-1.5 text-center text-gray-300">{s.pareggi}</td>
                        <td className="py-1.5 text-center text-gray-300">{s.sconfitte}</td>
                        <td className="py-1.5 text-center text-gray-300">{s.gol_fatti}</td>
                        <td className="py-1.5 text-center text-gray-300">{s.gol_subiti}</td>
                        <td className="py-1.5 text-center font-bold text-white">{s.punti}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}

            {section === 'allenatori' && (
              coaches.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">Nessun allenatore ancora scaricato. Premi "Aggiorna dati" per scaricarli da sport.sky.it.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {coaches.map((c) => (
                    <div key={c.squadra} className="flex items-center justify-between bg-gray-800/60 rounded-lg px-3 py-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-200">{c.squadra}</p>
                        <p className="text-xs text-gray-400">{c.allenatore}</p>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        c.statuso === 'nuovo' ? 'bg-blue-900/60 text-blue-300' : 'bg-gray-700 text-gray-300'
                      }`}>
                        {c.statuso ?? 'confermato'}
                      </span>
                    </div>
                  ))}
                </div>
              )
            )}

            {section === 'formazioni' && (
              formations.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">Nessuna formazione ancora scaricata. Premi "Aggiorna dati" per scaricarle da fantacalcio.it.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {formations.map((f) => (
                    <div key={f.squadra} className="bg-gray-800/60 rounded-lg px-3 py-2">
                      <p className="text-sm font-semibold text-gray-200 mb-1">{f.squadra}</p>
                      <p className="text-xs text-gray-400 leading-relaxed">{f.titolari.join(' · ')}</p>
                    </div>
                  ))}
                </div>
              )
            )}

            {section === 'infortunati' && (
              injuries.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">Nessun infortunato ancora scaricato. Premi "Aggiorna dati" per scaricarli da fantacalcio.it.</p>
              ) : (
                <div className="space-y-2">
                  {injuries.map((i) => (
                    <div key={i.squadra} className="bg-gray-800/60 rounded-lg px-3 py-2">
                      <p className="text-sm font-semibold text-gray-200 mb-1">{i.squadra}</p>
                      {i.players.length === 0 ? (
                        <p className="text-xs text-gray-500">Nessuno</p>
                      ) : (
                        <ul className="text-xs text-gray-400">
                          {i.players.map((p) => (
                            <li key={p.nome}>
                              <span className="text-red-400">{p.nome}</span>
                              {p.nota ? ` — ${p.nota}` : ''}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )
            )}
          </>
        )}
      </div>

      <div className="px-5 py-3 border-t border-gray-800 text-[11px] text-gray-500">
        Fonti: fantacalcio.it (statistiche, formazioni, infortunati) · sport.sky.it (allenatori) · whoscored.com (classifica)
      </div>
    </>
  );
}

export default function SyncReport({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-green-400" />
              Dati scaricati dai siti
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              fonti: fantacalcio.it · sport.sky.it · whoscored.com
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition"
            aria-label="Chiudi"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <SyncReportContent />
      </div>
    </div>
  );
}
