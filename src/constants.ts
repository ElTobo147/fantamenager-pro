import type { Ruolo, PlayerDB } from './types';
import PLAYERS_JSON from './data/players.json';

export const SERIE_A_TEAMS = [
  'Atalanta', 'Bologna', 'Cagliari', 'Como', 'Fiorentina',
  'Frosinone', 'Genoa', 'Inter', 'Juventus', 'Lazio', 'Lecce',
  'Milan', 'Monza', 'Napoli', 'Parma', 'Roma', 'Sassuolo',
  'Torino', 'Udinese', 'Venezia',
] as const;

export const RUOLI: { value: Ruolo; label: string }[] = [
  { value: 'P', label: 'Portiere' },
  { value: 'D', label: 'Difensore' },
  { value: 'C', label: 'Centrocampista' },
  { value: 'A', label: 'Attaccante' },
];

export const RUOLO_STYLES: Record<Ruolo, { bg: string; border: string; text: string }> = {
  P: { bg: 'bg-yellow-500', border: 'border-yellow-500', text: 'text-yellow-400' },
  D: { bg: 'bg-green-500', border: 'border-green-500', text: 'text-green-400' },
  C: { bg: 'bg-blue-500', border: 'border-blue-500', text: 'text-blue-400' },
  A: { bg: 'bg-red-500', border: 'border-red-500', text: 'text-red-400' },
};

export const MODULES: { id: string; label: string; D: number; C: number; A: number; category: 'Standard' | 'Extra' }[] = [
  { id: '3-4-3', label: '3-4-3', D: 3, C: 4, A: 3, category: 'Standard' },
  { id: '3-5-2', label: '3-5-2', D: 3, C: 5, A: 2, category: 'Standard' },
  { id: '4-3-3', label: '4-3-3', D: 4, C: 3, A: 3, category: 'Standard' },
  { id: '4-5-1', label: '4-5-1', D: 4, C: 5, A: 1, category: 'Standard' },
  { id: '5-3-2', label: '5-3-2', D: 5, C: 3, A: 2, category: 'Standard' },
  { id: '5-4-1', label: '5-4-1', D: 5, C: 4, A: 1, category: 'Standard' },
  { id: '2-2-6', label: '2-2-6', D: 2, C: 2, A: 6, category: 'Extra' },
  { id: '2-3-5', label: '2-3-5', D: 2, C: 3, A: 5, category: 'Extra' },
  { id: '2-4-4', label: '2-4-4', D: 2, C: 4, A: 4, category: 'Extra' },
  { id: '2-5-3', label: '2-5-3', D: 2, C: 5, A: 3, category: 'Extra' },
  { id: '2-6-2', label: '2-6-2', D: 2, C: 6, A: 2, category: 'Extra' },
  { id: '2-7-1', label: '2-7-1', D: 2, C: 7, A: 1, category: 'Extra' },
  { id: '3-1-6', label: '3-1-6', D: 3, C: 1, A: 6, category: 'Extra' },
  { id: '3-2-5', label: '3-2-5', D: 3, C: 2, A: 5, category: 'Extra' },
  { id: '3-3-4', label: '3-3-4', D: 3, C: 3, A: 4, category: 'Extra' },
  { id: '3-6-1', label: '3-6-1', D: 3, C: 6, A: 1, category: 'Extra' },
  { id: '4-1-5', label: '4-1-5', D: 4, C: 1, A: 5, category: 'Extra' },
  { id: '4-2-4', label: '4-2-4', D: 4, C: 2, A: 4, category: 'Extra' },
  { id: '5-1-4', label: '5-1-4', D: 5, C: 1, A: 4, category: 'Extra' },
  { id: '5-2-3', label: '5-2-3', D: 5, C: 2, A: 3, category: 'Extra' },
  { id: '6-1-3', label: '6-1-3', D: 6, C: 1, A: 3, category: 'Extra' },
  { id: '6-2-2', label: '6-2-2', D: 6, C: 2, A: 2, category: 'Extra' },
  { id: '6-3-1', label: '6-3-1', D: 6, C: 3, A: 1, category: 'Extra' },
];

export const ROSA_LIMITS: Record<Ruolo, number> = {
  P: 3,
  D: 8,
  C: 8,
  A: 6,
};

export interface TeamMetrics {
  xG: number;
  goals: number;
}

export const TEAM_METRICS: Record<string, TeamMetrics> = {
  Inter: { xG: 16.9, goals: 18 },
  Roma: { xG: 13.9, goals: 14 },
  Sassuolo: { xG: 11.9, goals: 12 },
  Genoa: { xG: 11.1, goals: 13 },
  Como: { xG: 10.8, goals: 9 },
  Monza: { xG: 10.4, goals: 9 },
  Napoli: { xG: 10.3, goals: 10 },
  Venezia: { xG: 9.9, goals: 5 },
  Juventus: { xG: 9.7, goals: 9 },
  Lazio: { xG: 9.6, goals: 11 },
  Fiorentina: { xG: 9.4, goals: 7 },
  Milan: { xG: 9.1, goals: 11 },
  Frosinone: { xG: 8.5, goals: 9 },
  Bologna: { xG: 7.9, goals: 5 },
  Udinese: { xG: 7.8, goals: 9 },
  Torino: { xG: 7.7, goals: 7 },
  Lecce: { xG: 6.8, goals: 6 },
  Atalanta: { xG: 6.3, goals: 8 },
  Parma: { xG: 3.9, goals: 4 },
};

export const PLAYER_DB: PlayerDB[] = PLAYERS_JSON as PlayerDB[];
