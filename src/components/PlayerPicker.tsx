import { useMemo, useRef, useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import type { PlayerDB, Ruolo } from '../types';
import { PLAYER_DB, RUOLO_STYLES } from '../constants';

interface Props {
  selectedRole: Ruolo | 'ALL';
  onPick: (p: PlayerDB) => void;
  excludeNames: Set<string>;
}

export default function PlayerPicker({ selectedRole, onPick, excludeNames }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toUpperCase();
    let pool = PLAYER_DB;
    if (selectedRole !== 'ALL') pool = pool.filter((p) => p.ruolo === selectedRole);
    if (q) {
      pool = pool.filter(
        (p) =>
          p.nome.toUpperCase().includes(q) ||
          p.squadra.toUpperCase().includes(q),
      );
    }
    return [...pool]
      .sort((a, b) => b.qt - a.qt)
      .slice(0, 50);
  }, [query, selectedRole]);

  useEffect(() => {
    setHighlight(0);
  }, [query, selectedRole]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function pick(p: PlayerDB) {
    onPick(p);
    setQuery('');
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter' && results[highlight]) {
      e.preventDefault();
      pick(results[highlight]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Cerca calciatore o squadra…"
          className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-10 pr-9 py-2.5 text-white focus:outline-none focus:border-green-500 transition"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setOpen(false);
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <ul className="absolute z-50 mt-1.5 w-full max-h-72 overflow-y-auto bg-gray-900 border border-gray-700 rounded-lg shadow-2xl">
          {results.map((p, i) => {
            const style = RUOLO_STYLES[p.ruolo];
            const taken = excludeNames.has(p.nome.toUpperCase());
            return (
              <li key={`${p.nome}-${p.squadra}-${p.ruolo}`}>
                <button
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => !taken && pick(p)}
                  disabled={taken}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left transition ${
                    i === highlight ? 'bg-gray-800' : ''
                  } ${taken ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-800'}`}
                >
                  <span className={`w-7 h-7 ${style.bg} rounded flex items-center justify-center font-bold text-xs text-white shrink-0`}>
                    {p.ruolo}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-white truncate">
                      {p.nome} {taken && <span className="text-gray-500 text-xs">(in rosa)</span>}
                    </div>
                    <div className="text-xs text-gray-400">{p.squadra} · {p.eta} anni</div>
                  </div>
                  <span className="text-sm font-bold text-green-400 shrink-0">Q {p.qt}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {open && results.length === 0 && (
        <div className="absolute z-50 mt-1.5 w-full bg-gray-900 border border-gray-700 rounded-lg shadow-2xl px-4 py-3 text-sm text-gray-500">
          Nessun giocatore trovato per "{query}"
        </div>
      )}
    </div>
  );
}
