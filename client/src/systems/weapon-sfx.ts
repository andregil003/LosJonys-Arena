/**
 * systems/weapon-sfx.ts — Sonidos reales de armas (Shrek).
 *
 * Territorio: Shrek (gameplay). Conecta los SFX definitivos
 * (assets/audio/final/) con el sistema de combate.
 *
 * Mapeo (audios reales puestos por André en "Armas", recortados a solo el disparo):
 *  - w1 Escopeta        → w1-shoot.wav     (disparo, sin la recarga de pump)
 *  - w2 Rifle de asalto → w2-shoot.wav     (ráfaga real de ametralladora)
 *  - w3 Sniper          → w3-shoot.wav     (SOLO el tiro; el cerrojo/recarga se recortó)
 *  - w4 SMG             → w4-shoot.wav     (ráfaga Browning M1919)
 *  - w5 Lanzagranadas   → w5-launch.wav    (lanzamiento) + w5-explosion.wav (impacto)
 *  - Recarga manual (R) → weapon-reload.wav (Reload.mp3 de André)
 *
 * Los sonidos se cargan bajo demanda la primera vez que se usan; si la escena
 * quiere precargarlos, llamar a preloadWeaponSfx(scene) en su preload.
 */

import Phaser from 'phaser';
import type { WeaponId } from '../types';

/** Sonido de disparo de cada arma (ruta definitiva en final/). */
export const WEAPON_SHOT_SFX: Record<WeaponId, string> = {
  w1: 'assets/audio/final/w1-shoot.wav',
  w2: 'assets/audio/final/w2-shoot.wav',
  w3: 'assets/audio/final/w3-shoot.wav',
  w4: 'assets/audio/final/w4-shoot.wav',
  w5: 'assets/audio/final/w5-launch.wav',
};

/** Explosión del lanzagranadas (w5). */
export const WEAPON_EXPLOSION_SFX = 'assets/audio/final/w5-explosion.wav';

/** Recarga manual con R. */
export const WEAPON_RELOAD_SFX = 'assets/audio/final/weapon-reload.wav';

const ALL_URLS: string[] = [
  ...Object.values(WEAPON_SHOT_SFX),
  WEAPON_EXPLOSION_SFX,
  WEAPON_RELOAD_SFX,
];

const keyFor = (url: string): string => `sfx:${url}`;

/** Precarga todos los sonidos de armas (llamar en preload de la escena). */
export function preloadWeaponSfx(scene: Phaser.Scene): void {
  for (const url of ALL_URLS) {
    scene.load.audio(keyFor(url), url);
  }
}

/** Reproduce el disparo del arma indicada. */
export function playWeaponShot(scene: Phaser.Scene, weaponId: WeaponId): void {
  playUrl(scene, WEAPON_SHOT_SFX[weaponId]);
}

/** Reproduce la explosión del lanzagranadas. */
export function playWeaponExplosion(scene: Phaser.Scene): void {
  playUrl(scene, WEAPON_EXPLOSION_SFX);
}

/** Reproduce la recarga manual (Reload.mp3). */
export function playWeaponReload(scene: Phaser.Scene): void {
  playUrl(scene, WEAPON_RELOAD_SFX);
}

function playUrl(scene: Phaser.Scene, url: string): void {
  const key = keyFor(url);
  if (!scene.cache.audio.exists(key)) {
    // Carga bajo demanda la primera vez (evita romper escenas sin preload).
    scene.load.audio(key, url);
    scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
      if (scene.cache.audio.exists(key)) scene.sound.play(key, { volume: 0.9 });
    });
    scene.load.start();
    return;
  }
  scene.sound.play(key, { volume: 0.9 });
}