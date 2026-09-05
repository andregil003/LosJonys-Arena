/**
 * systems/arenas.ts — Catálogo de arenas del juego.
 *
 * PUCK main: infraestructura (registro + selección aleatoria).
 * Shrek: registra aquí sus arenas (fondo voronoi, etc.) — cada arena nueva
 * que agregue al array ARENAS entra automáticamente en la rotación aleatoria.
 *
 * Cómo agregar una arena (Shrek):
 *   1. Añade un objeto Arena al array ARENAS con un id único.
 *   2. `backgroundColor` = color de fondo principal.
 *   3. `accentColor` = color de acento (bordes de paredes, decoración).
 *   4. `decorate` (opcional) = función que dibuja decoración extra
 *      (voronoi, patrones, texturas...) sobre el fondo.
 *      Recibe la escena y las dimensiones; usa scene.add.* para dibujar.
 */

import Phaser from 'phaser';

export interface Arena {
  id: string;
  name: string;
  /** Color de fondo principal (número hex, ej: 0x2a2a3f). */
  backgroundColor: number;
  /** Color de acento para bordes/decoración (string hex, ej: '#3a3a5f'). */
  accentColor: string;
  /** Decoración opcional dibujada sobre el fondo (voronoi, patrones...). */
  decorate?: (scene: Phaser.Scene, width: number, height: number) => void;
}

/** Registro de arenas — Shrek agrega las suyas aquí. */
export const ARENAS: Arena[] = [
  {
    id: 'classic',
    name: 'Arena Clásica',
    backgroundColor: 0x2a2a3f,
    accentColor: '#3a3a5f',
  },
  // TODO(Shrek): registrar aquí las arenas nuevas (voronoi, etc.)
];

/** Elige una arena aleatoria del registro. */
export function pickRandomArena(): Arena {
  return ARENAS[Phaser.Math.Between(0, ARENAS.length - 1)];
}