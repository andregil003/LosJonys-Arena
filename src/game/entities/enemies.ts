// src/game/entities/enemies.ts — Enemigos/bots de la arena (territorio Shrek)
// Bots "dummy" para probar armas/poderes/cuchillo: persiguen al jugador y dañan por contacto.
import Phaser from 'phaser';
import { EventBus, GameEvents } from '../types';
import type { Player } from './player';

const CHASE_SPEED = 72;
const BLIND_SPEED = 38;
const CONTACT_DAMAGE = 6;
const CONTACT_COOLDOWN_MS = 800;
const DEFAULT_HP = 50;

export class EnemyBot extends Phaser.Physics.Arcade.Sprite {
  /** id único para eventos (no es un jugador, pero los eventos lo identifican) */
  readonly botId = Phaser.Utils.String.UUID();
  hp: number;
  readonly maxHp: number;

  /** si `scene.time.now < blindUntil`, el bot está ciego (vaga sin perseguir) */
  blindUntil = 0;
  /** cooldown interno de daño por contacto con el jugador */
  lastContactUntil = 0;

  private wanderNext = 0;
  private wanderAngle = Phaser.Math.FloatBetween(0, Math.PI * 2);

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'enemy');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.maxHp = DEFAULT_HP;
    this.hp = this.maxHp;

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(11);
    this.setCollideWorldBounds(true);
    this.setDepth(9);
    this.setTint(0xff5577);
  }

  /** Comportamiento por frame: persigue al jugador salvo si está ciego. */
  update(now: number, target: Player): void {
    if (this.hp <= 0) return;

    const body = this.body as Phaser.Physics.Arcade.Body;
    const blinded = now < this.blindUntil;

    if (blinded) {
      // Ciego: vaga sin rumbo a baja velocidad
      if (now >= this.wanderNext) {
        this.wanderNext = now + 500;
        this.wanderAngle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      }
      body.setVelocity(Math.cos(this.wanderAngle) * BLIND_SPEED, Math.sin(this.wanderAngle) * BLIND_SPEED);
      this.setRotation(this.wanderAngle);
    } else {
      // Persigue al jugador
      const angle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
      body.setVelocity(Math.cos(angle) * CHASE_SPEED, Math.sin(angle) * CHASE_SPEED);
      this.setRotation(angle);
    }

    // Tint por estado: ciego = oscuro, normal = rojizo
    this.setTint(blinded ? 0x181818 : 0xff5577);
  }

  /** Expira la ceguera (lo llama CombatSystem cuando pasa el tiempo) */
  isBlindedAt(now: number): boolean {
    return now < this.blindUntil;
  }

  /** Muerte por cuchillo (instakill) o por daño (al llegar a 0 hp) */
  die(source: string): void {
    if (this.hp <= 0) return;
    this.hp = 0;

    // Destrucción diferida para no romper iteraciones de física
    const scene = this.scene;
    this.disableBody(true, true);

    EventBus.emit(GameEvents.EnemyDied, { enemyId: this.botId, source });

    scene.time.delayedCall(0, () => {
      if (this.active) this.destroy();
    });
  }

  /** Daño de contacto: aplica solo si el cooldown interno lo permite. */
  get canContactDamage(now: number): boolean {
    return now >= this.lastContactUntil;
  }

  setContactCooldown(now: number): void {
    this.lastContactUntil = now + CONTACT_COOLDOWN_MS;
  }
}

// Export de constantes de balance para que CombatSystem las use de forma centralizada
export const EnemyBalance = {
  contactDamage: CONTACT_DAMAGE,
  contactCooldownMs: CONTACT_COOLDOWN_MS,
} as const;

/** Crea un bot y lo mete en el grupo de enemigos de la escena. */
export function spawnBot(scene: Phaser.Scene, group: Phaser.Physics.Arcade.Group, x: number, y: number): EnemyBot {
  const bot = new EnemyBot(scene, x, y);
  group.add(bot);
  return bot;
}