import { useMemo, useState } from 'react';
import { Users, Layout, RotateCcw, RefreshCw, BarChart3, Save, Check, DownloadCloud } from 'lucide-react';
import type { Player, PlayerDB } from './types';
import { PLAYER_DB } from './constants';
import { randomBonus } from './lib/players';
import { getPlayerStats } from './data/stats';
import { getTitolarita, hasTitolaritaData, TITOLARE_VALUE } from './data/titolarita';
import { useMatchday } from './hooks/useMatchday';
import { useRoster } from './hooks/useRoster';
import { useLiveData } from './hooks/useLiveData';
import { supabase } from './lib/supabase';
import RosterManager from './components/RosterManager';
import FormationView from './components/FormationView';
import MatchdaySelector from './components/MatchdaySelector';
import MatchInsights from './components/MatchInsights';

type Tab = 'rosa' | 'formazione' | 'pronostici';

const SAMPLE: { nome: string; squadra: string; ruolo: PlayerDB['ruolo'] }[] = [
  { nome: 'SVILAR', squadra: 'Roma', ruolo: 'P' },
  { nome: 'VICARIO', squadra: 'Juventus', ruolo: 'P' },
  { nome: 'BREMER', squadra: 'Juventus', ruolo: 'D' },
  { nome: 'BASTONI', squadra: 'Inter', ruolo: 'D' },
  { nome: 'DI LORENZO', squadra: 'Napoli', ruolo: 'D' },
  { nome: 'SCALVINI', squadra: 'Atalanta', ruolo: 'D' },
  { nome: 'CALHANOGLU', squadra: 'Inter', ruolo: 'C' },
  { nome: 'BARELLA', squadra: 'Inter', ruolo: 'C' },
  { nome: 'DE BRUYNE', squadra: 'Napoli', ruolo: 'C' },
  { nome: 'MCTOMINAY', squadra: 'Napoli', ruolo: 'C' },
  { nome: 'MARTINEZ', squadra: 'Inter', ruolo: 'A' },
  { nome: 'THURAM', squadra: 'Inter', ruolo: 'A' },
  { nome: 'PULISIC', squadra: 'Milan', ruolo: 'A' },
  { nome: 'KEAN', squadra: 'Como', ruolo: 'A' },
];

function makePlayer(db: PlayerDB): Player {
  return {
    ...db,
    id: crypto.randomUUID(),
    bonus: randomBonus(),
    percentualeTitolarita: 1,
    stats: getPlayerStats(db.nome, db.squadra, db.ruolo, db.qt),
  };
}

