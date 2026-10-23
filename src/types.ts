export type Ruolo = 'P' | 'D' | 'C' | 'A';

export interface PlayerDB {
  nome: string;
  squadra: string;
  ruolo: Ruolo;
  qt: number;
  eta: number;
}

export interface PlayerStatsData {
  gol: number;
  assist: number;
  xg: number;
  xa: number;
}

export interface Player extends PlayerDB {
  id: string;
  bonus: number;
  percentualeTitolarita: number;
  stats?: PlayerStatsData | null;
  xfp?: number;
}

export interface MatchInfo {
  avversario: string;
  casa: boolean;
}

export type Calendario = Record<string, MatchInfo>;

export interface Formazione {
  modulo: string;
  titolari: {
    P: Player[];
    D: Player[];
    C: Player[];
    A: Player[];
  };
  panchina: Player[];
  totaleXfp: number;
  capitano: Player | null;
  viceCapitano: Player | null;
}

export interface Module {
  id: string;
  label: string;
  D: number;
  C: number;
  A: number;
}

export type TeamTier = 'S' | 'A' | 'B' | 'C' | 'D';

export interface CoachInfo {
  squadra: string;
  allenatore: string;
  stile: 'offensivo' | 'difensivo' | 'bilanciato';
}
