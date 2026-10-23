import type { Player, Formazione, Calendario, Module } from '../types';
import { calcolaXfp } from './players';

const STANDARD_MODULES: Module[] = [
  { id: '3-4-3', label: '3-4-3', D: 3, C: 4, A: 3 },
  { id: '3-5-2', label: '3-5-2', D: 3, C: 5, A: 2 },
  { id: '4-3-3', label: '4-3-3', D: 4, C: 3, A: 3 },
  { id: '4-4-2', label: '4-4-2', D: 4, C: 4, A: 2 },
  { id: '4-5-1', label: '4-5-1', D: 4, C: 5, A: 1 },
  { id: '5-3-2', label: '5-3-2', D: 5, C: 3, A: 2 },
  { id: '5-4-1', label: '5-4-1', D: 5, C: 4, A: 1 },
];

const EXTRA_MODULES: Module[] = [
  { id: '3-2-5', label: '3-2-5', D: 3, C: 2, A: 5 },
  { id: '3-3-4', label: '3-3-4', D: 3, C: 3, A: 4 },
  { id: '4-2-4', label: '4-2-4', D: 4, C: 2, A: 4 },
  { id: '2-3-5', label: '2-3-5', D: 2, C: 3, A: 5 },
  { id: '4-1-5', label: '4-1-5', D: 4, C: 1, A: 5 },
  { id: '5-2-3', label: '5-2-3', D: 5, C: 2, A: 3 },
];

export const ALL_MODULES = [...STANDARD_MODULES, ...EXTRA_MODULES];

export function calcolaFormazioneOttimale(
  players: Player[],
  calendario: Calendario,
  matchdayNum: number,
): Formazione | null {
  const portieri = players
    .filter((p) => p.ruolo === 'P')
    .sort((a, b) => calcolaXfp(b, calendario, matchdayNum) - calcolaXfp(a, calendario, matchdayNum));
  const difensori = players
    .filter((p) => p.ruolo === 'D')
    .sort((a, b) => calcolaXfp(b, calendario, matchdayNum) - calcolaXfp(a, calendario, matchdayNum));
  const centrocampisti = players
    .filter((p) => p.ruolo === 'C')
    .sort((a, b) => calcolaXfp(b, calendario, matchdayNum) - calcolaXfp(a, calendario, matchdayNum));
  const attaccanti = players
    .filter((p) => p.ruolo === 'A')
    .sort((a, b) => calcolaXfp(b, calendario, matchdayNum) - calcolaXfp(a, calendario, matchdayNum));

  if (portieri.length < 1) return null;

  let best: Formazione | null = null;
  let bestScore = -Infinity;

  for (const mod of ALL_MODULES) {
    if (
      difensori.length < mod.D ||
      centrocampisti.length < mod.C ||
      attaccanti.length < mod.A
    ) {
      continue;
    }

    const titP = portieri.slice(0, 1);
    const titD = difensori.slice(0, mod.D);
    const titC = centrocampisti.slice(0, mod.C);
    const titA = attaccanti.slice(0, mod.A);

    const titolari = [...titP, ...titD, ...titC, ...titA];
    const titolariIds = new Set(titolari.map((p) => p.id));
    const panchina = players
      .filter((p) => !titolariIds.has(p.id))
      .sort((a, b) => calcolaXfp(b, calendario, matchdayNum) - calcolaXfp(a, calendario, matchdayNum));

    const totaleXfp = titolari.reduce(
      (sum, p) => sum + calcolaXfp(p, calendario, matchdayNum),
      0,
    );

    if (totaleXfp > bestScore) {
      bestScore = totaleXfp;
      const allTitolari = [...titP, ...titD, ...titC, ...titA];
      const sortedByXfp = [...allTitolari].sort(
        (a, b) => calcolaXfp(b, calendario, matchdayNum) - calcolaXfp(a, calendario, matchdayNum),
      );
      best = {
        modulo: mod.id,
        titolari: { P: titP, D: titD, C: titC, A: titA },
        panchina,
        totaleXfp,
        capitano: sortedByXfp[0] ?? null,
        viceCapitano: sortedByXfp[1] ?? null,
      };
    }
  }

  return best;
}

export function formazioneToWhatsApp(formazione: Formazione, calendario: Calendario, matchdayNum: number): string {
  const lines: string[] = [];
  lines.push(`⚽ *FantaManager Pro — Modulo ${formazione.modulo} · Giornata ${matchdayNum}*`);
  lines.push(`Punteggio atteso: *${formazione.totaleXfp.toFixed(1)}*`);
  if (formazione.capitano) {
    const capXfp = calcolaXfp(formazione.capitano, calendario, matchdayNum);
    const capBonus = (capXfp - Math.floor(capXfp)).toFixed(1);
    lines.push(`👑 *Capitano: ${formazione.capitano.nome}* (${formazione.capitano.squadra}) — xFP ${capXfp.toFixed(1)} (bonus pagella +${capBonus})`);
  }
  if (formazione.viceCapitano) {
    const viceXfp = calcolaXfp(formazione.viceCapitano, calendario, matchdayNum);
    lines.push(`⭐ *Vice: ${formazione.viceCapitano.nome}* (${formazione.viceCapitano.squadra}) — xFP ${viceXfp.toFixed(1)}`);
  }
  lines.push('');

  const roleLabel: Record<string, string> = { P: 'Portiere', D: 'Difesa', C: 'Centrocampo', A: 'Attacco' };
  (['P', 'D', 'C', 'A'] as const).forEach((r) => {
    lines.push(`*${roleLabel[r]}:*`);
    formazione.titolari[r].forEach((p) => {
      const xfp = calcolaXfp(p, calendario, matchdayNum).toFixed(1);
      const isCap = formazione.capitano?.id === p.id;
      const isVice = formazione.viceCapitano?.id === p.id;
      const marker = isCap ? ' 👑' : isVice ? ' ⭐' : '';
      lines.push(`  ${p.nome} (${p.squadra}) — xFP ${xfp}${marker}`);
    });
    lines.push('');
  });

  lines.push('*Panchina:*');
  formazione.panchina.forEach((p) => {
    const xfp = calcolaXfp(p, calendario, matchdayNum).toFixed(1);
    lines.push(`  ${p.nome} (${p.squadra}) — xFP ${xfp}`);
  });

  return lines.join('\n');
}