function App() {
  const [tab, setTab] = useState<Tab>('rosa');
  const [savedFlash, setSavedFlash] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const { players, loading, addPlayer, removePlayer, setPlayers } = useRoster();
  const { matchdayNum, calendario, changeMatchday } = useMatchday();
  const live = useLiveData(matchdayNum);

  const playersWithTitolarita = useMemo(
    () => players.map((p) => ({
      ...p,
      percentualeTitolarita: hasTitolaritaData(matchdayNum)
        ? getTitolarita(matchdayNum, p.nome, p.squadra)
        : TITOLARE_VALUE,
    })),
    [players, matchdayNum, live.loaded],
  );

  function loadSample() {
    const samples: Player[] = SAMPLE.map((s) => {
      const db = PLAYER_DB.find(
        (p) => p.nome === s.nome && p.squadra === s.squadra && p.ruolo === s.ruolo,
      );
      if (!db) return null;
      return makePlayer(db);
    }).filter(Boolean) as Player[];
    setPlayers(samples);
  }

  function resetData() {
    if (confirm('Vuoi cancellare tutta la rosa?')) {
      setPlayers([]);
    }
  }

  async function aggiornaDati() {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY;
      const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-stats?force=true`;
      const resp = await fetch(fnUrl, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!resp.ok) throw new Error(`Errore ${resp.status}`);
      const body = await resp.json();
      if (body.error) throw new Error(body.error);
      const r = body.results ?? {};
      const parts: string[] = [];
      if (r.formazioni?.count != null) parts.push(`${r.formazioni.count} formazioni`);
      if (r.infortunati?.count != null) parts.push(`${r.infortunati.count} squadre infortunati`);
      if (r.stats?.count != null) parts.push(`${r.stats.count} statistiche`);
      const failed = Object.entries(r).filter(([, v]) => (v as { status?: string }).status === 'error');
      if (failed.length > 0) {
        setSyncMessage(`Aggiornamento parziale: ${parts.join(', ') || 'nessun dato'}. Riprova più tardi.`);
      } else {
        setSyncMessage(`Dati aggiornati: ${parts.join(', ')}`);
      }
      live.refresh();
    } catch (e) {
      setSyncMessage(`Aggiornamento non riuscito: ${(e as Error).message}`);
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(null), 6000);
    }
  }

  function saveRosa() {
    try {
      localStorage.setItem('fantaRosa2027', JSON.stringify(players));
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } catch {
      // ignore
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-green-400 animate-spin" />
          <p className="text-gray-400">Caricamento rosa…</p>
        </div>
      </div>
    );
  }

  // Auto-load sample if roster is empty and user hasn't interacted
  if (players.length === 0 && tab === 'rosa') {
    // Show empty state with option to load sample
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
      <header className="bg-gray-800/80 backdrop-blur border-b border-gray-700/60 px-4 py-3.5 shadow-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center font-bold text-xl text-white shadow-lg shadow-green-600/30">
              FM
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold text-white leading-tight">FantaManager Pro</h1>
              <p className="text-xs text-gray-400">Serie A 2026/2027 — Valutazione Dinamica xFP</p>
            </div>
          </div>
          <div className="flex gap-2 md:gap-3 items-center">
            <MatchdaySelector value={matchdayNum} onChange={changeMatchday} />
            <button
              onClick={aggiornaDati}
              disabled={syncing}
              className="px-3 md:px-4 py-2 rounded-lg font-semibold text-sm transition flex items-center gap-2 bg-green-600/90 hover:bg-green-500 text-white disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-green-600/20"
            >
              <DownloadCloud className={`w-4 h-4 ${syncing ? 'animate-bounce' : ''}`} />
              <span className="hidden sm:inline">{syncing ? 'Aggiornamento…' : 'Aggiorna dati'}</span>
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => setTab('rosa')}
                className={`px-3 md:px-4 py-2 rounded-lg font-semibold text-sm transition flex items-center gap-2 ${
                  tab === 'rosa' ? 'bg-gray-700 text-white' : 'bg-transparent text-gray-400 hover:bg-gray-800'
                }`}
              >
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Rosa</span>
              </button>
              <button
                onClick={() => setTab('formazione')}
                className={`px-3 md:px-4 py-2 rounded-lg font-semibold text-sm transition flex items-center gap-2 ${
                  tab === 'formazione' ? 'bg-gray-700 text-white' : 'bg-transparent text-gray-400 hover:bg-gray-800'
                }`}
              >
                <Layout className="w-4 h-4" />
                <span className="hidden sm:inline">Formazione</span>
              </button>
              <button
                onClick={() => setTab('pronostici')}
                className={`px-3 md:px-4 py-2 rounded-lg font-semibold text-sm transition flex items-center gap-2 ${
                  tab === 'pronostici' ? 'bg-gray-700 text-white' : 'bg-transparent text-gray-400 hover:bg-gray-800'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">Pronostici</span>
              </button>
              <button
                onClick={resetData}
                className="px-3 py-2 bg-red-900/40 text-red-400 border border-red-800/50 rounded-lg text-sm hover:bg-red-800/60 hover:text-white transition flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="hidden md:inline">Svuota</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {syncMessage ? (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-gray-800 border border-gray-600 text-gray-100 text-sm px-4 py-2.5 rounded-lg shadow-xl max-w-md text-center">
          {syncMessage}
        </div>
      ) : null}

      <main className="max-w-6xl mx-auto p-4 mt-4 mb-8">
        {players.length === 0 && tab === 'rosa' ? (
          <div className="text-center py-16">
            <p className="text-lg text-gray-400 mb-4">La tua rosa è vuota</p>
            <button
              onClick={loadSample}
              className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded-lg transition shadow-lg"
            >
              Carica rosa di esempio
            </button>
            <p className="text-sm text-gray-500 mt-3">Oppure cerca e aggiungi giocatori dal listone qui sotto</p>
          </div>
        ) : null}
        {tab === 'rosa' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-400">
                {players.length} giocatori in rosa · Salvataggio automatico su database
              </p>
              <button
                onClick={saveRosa}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition flex items-center gap-2 shadow-lg ${
                  savedFlash
                    ? 'bg-green-600 text-white'
                    : 'bg-green-600/80 hover:bg-green-500 text-white'
                }`}
              >
                {savedFlash ? (
                  <>
                    <Check className="w-4 h-4" />
                    Rosa Salvata!
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Salva Rosa
                  </>
                )}
              </button>
            </div>
            <RosterManager players={playersWithTitolarita} onAdd={addPlayer} onRemove={removePlayer} calendario={calendario} matchdayNum={matchdayNum} />
          </div>
        ) : tab === 'formazione' ? (
          <FormationView players={playersWithTitolarita} calendario={calendario} matchdayNum={matchdayNum} />
        ) : (
          <MatchInsights players={playersWithTitolarita} calendario={calendario} matchdayNum={matchdayNum} />
        )}
      </main>
    </div>
  );
}

export default App;
