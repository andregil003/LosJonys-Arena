/**
 * balance.ts — Balance de gameplay del servidor (Shrek).
 *
 * Espejo del catálogo cliente (client/src/systems/) pero para la lógica
 * autoritativa del server. IDs del contrato: w1..w5 / p1..p5.
 * NO tocar state.ts (PUCK).
 *
 * Daño de armas +40% (v1.1, kill rate partida solitaria ~1-2 min):
 *   w1 14→20 · w2 11→15 · w3 60→84 · w4 6→8 · w5 45→63
 */

// ============ ARMAS (w1..w5) ============

export interface WeaponBalance {
  id: string;
  name: string;
  damage: number;
  /** Disparos por minuto (por claridad al ajustar) */
  fireRateMs: number;
  pellets: number;
  spreadDeg: number;
  pelletSpeed: number;
  range: number;
  /** Tiempo de preparación antes del disparo (sniper) */
  windupMs: number;
  explosive: boolean;
  explosionRadius: number;
  auto: boolean;
}

export const WEAPONS: Record<string, WeaponBalance> = {
  w1: {
    id: 'w1', name: 'Escopeta',
    damage: 20, fireRateMs: 900, pellets: 8, spreadDeg: 34,
    pelletSpeed: 720, range: 300, windupMs: 0, explosive: false,
    explosionRadius: 0, auto: false,
  },
  w2: {
    id: 'w2', name: 'Rifle de asalto',
    damage: 15, fireRateMs: 125, pellets: 1, spreadDeg: 6,
    pelletSpeed: 950, range: 560, windupMs: 0, explosive: false,
    explosionRadius: 0, auto: true,
  },
  w3: {
    id: 'w3', name: 'Sniper',
    damage: 84, fireRateMs: 1500, pellets: 1, spreadDeg: 0,
    pelletSpeed: 1500, range: 980, windupMs: 550, explosive: false,
    explosionRadius: 0, auto: false,
  },
  w4: {
    id: 'w4', name: 'SMG',
    damage: 8, fireRateMs: 85, pellets: 1, spreadDeg: 15,
    pelletSpeed: 820, range: 380, windupMs: 0, explosive: false,
    explosionRadius: 0, auto: true,
  },
  w5: {
    id: 'w5', name: 'Lanzagranadas',
    damage: 63, fireRateMs: 1100, pellets: 1, spreadDeg: 0,
    pelletSpeed: 400, range: 640, windupMs: 0, explosive: true,
    explosionRadius: 95, auto: false,
  },
};

// ============ PODERES (p1..p5) ============

export interface PowerBalance {
  id: string;
  name: string;
  cooldownMs: number;
  /** Tiempo de carga antes del efecto (kamehameha) */
  windupMs: number;
  durationMs: number;
  /** Velocidad de dash / orbe de ceguera (px/s) */
  speed: number;
  damage: number;
  /** Rango/radio de efecto en px */
  radius: number;
}

export const POWERS: Record<string, PowerBalance> = {
  p1: { id: 'p1', name: 'Kamehameha', cooldownMs: 10000, windupMs: 900, durationMs: 400, speed: 0, damage: 150, radius: 60 },
  p2: { id: 'p2', name: 'Dash', cooldownMs: 3000, windupMs: 0, durationMs: 180, speed: 950, damage: 0, radius: 0 },
  p3: { id: 'p3', name: 'Escudo', cooldownMs: 8000, windupMs: 0, durationMs: 3000, speed: 0, damage: 0, radius: 0 },
  p4: { id: 'p4', name: 'Ceguera', cooldownMs: 10000, windupMs: 0, durationMs: 2500, speed: 640, damage: 0, radius: 45 },
  p5: { id: 'p5', name: 'Teletransporte', cooldownMs: 7000, windupMs: 0, durationMs: 0, speed: 0, damage: 0, radius: 0 },
};

// ============ CUCHILLO ============

export const KNIFE = {
  cooldownMs: 900,
  range: 58,
  halfAngle: 0.95, // ~54° a cada lado de la mira
  instakill: true,
} as const;

// ============ JUGADOR ============

export const PLAYER_BALANCE = {
  maxHp: 100,
  // La barra de Super se carga con daño hecho/recibido:
  // chargeGain = damage * (chargeFactor / powerChargeRequired)
  chargeRequired: 450,
  /** Multiplica el daño recibido para cargar la barra */
  chargeFromDamageTaken: 0.5,
} as const;

// ============ UTILIDADES GEO ============

export function angleDiff(a: number, b: number): number {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

export function dist(x1: number, y1: number, x2: number, y2: number): number {
  return Math.hypot(x2 - x1, y2 - y1);
}