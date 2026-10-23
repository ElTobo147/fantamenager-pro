import type { Player, Ruolo, Calendario } from '../types';
import { RUOLO_STYLES } from '../constants';
import { formatXfp } from '../lib/players';

interface Props {
  player: Player;
  calendario: Calendario;
  matchdayNum: number;
  size?: 'sm' | 'md';
}

export default function PitchPlayer({ player, calendario, matchdayNum, size = 'md' }: Props) {
  const style = RUOLO_STYLES[player.ruolo as Ruolo];
  const dim = size === 'sm' ? 'w-12 h-12' : 'w-16 h-16';

  return (
    <div className="flex flex-col items-center gap-1 group cursor-default">
      <div
        className={`${dim} rounded-full ${style.bg} flex items-center justify-center font-bold text-white shadow-lg ring-2 ring-white/20 transition group-hover:scale-110 group-hover:ring-white/40`}
      >
        {player.ruolo}
      </div>
      <div className="bg-gray-900/80 backdrop-blur rounded-md px-2 py-0.5 text-center max-w-[90px]">
        <div className="text-[11px] font-semibold text-white truncate leading-tight">{player.nome}</div>
        <div className={`text-[10px] ${style.text} font-bold`}>xFP {formatXfp(player, calendario, matchdayNum)}</div>
      </div>
    </div>
  );
}
