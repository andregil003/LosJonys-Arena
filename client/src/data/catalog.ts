/**
 * data/catalog.ts — Catálogo de personalización para la UI (Crea tu Jony).
 *
 * ⚠️ PROVISIONAL: los nombres/descripciones de armas y poderes son placeholders
 * hasta que Shrek entregue los stats reales (GDD Section 6).
 * Cuando los defina, solo hay que actualizar WEAPONS y POWERS aquí.
 *
 * Territorio: PUCK (UI) — los stats de gameplay reales viven en entities/ (Shrek).
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
// Armas (provisional — Shrek define stats reales)
// ============================================================

export interface WeaponOption {
  id: WeaponId;
  name: string;
  tagline: string;
  /** Color para la tarjeta en la UI */
  color: string;
}

export const WEAPONS: WeaponOption[] = [
  { id: 'w1', name: 'Pistola', tagline: 'Rápida y confiable', color: '#94a3b8' },
  { id: 'w2', name: 'Escopeta', tagline: 'Corto alcance, mucho daño', color: '#f97316' },
  { id: 'w3', name: 'Rifle', tagline: 'Preciso a media distancia', color: '#22d3ee' },
  { id: 'w4', name: 'Lanzacohetes', tagline: 'Lento pero devastador', color: '#ef4444' },
  { id: 'w5', name: 'Kamehameha', tagline: 'Carga y libera el rayo', color: '#a855f7' },
];

// ============================================================
// Poderes (provisional — Shrek define stats reales)
// ============================================================

export interface PowerOption {
  id: PowerId;
  name: string;
  description: string;
  color: string;
}

export const POWERS: PowerOption[] = [
  { id: 'p1', name: 'Escudo', description: 'Absorbe daño por unos segundos', color: '#22d3ee' },
  { id: 'p2', name: 'Dash', description: 'Teletransporte corto en tu dirección', color: '#eab308' },
  { id: 'p3', name: 'Curación', description: 'Regenera HP al instante', color: '#22c55e' },
  { id: 'p4', name: 'Ralentizar', description: 'Ralentiza a los enemigos cercanos', color: '#a855f7' },
  { id: 'p5', name: 'Super Kamehameha', description: 'Rayo gigante que atraviesa todo', color: '#ef4444' },
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