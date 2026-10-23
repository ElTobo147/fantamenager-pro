import { useState, useEffect, useCallback } from 'react';
import type { Player, PlayerStatsData } from '../types';
import { supabase } from '../lib/supabase';
import { randomBonus } from '../lib/players';
import { getPlayerStats } from '../data/stats';

export function useRoster() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadFromSupabase();
  }, []);

  async function loadFromSupabase() {
    try {
      const { data, error: dbError } = await supabase
        .from('roster_entries')
        .select('*')
        .order('created_at', { ascending: true });

      if (dbError) throw dbError;

      if (data && data.length > 0) {
        const loaded: Player[] = data.map((row) => {
          const stats = getPlayerStats(row.nome, row.squadra, row.ruolo, row.qt);
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
        });
        setPlayers(loaded);
      }
    } catch (e) {
      // Fallback to localStorage if Supabase fails
      try {
        const raw = localStorage.getItem('fantaRosa2027');
        if (raw) {
          const loaded = JSON.parse(raw) as Player[];
          setPlayers(loaded.map((p) => ({ ...p, stats: getPlayerStats(p.nome, p.squadra, p.ruolo, p.qt) })));
        }
      } catch {
        // ignore
      }
    } finally {
      setLoading(false);
    }
  }

  async function persistToSupabase(updated: Player[]) {
    try {
      // Delete all and re-insert (simple sync for single-tenant)
      await supabase.from('roster_entries').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (updated.length > 0) {
        const rows = updated.map((p) => ({
          id: p.id,
          nome: p.nome,
          squadra: p.squadra,
          ruolo: p.ruolo,
          qt: p.qt,
          eta: p.eta,
          bonus: p.bonus,
          percentuale_titolarita: p.percentualeTitolarita,
        }));
        await supabase.from('roster_entries').insert(rows);
      }
    } catch {
      // Fallback to localStorage
      try {
        localStorage.setItem('fantaRosa2027', JSON.stringify(updated));
      } catch {
        // ignore
      }
    }
  }

  const addPlayer = useCallback((p: Player) => {
    setPlayers((prev) => {
      const updated = [...prev, p];
      persistToSupabase(updated);
      return updated;
    });
  }, []);

  const removePlayer = useCallback((id: string) => {
    setPlayers((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      persistToSupabase(updated);
      return updated;
    });
  }, []);

  const setPlayersDirect = useCallback((newPlayers: Player[]) => {
    setPlayers(newPlayers);
    persistToSupabase(newPlayers);
  }, []);

  return { players, loading, error, addPlayer, removePlayer, setPlayers: setPlayersDirect, reload: loadFromSupabase };
}
