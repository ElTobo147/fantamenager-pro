import { useState, useEffect, useCallback } from 'react';
import type { Player, PlayerStatsData } from '../types';
import {
  getRoster, saveRoster as dbSaveRoster, removeRosterEntry, addRosterEntry,
  type RosterEntry,
} from '../lib/localDb';
import { defaultBonus } from '../lib/players';
import { getPlayerStats } from '../data/stats';

export function useRoster() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadFromLocalDb();
  }, []);

  function rowToPlayer(row: RosterEntry): Player {
    const stats: PlayerStatsData = getPlayerStats(row.nome, row.squadra, row.ruolo, row.qt);
    return {
      id: row.id,
      nome: row.nome,
      squadra: row.squadra,
      ruolo: row.ruolo,
      qt: row.qt,
      eta: row.eta,
      bonus: row.bonus,
      percentualeTitolarita: row.percentuale_titolarita,
      stats,
    };
  }

  function loadFromLocalDb() {
    try {
      const rows = getRoster();
      setPlayers(rows.map(rowToPlayer));
      setError('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const addPlayer = useCallback((p: Omit<Player, 'id' | 'bonus' | 'percentualeTitolarita'> & Partial<Player>) => {
    const entry: RosterEntry = {
      id: crypto.randomUUID(),
      nome: p.nome,
      squadra: p.squadra,
      ruolo: p.ruolo,
      qt: p.qt,
      eta: p.eta ?? 0,
      bonus: p.bonus ?? defaultBonus(),
      percentuale_titolarita: p.percentualeTitolarita ?? 1,
    };
    addRosterEntry(entry);
    setPlayers((prev) => [...prev, rowToPlayer(entry)]);
  }, []);

  const removePlayer = useCallback((id: string) => {
    setPlayers((prev) => prev.filter((p) => p.id !== id));
    removeRosterEntry(id);
  }, []);

  const setPlayersDirect = useCallback((newPlayers: Player[]) => {
    setPlayers(newPlayers);
  }, []);

  const reload = useCallback(() => loadFromLocalDb(), []);

  const saveAll = useCallback(async (updated: Player[]): Promise<boolean> => {
    try {
      const rows: RosterEntry[] = updated.map((p) => ({
        id: p.id,
        nome: p.nome,
        squadra: p.squadra,
        ruolo: p.ruolo,
        qt: p.qt,
        eta: p.eta,
        bonus: p.bonus,
        percentuale_titolarita: p.percentualeTitolarita,
      }));
      dbSaveRoster(rows);
      setError('');
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    }
  }, []);

  return { players, loading, error, addPlayer, removePlayer, setPlayers: setPlayersDirect, reload, saveAll };
}
