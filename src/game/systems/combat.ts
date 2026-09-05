// src/game/systems/combat.ts — Sistema de combate (territorio Shrek)
// Daño, escudo, ceguera, cuchillo (instakill) y chequeo de paredes para teletransporte.
import Phaser from 'phaser';
import type { ArenaContext } from '../types';
import { EventBus, GameEvents } from '../types';
import { Player } from '../entities/player';
import { EnemyBot } from '../entities/enemies';

export const KNIFE_COOLDOWN_MS = 900;
export const KNIFE_RANGE = 58;
export const KNIFE_HALF_ANGLE = 0.95; // ~54° a cada lado de la mira

export class CombatSystem {
  /**
   * Aplica daño a un objetivo. Reglas:
   * - Dash: inmunidad total mientras dura.
   * - Escudo: bloquea TODO el daño (feedback sin pérdida de hp).
   * - Hp <= 0: el jugador emite PlayerDied; el bot muere (instakill o daño).
   */
  static damage(target: Player | EnemyBot, amount: number, source: string, now: number): void {
    if (target.hp <= 0) return;

    if (target instanceof Player) {
      if (now < target.dashUntil) return; // invulnerable durante el dash
      if (now < target.shieldUntil) {
        EventBus.emit(GameEvents.PlayerDamaged, {
          playerId: target.playerId,
          amount: 0,
          blocked: true,
          source,
        });
        return;
      }
      target.hp = Math.max(0, target.hp - amount);
      EventBus.emit(GameEvents.PlayerDamaged, {
        playerId: target.playerId,
        amount,
        blocked: false,
        source,
      });
      if (target.hp <= 0) {
        EventBus.emit(GameEvents.PlayerDied, { playerId: target.playerId, source });
      }
    } else {
      target.hp = Math.max(0, target.hp - amount);
      if (target.hp <= 0) target.die(source);
    }
  }

  /**
   * Ataque de cuchillo: instakill a muy corta distancia y dentro del cono de la mira.
   * Devuelve true si conectó (para feedback). El callback opcional dibuja el slash.
   */
  static knifeAttack(
    scene: Phaser.Scene & ArenaContext,
    player: Player,
    now: number,
    onSlash?: (x: number, y: number, angle: number) => void,
  ): boolean {
    if (now < player.knifeCdUntil) return false;
    player.knifeCdUntil = now + KNIFE_COOLDOWN_MS;

    const angle = player.rotation;
    let hit = false;

    for (const obj of scene.enemies.getChildren()) {
      if (!(obj instanceof EnemyBot) || !obj.active) continue;
      const dist = Phaser.Math.Distance.Between(player.x, player.y, obj.x, obj.y);
      const angTo = Phaser.Math.Angle.Between(player.x, player.y, obj.x, obj.y);
      const diff = Math.abs(Phaser.Math.Angle.Wrap(angTo - angle));

      if (dist <= KNIFE_RANGE && diff <= KNIFE_HALF_ANGLE) {
        obj.die(player.playerId); // INSTANT KILL
        hit = true;
        EventBus.emit(GameEvents.KnifeKill, { playerId: player.playerId, enemyId: obj.botId });
      }
    }

    onSlash?.(player.x, player.y, angle);
    return hit;
  }

  /** Aplica ceguera temporal a un objetivo (bot en el prototipo). */
  static applyBlind(target: EnemyBot | Player, ms: number, now: number): void {
    target.blindUntil = now + ms;
    EventBus.emit(GameEvents.PlayerBlinded, {
      targetId: target instanceof Player ? target.playerId : target.botId,
      durationMs: ms,
    });
  }

  /** Comprueba que un punto no esté dentro de la cobertura (para teletransporte). */
  static isPointClear(scene: Phaser.Scene & ArenaContext, x: number, y: number, pad = 14): boolean {
    for (const obj of scene.cover.getChildren()) {
      const bounds = (obj as Phaser.GameObjects.Image).getBounds();
      if (x > bounds.left - pad && x < bounds.right + pad && y > bounds.top - pad && y < bounds.bottom + pad) {
        return false;
      }
    }
    return true;
  }
}