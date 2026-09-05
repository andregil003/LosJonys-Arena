/**
 * data/catalog.ts — Catálogo de personalización para la UI (Crea tu Jony).
 *
 * ✅ ALINEADO con el catálogo REAL de Shrek (client/src/systems/weapon-catalog.ts
 * y power-catalog.ts). Los stats de gameplay viven en systems/ (Shrek);
 * aquí solo los datos de UI (nombres, taglines, colores).
 *
 * Territorio: PUCK (UI).
 */

import type { WeaponId, PowerId } from '../types';

// ============================================================
// Colores disponibles para el Jony
// ============================================================

export interface ColorOption {
  id: string;
  hex: string;
  name: string;
}

export const COLORS: ColorOption[] = [
  { id: 'cyan', hex: '#22d3ee', name: 'Cian' },
  { id: 'red', hex: '#ef4444', name: 'Rojo' },
  { id: 'green', hex: '#22c55e', name: 'Verde' },
  { id: 'yellow', hex: '#eab308', name: 'Amarillo' },
  { id: 'purple', hex: '#a855f7', name: 'Morado' },
  { id: 'orange', hex: '#f97316', name: 'Naranja' },
  { id: 'pink', hex: '#ec4899', name: 'Rosa' },
  { id: 'white', hex: '#fafafa', name: 'Blanco' },
];

// ============================================================
// Accesorios disponibles
// ============================================================

export interface AccessoryOption {
  id: string;
  name: string;
  /** Emoji/glifo para el preview (placeholder hasta tener sprites) */
  glyph: string;
}

export const ACCESSORIES: AccessoryOption[] = [
  { id: 'none', name: 'Ninguno', glyph: '' },
  { id: 'hat', name: 'Sombrero', glyph: '🎩' },
  { id: 'glasses', name: 'Gafas', glyph: '🕶️' },
  { id: 'bow', name: 'Moño', glyph: '🎀' },
  { id: 'crown', name: 'Corona', glyph: '👑' },
  { id: 'antenna', name: 'Antenas', glyph: '📡' },
];

// ============================================================
// Armas (alineado con systems/weapon-catalog.ts de Shrek)
// ============================================================

export interface WeaponOption {
  id: WeaponId;
  name: string;
  tagline: string;
  /** Color para la tarjeta en la UI */
  color: string;
}

export const WEAPONS: WeaponOption[] = [
  { id: 'w1', name: 'Escopeta', tagline: 'Abanico de 8 perdigones, letal de cerca', color: '#f97316' },
  { id: 'w2', name: 'Rifle de asalto', tagline: 'Automático y fiable a media distancia', color: '#22d3ee' },
  { id: 'w3', name: 'Sniper', tagline: 'Un tiro, daño inmenso; pide preparación', color: '#a855f7' },
  { id: 'w4', name: 'SMG', tagline: 'Ráfaga rapidísima, puntería escasa', color: '#eab308' },
  { id: 'w5', name: 'Lanzagranadas', tagline: 'Explota al impactar, hasta tras la cobertura', color: '#ef4444' },
];

// ============================================================
// Poderes (alineado con systems/power-catalog.ts de Shrek)
// ============================================================

export interface PowerOption {
  id: PowerId;
  name: string;
  description: string;
  color: string;
}

export const POWERS: PowerOption[] = [
  { id: 'p1', name: 'Kamehameha', description: 'Carga energía y dispara un rayo gigante que atraviesa todo', color: '#3b82f6' },
  { id: 'p2', name: 'Dash', description: 'Impulso veloz hacia donde apuntas, con frames de invencibilidad', color: '#eab308' },
  { id: 'p3', name: 'Escudo', description: 'Burbuja que bloquea todo el daño durante unos segundos', color: '#22d3ee' },
  { id: 'p4', name: 'Ceguera', description: 'Nube de humo que ciega a los enemigos en el área', color: '#a855f7' },
  { id: 'p5', name: 'Teletransporte', description: 'Marca un punto y vuelve a él al activarlo de nuevo', color: '#22c55e' },
];

// ============================================================
// Persistencia del Jony (localStorage)
// ============================================================

export const JONY_STORAGE_KEY = 'losjonys-jony';

export interface StoredJony {
  name: string;
  color: string;
  accessory: string;
  weapon1: WeaponId;
  weapon2: WeaponId;
  power: PowerId;
}

export function loadJony(): StoredJony | null {
  try {
    const raw = localStorage.getItem(JONY_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredJony;
  } catch {
    return null;
  }
}

export function saveJony(jony: StoredJony): void {
  try {
    localStorage.setItem(JONY_STORAGE_KEY, JSON.stringify(jony));
  } catch {
    // localStorage lleno o bloqueado — ignorar silenciosamente
  }
}