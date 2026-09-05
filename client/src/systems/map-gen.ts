/**
 * systems/map-gen.ts — Generador de mapa aleatorio con paredes.
 *
 * PUCK main: infraestructura de escena (mapa procedural).
 * Shrek: extiende con tilesets, decoración, zonas de interés.
 *
 * - Genera N paredes rectangulares en posiciones aleatorias.
 * - Respeta una zona segura alrededor del centro (spawn de jugadores).
 * - No solapa paredes entre sí (con padding).
 * - Deja margen en los bordes para que no se peguen a la pared del mundo.
 */

import Phaser from 'phaser';

export interface WallRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface MapGenOptions {
  /** Número de paredes a generar (default 10). */
  count?: number;
  /** Lado menor de cada pared (default 60). */
  minSize?: number;
  /** Lado mayor de cada pared (default 180). */
  maxSize?: number;
  /** Radio seguro alrededor del centro — no se generan paredes ahí (default 220). */
  safeRadius?: number;
  /** Margen de los bordes del mapa (default 60). */
  margin?: number;
  /** Separación mínima entre paredes (default 16). */
  padding?: number;
}

function intersects(a: WallRect, b: WallRect, pad: number): boolean {
  return (
    a.x < b.x + b.w + pad &&
    a.x + a.w + pad > b.x &&
    a.y < b.y + b.h + pad &&
    a.y + a.h + pad > b.y
  );
}

export function generateMap(width: number, height: number, opts: MapGenOptions = {}): WallRect[] {
  const {
    count = 10,
    minSize = 60,
    maxSize = 180,
    safeRadius = 220,
    margin = 60,
    padding = 16,
  } = opts;

  const walls: WallRect[] = [];
  const cx = width / 2;
  const cy = height / 2;

  let attempts = 0;
  while (walls.length < count && attempts < 600) {
    attempts++;

    const w = Phaser.Math.Between(minSize, maxSize);
    const h = Phaser.Math.Between(minSize, maxSize);
    const x = Phaser.Math.Between(margin, Math.max(margin, width - margin - w));
    const y = Phaser.Math.Between(margin, Math.max(margin, height - margin - h));

    const rect: WallRect = { x, y, w, h };
    const rx = x + w / 2;
    const ry = y + h / 2;

    // No generar paredes dentro de la zona segura central (spawn)
    if (Phaser.Math.Distance.Between(rx, ry, cx, cy) < safeRadius) continue;

    // No solapar otras paredes
    if (walls.some((o) => intersects(rect, o, padding))) continue;

    walls.push(rect);
  }

  return walls;
}