// src/game/systems/weapons.ts — Sistema de armas (territorio Shrek)
// 5 armas equipables, independientes de poderes y del cuchillo.
// Todas spawn proyectiles en el grupo `bullets` de la escena (ArenaContext).
import Phaser from 'phaser';
import type { ArenaContext, WeaponId, WeaponStats } from '../types';
import { EventBus, GameEvents } from '../types';
import type { Player } from '../entities/player';

/** Hoja de balance de las 5 armas principales */
export const WEAPONS: Record<WeaponId, WeaponStats> = {
  shotgun: {
    id: 'shotgun',
    name: 'Escopeta',
    desc: 'Abanico de 8 proyectiles, devastadora de cerca',
    damage: 14,
    fireRateMs: 900,
    pellets: 8,
    spreadDeg: 34,
    pelletSpeed: 720,
    range: 300,
    windupMs: 0,
    explosive: false,
    explosionRadius: 0,
    auto: false,
    color: 0xffaa44,
  },
  assault_rifle: {
    id: 'assault_rifle',
    name: 'Rifle de asalto',
    desc: 'Automática de alcance medio y precisión decente',
    damage: 11,
    fireRateMs: 125,
    pellets: 1,
    spreadDeg: 6,
    pelletSpeed: 950,
    range: 560,
    windupMs: 0,
    explosive: false,
    explosionRadius: 0,
    auto: true,
    color: 0x66ccff,
  },
  sniper: {
    id: 'sniper',
    name: 'Sniper',
    desc: 'Un balazo letal, requiere preparación',
    damage: 60,
    fireRateMs: 1500,
    pellets: 1,
    spreadDeg: 0,
    pelletSpeed: 1500,
    range: 980,
    windupMs: 550,
    explosive: false,
    explosionRadius: 0,
    auto: false,
    color: 0xffffff,
  },
  smg: {
    id: 'smg',
    name: 'SMG',
    desc: 'Cadencia altísima, mucho spray',
    damage: 6,
    fireRateMs: 85,
    pellets: 1,
    spreadDeg: 15,
    pelletSpeed: 820,
    range: 380,
    windupMs: 0,
    explosive: false,
    explosionRadius: 0,
    auto: true,
    color: 0xffdd55,
  },
  grenade_launcher: {
    id: 'grenade_launcher',
    name: 'Lanzagranadas',
    desc: 'Explota en área, ideal contra cobertura',
    damage: 45,
    fireRateMs: 1100,
    pellets: 1,
    spreadDeg: 0,
    pelletSpeed: 400,
    range: 640,
    windupMs: 0,
    explosive: true,
    explosionRadius: 95,
    auto: false,
    color: 0x55ff88,
  },
};

export class WeaponSystem {
  /**
   * Dispara el arma equipada del jugador: spawn de proyectiles con spread,
   * velocidad y tint según balance. NO gestiona cooldowns (lo hace el jugador).
   */
  static fire(scene: Phaser.Scene & ArenaContext, player: Player, now: number): void {
    const stats = WEAPONS[player.weaponId];
    const angle = player.rotation;
    const muzzleX = player.x + Math.cos(angle) * 24;
    const muzzleY = player.y + Math.sin(angle) * 24;

    // Escopeta dispara un abanico; el resto un proyectil por disparo
    for (let i = 0; i < stats.pellets; i++) {
      const spread = Phaser.Math.DegToRad(Phaser.Math.FloatBetween(-stats.spreadDeg / 2, stats.spreadDeg / 2));
      const a = angle + spread;

      const bullet = scene.bullets.get(muzzleX, muzzleY) as Phaser.Physics.Arcade.Image | null;
      if (!bullet) continue;

      bullet.enableBody(true, muzzleX, muzzleY, true, true);
      bullet.setRotation(a);
      bullet.setVelocity(Math.cos(a) * stats.pelletSpeed, Math.sin(a) * stats.pelletSpeed);
      bullet.setTint(stats.color);
      bullet.setScale(stats.explosive ? 1.5 : 1);
      bullet.setDepth(8);
      bullet.setData('weaponId', player.weaponId);
      bullet.setData('bornAt', now);
    }

    EventBus.emit(GameEvents.WeaponFired, { playerId: player.playerId, weaponId: player.weaponId });
  }
}