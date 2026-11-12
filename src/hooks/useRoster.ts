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

  function rowToPlayer(row: {
    id: string;
    nome: string;
    squadra: string;
    ruolo: Player['ruolo'];
    qt: number;
    eta: number;
    bonus: number;
    percentuale_titolarita: number;
  }): Player {
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

  async function loadFromSupabase() {
    try {
      const { data, error: dbError } = await supabase
        .from('roster_entries')
        .select('*')
        .order('created_at', { ascending: true });

      if (dbError) throw dbError;
      setPlayers((data ?? []).map(rowToPlayer));
      setError('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const addPlayer = useCallback((p: Omit<Player, 'id' | 'bonus' | 'percentualeTitolarita'> & Partial<Player>) => {
    const full: Omit<Player, 'id'> = {
      bonus: randomBonus(),
      percentualeTitolarita: 1,
      ...p,
    } as Omit<Player, 'id'>;
    // Insert into Supabase first; the select below is the source of truth.
    (async () => {
      const { data, error: insertError } = await supabase
        .from('roster_entries')
        .insert({
          nome: full.nome,
          squadra: full.squadra,
          ruolo: full.ruolo,
          qt: full.qt,
          eta: full.eta,
          bonus: full.bonus,
          percentuale_titolarita: full.percentualeTitolarita,
        })
        .select('*')
        .single();
      if (insertError || !data) {
        setError(insertError?.message ?? 'Inserimento non riuscito');
        return;
      }
      setPlayers((prev) => [...prev, rowToPlayer(data)]);
    })();
  }, []);

  const removePlayer = useCallback((id: string) => {
    setPlayers((prev) => prev.filter((p) => p.id !== id));
    (async () => {
      const { error: deleteError } = await supabase
        .from('roster_entries')
        .delete()
        .eq('id', id);
      if (deleteError) {
        setError(deleteError.message);
        loadFromSupabase();
      }
    })();
  }, []);

  const setPlayersDirect = useCallback((newPlayers: Player[]) => {
    setPlayers(newPlayers);
  }, []);

  const reload = useCallback(() => loadFromSupabase(), []);

  return { players, loading, error, addPlayer, removePlayer, setPlayers: setPlayersDirect, reload };
}
