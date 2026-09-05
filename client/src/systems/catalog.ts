/**
 * systems/catalog.ts — Punto de acceso al catálogo REAL de armas y poderes (Shrek).
 *
 * PUCK: los nombres reales para alinear data/catalog.ts de la UI viven aquí.
 * El contrato (types.ts) no cambia: esto extiende WeaponStats/PowerStats.
 */

export { WEAPONS, WEAPON_LIST } from './weapon-catalog';
export type { WeaponConfig } from './weapon-catalog';
export { POWERS, POWER_LIST } from './power-catalog';
export type { PowerConfig } from './power-catalog';