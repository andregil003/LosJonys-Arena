/**
 * systems/weapon-catalog.ts — Catálogo REAL de armas (Shrek).
 *
 * Territorio: Shrek (gameplay). Estas stats alimentan el sistema de combate.
 * PUCK: los nombres/taglines/colores reales están aquí para alinear
 * data/catalog.ts de la UI (WEAPON_LIST[id].name, .tagline, .color).
 *
 * Balance v1 — ajustable con playtest.
 */

import type { WeaponId, WeaponStats } from '../types';

/** Config extendida de arma: stats del contrato + detalle de gameplay */
export interface WeaponConfig extends WeaponStats {
  /** Nº de proyectiles/rayos por disparo (solo w1) */
  pellets?: number;
  /** Dispersión en radianes (abanico o ráfaga imprecisa) */
  spread?: number;
  /** Radio de explosión en px (solo w5) */
  explosionRadius?: number;
  /** Tiempo de preparación antes del disparo en s (solo w3) */
  windup?: number;
  /** Color del trazador/proyectil en pantalla */
  tracer: string;
  /** Color de la tarjeta en la UI */
  color: string;
  /** Frase corta para la UI */
  tagline: string;
}

export const WEAPONS: Record<WeaponId, WeaponConfig> = {
  w1: {
    id: 'w1',
    name: 'Escopeta',
    tagline: 'Abanico de 8 perdigones, letal de cerca',
    color: '#f97316',
    damage: 12, // por perdigón (x8 = 96 por ráfaga completa)
    fireRate: 1.5,
    range: 280,
    reloadTime: 1.1,
    projectileSpeed: 850,
    hitscan: false,
    pellets: 8,
    spread: 0.3,
    tracer: '#fbbf24',
  },
  w2: {
    id: 'w2',
    name: 'Rifle de asalto',
    tagline: 'Automático y fiable a media distancia',
    color: '#22d3ee',
    damage: 13,
    fireRate: 8,
    range: 640,
    reloadTime: 2.2,
    projectileSpeed: 1500,
    hitscan: true,
    tracer: '#22d3ee',
  },
  w3: {
    id: 'w3',
    name: 'Sniper',
    tagline: 'Un tiro, daño inmenso; pide preparación',
    color: '#a855f7',
    damage: 75,
    fireRate: 0.9,
    range: 1100,
    reloadTime: 1.8,
    projectileSpeed: 2600,
    hitscan: true,
    windup: 0.35,
    tracer: '#e879f9',
  },
  w4: {
    id: 'w4',
    name: 'SMG',
    tagline: 'Ráfaga rapidísima, puntería escasa',
    color: '#eab308',
    damage: 7,
    fireRate: 13,
    range: 420,
    reloadTime: 1.6,
    projectileSpeed: 1200,
    hitscan: true,
    spread: 0.18,
    tracer: '#facc15',
  },
  w5: {
    id: 'w5',
    name: 'Lanzagranadas',
    tagline: 'Explota al impactar, hasta tras la cobertura',
    color: '#ef4444',
    damage: 110,
    fireRate: 0.8,
    range: 700,
    reloadTime: 1.4,
    projectileSpeed: 550,
    hitscan: false,
    explosionRadius: 90,
    tracer: '#f87171',
  },
};

export const WEAPON_LIST: WeaponConfig[] = Object.values(WEAPONS);