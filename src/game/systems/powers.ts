// src/game/systems/powers.ts — Sistema de poderes (territorio Shrek)
// 5 poderes equipables, independientes de armas y del personaje.
// El despliegue visual (rayo, marca de teletransporte) lo dibuja la escena al
// escuchar los eventos o leyendo los estados del jugador.
import Phaser from 'phaser';
import type { ArenaContext, PowerId, PowerStats } from '../types';
import { EventBus, GameEvents } from '../types';
import type { Player } from '../entities/player';
import { CombatSystem } from './combat';

/** Hoja de balance de los 5 poderes */
export const POWERS: Record<PowerId, PowerStats> = {
  kamehameha: {
    id: 'kamehameha',
    name: 'Kamehameha',
    desc: 'Carga energía y dispara un rayo devastador (vulnerable al cargar)',
    cooldownMs: 10000,
    windupMs: 900,
    durationMs: 400,
    speed: 0,
    damage: 150,
  },
  dash: {
    id: 'dash',
    name: 'Dash',
    desc: 'Arremetida rápida hacia adelante (no atraviesa paredes)',
    cooldownMs: 3000,
    windupMs: 0,
    durationMs: 180,
    speed: 950,
    damage: 0,
  },
  shield: {
    id: 'shield',
    name: 'Escudo',
    desc: 'Bloquea TODO el daño durante unos segundos',
    cooldownMs: 8000,
    windupMs: 0,
    durationMs: 3000,
    speed: 0,
    damage: 0,
  },
  blind: {
    id: 'blind',
    name: 'Ceguera',
    desc: 'Esfera oscura que atraviesa paredes y ciega al enemigo',
    cooldownMs: 10000,
    windupMs: 0,
    durationMs: 2500,
    speed: 640,
    damage: 0,
  },
  teleport: {
    id: 'teleport',
    name: 'Teletransporte',
    desc: 'Marca una posición y vuelve a ella (no atraviesa paredes)',
    cooldownMs: 7000,
    windupMs: 0,
    durationMs: 0,
    speed: 0,
    damage: 0,
  },
};

export class PowerSystem {
  /**
   * Intenta activar el poder del jugador. Respeta cooldown y carga de kamehameha
   * en curso. Emite eventos del contrato para que UI/audio reaccionen.
   */
  static tryActivate(scene: Phaser.Scene & ArenaContext, player: Player, now: number): void {
    if (now < player.powerCdUntil) return;
    if (player.kamehamehaChargeUntil > now) return;

    const stats = POWERS[player.powerId];
    const body = player.body as Phaser.Physics.Arcade.Body;
    const angle = player.rotation;

    switch (player.powerId) {
      case 'kamehameha': {
        // Comienza la carga; el rayo se dispara al vencer el windup (lo resuelve la escena)
        player.kamehamehaChargeUntil = now + stats.windupMs;
        EventBus.emit(GameEvents.PowerUsed, { playerId: player.playerId, powerId: player.powerId });
        break;
      }

      case 'dash': {
        player.dashUntil = now + stats.durationMs;
        body.setVelocity(Math.cos(angle) * stats.speed, Math.sin(angle) * stats.speed);
        player.powerCdUntil = now + stats.cooldownMs;
        EventBus.emit(GameEvents.PowerUsed, { playerId: player.playerId, powerId: player.powerId });
        break;
      }

      case 'shield': {
        player.shieldUntil = now + stats.durationMs;
        player.powerCdUntil = now + stats.cooldownMs;
        EventBus.emit(GameEvents.PowerUsed, { playerId: player.playerId, powerId: player.powerId });
        break;
      }

      case 'blind': {
        const x = player.x + Math.cos(angle) * 20;
        const y = player.y + Math.sin(angle) * 20;
        const orb = scene.orbGroup.get(x, y) as Phaser.Physics.Arcade.Image | null;
        if (orb) {
          orb.enableBody(true, x, y, true, true);
          orb.setVelocity(Math.cos(angle) * stats.speed, Math.sin(angle) * stats.speed);
          orb.setTint(0x181820);
          orb.setData('blindMs', stats.durationMs);
          orb.setDepth(7);
          player.powerCdUntil = now + stats.cooldownMs;
        }
        EventBus.emit(GameEvents.PowerUsed, { playerId: player.playerId, powerId: player.powerId });
        break;
      }

      case 'teleport': {
        if (player.teleportMarker) {
          const marker = player.teleportMarker;
          // No permitir teletransportarse dentro de una pared/cobertura
          if (!CombatSystem.isPointClear(scene, marker.x, marker.y)) {
            EventBus.emit(GameEvents.TeleportMoved, { playerId: player.playerId, moved: false });
            player.teleportMarker = null;
            return;
          }
          body.reset(marker.x, marker.y);
          player.teleportMarker = null;
          player.powerCdUntil = now + stats.cooldownMs;
          EventBus.emit(GameEvents.TeleportMoved, { playerId: player.playerId, moved: true });
        } else {
          player.teleportMarker = { x: player.x, y: player.y };
          player.powerCdUntil = now + stats.cooldownMs;
          EventBus.emit(GameEvents.TeleportMarked, {
            playerId: player.playerId,
            x: player.x,
            y: player.y,
          });
        }
        break;
      }
    }
  }
}