/**
 * systems/power-catalog.ts — Catálogo REAL de poderes (Shrek).
 *
 * Territorio: Shrek (gameplay). La barra de Super se carga haciendo/recibiendo
 * daño hasta llegar a chargeRequired (100%); activar consume la barra.
 * PUCK: nombres/descripciones reales aquí para alinear data/catalog.ts (POWERS).
 *
 * Balance v1 — ajustable con playtest.
 */

import type { PowerId, PowerStats } from '../types';

/** Config extendida de poder: stats del contrato + detalle de gameplay */
export interface PowerConfig extends PowerStats {
  /** Duración del efecto en segundos (si aplica) */
  duration?: number;
  /** Radio/área del efecto en px (si aplica) */
  radius?: number;
  /** Distancia de desplazamiento en px (p2, p5) */
  distance?: number;
  /** Color de la tarjeta en la UI */
  color: string;
}

export const POWERS: Record<PowerId, PowerConfig> = {
  p1: {
    id: 'p1',
    name: 'Kamehameha',
    description: 'Carga energía y dispara un rayo gigante que atraviesa todo',
    chargeRequired: 500,
    cooldown: 0.6,
    duration: 1.2, // el rayo emite durante 1.2s
    color: '#3b82f6',
  },
  p2: {
    id: 'p2',
    name: 'Dash',
    description: 'Impulso veloz hacia donde apuntas, con frames de invencibilidad',
    chargeRequired: 400,
    cooldown: 3,
    duration: 0.25, // frames de invencibilidad
    distance: 260,
    color: '#eab308',
  },
  p3: {
    id: 'p3',
    name: 'Escudo',
    description: 'Burbuja que bloquea todo el daño durante unos segundos',
    chargeRequired: 400,
    cooldown: 6,
    duration: 2.5,
    radius: 40,
    color: '#22d3ee',
  },
  p4: {
    id: 'p4',
    name: 'Ceguera',
    description: 'Nube de humo que ciega a los enemigos en el área',
    chargeRequired: 450,
    cooldown: 7,
    duration: 3,
    radius: 180,
    color: '#a855f7',
  },
  p5: {
    id: 'p5',
    name: 'Teletransporte',
    description: 'Marca un punto y vuelve a él al activarlo de nuevo',
    chargeRequired: 500,
    cooldown: 6,
    distance: 420,
    color: '#22c55e',
  },
};

export const POWER_LIST: PowerConfig[] = Object.values(POWERS);