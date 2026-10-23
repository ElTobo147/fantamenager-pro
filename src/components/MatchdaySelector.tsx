import { Calendar } from 'lucide-react';
import { CALENDAR } from '../data/calendar';

interface Props {
  value: number;
  onChange: (num: number) => void;
}

export default function MatchdaySelector({ value, onChange }: Props) {
  const current = CALENDAR.find((m) => m.num === value);
  return (
    <div className="flex items-center gap-3 bg-gray-800/70 backdrop-blur border border-gray-700/60 rounded-xl px-4 py-2.5">
      <Calendar className="w-4 h-4 text-green-400 shrink-0" />
      <div className="min-w-0">
        <label className="block text-[10px] text-gray-400 uppercase tracking-wide leading-none mb-0.5">
          Giornata
        </label>
        <select
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="bg-transparent text-white font-bold text-sm focus:outline-none cursor-pointer -ml-1"
        >
          {CALENDAR.map((m) => (
            <option key={m.num} value={m.num} className="bg-gray-900">
              {m.num}ª — {m.date}
            </option>
          ))}
        </select>
      </div>
      {current && (
        <div className="hidden md:block text-xs text-gray-500 ml-auto truncate">
          {current.matches.length} partite
        </div>
      )}
    </div>
  );
}
