/**
 * systems/combat.ts — Sistema de combate básico del cliente.
 *
 * Daño, HP (GAME_CONSTANTS.BASE_HP) y barra de Super
 * (se carga con daño hecho Y recibido hasta chargeRequired del poder).
 *
 * ⚠️ TERRITORIO DE SHREK — implementación base hecha por puck pilas
 * con aviso a Shrek. Shrek extiende: enemigos reales, poderes con efecto,
 * instakill server-side, game feel, etc. El contrato (types.ts) no cambia.
 */

import { GAME_CONSTANTS, EventBus, GameEvents } from '../types';
import type { PowerId } from '../types';
import { POWERS } from './power-catalog';

/**
 * GameObject con posición (x/y) — los que usan los sistemas de combate.
 * Cubre Arc, Image, Sprite, Container, etc. Shrek puede extender.
 */
export type PositionedGameObject = Phaser.GameObjects.Arc | Phaser.GameObjects.Image | Phaser.GameObjects.Sprite | Phaser.GameObjects.Container;

/** Cualquier entidad con HP que puede recibir daño (jugador, enemigo, dummy). */
export interface Damageable {
  /** GameObject visual (posición, colisiones) */
  gameObject: PositionedGameObject;
  /** Nombre para HUD/logs */
  name: string;
  hp: number;
  maxHp: number;
  alive: boolean;
  /** Carga de Super 0..chargeRequired */
  powerCharge: number;
  /** Poder equipado (define chargeRequired) */
  powerId: PowerId;
}

/**
 * Aplica daño a un Damageable. Devuelve el daño real aplicado.
 * Emite PLAYER_DIED si la entidad llega a 0 HP.
 *
 * El payload del evento es `{ target, killer }`:
 * - `target`: la entidad que murió (Damageable).
 * - `killer`: quien la mató (Damageable) o `null` si murió sin autor (ej: zona).
 */
export function applyDamage(target: Damageable, amount: number, killer: Damageable | null = null): number {
  if (!target.alive || amount <= 0) return 0;
  const real = Math.min(amount, target.hp);
  target.hp -= real;
  if (target.hp <= 0) {
    target.hp = 0;
    target.alive = false;
    EventBus.emit(GameEvents.PLAYER_DIED, { target, killer });
  }
  return real;
}

/** Cura a un Damageable sin pasar de maxHp. Devuelve lo curado. */
export function heal(target: Damageable, amount: number): number {
  if (!target.alive || amount <= 0) return 0;
  const real = Math.min(amount, target.maxHp - target.hp);
  target.hp += real;
  return real;
}

/**
 * Carga la barra de Super con daño hecho/recibido.
 * Emite POWER_READY cuando llega al 100% (chargeRequired del poder).
 */
export function addPowerCharge(target: Damageable, amount: number): void {
  if (!target.alive || amount <= 0) return;
  const power = POWERS[target.powerId];
  const required = power?.chargeRequired ?? 500;
  const before = target.powerCharge;
  target.powerCharge = Math.min(required, target.powerCharge + amount);
  if (before < required && target.powerCharge >= required) {
    EventBus.emit(GameEvents.POWER_READY, target);
  }
}

/** Consume la barra de Super al usar el poder. Devuelve true si había carga. */
export function consumePower(target: Damageable): boolean {
  const power = POWERS[target.powerId];
  const required = power?.chargeRequired ?? 500;
  if (target.powerCharge < required) return false;
  target.powerCharge = 0;
  return true;
}

/** ¿La entidad está muerta? */
export function isDead(target: Damageable): boolean {
  return !target.alive;
}

/** HP base de una entidad nueva (GAME_CONSTANTS.BASE_HP). */
export function baseHp(): number {
  return GAME_CONSTANTS.BASE_HP;
}