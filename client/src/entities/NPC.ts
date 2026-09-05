/**
 * entities/NPC.ts — Bot local para partida solitaria (FFA con bots).
 *
 * PUCK main: base de IA simple para el modo "Jugar solitario".
 * Shrek: extiende con IA real (pathfinding, comportamientos, dificultad).
 *
 * - Implementa Damageable (combat.ts): recibe daño, carga Super, muere.
 * - IA simple: se mueve hacia el jugador más cercano y dispara hitscan.
 * - Placeholder visual: círculo con color + nombre (Shrek pone sprites).
 */

import Phaser from 'phaser';
import { GAME_CONSTANTS, type PowerId } from '../types';
import type { Damageable } from '../systems/combat';
import { applyDamage, addPowerCharge } from '../systems/combat';
import { Weapon } from './Weapon';
import { WEAPONS } from '../systems/weapon-catalog';

export class NPC implements Damageable {
  readonly gameObject: Phaser.GameObjects.Arc;
  readonly name: string;
  hp: number;
  maxHp: number;
  alive = true;
  powerCharge = 0;
  powerId: PowerId = 'p1';

  private scene: Phaser.Scene;
  private nameText: Phaser.GameObjects.Text;
  private body: Phaser.Physics.Arcade.Body;
  private weapon: Weapon;
  private speed = 90; // más lento que el jugador (BASE_SPEED 200)
  private lastThinkAt = 0;
  private targetX = 0;
  private targetY = 0;
  private readonly arenaW: number;
  private readonly arenaH: number;
  /** Paredes del mapa (bloquean disparos) — las setea GameScene. */
  private walls: Phaser.GameObjects.Rectangle[] = [];

  constructor(scene: Phaser.Scene, x: number, y: number, name: string, color: string) {
    this.scene = scene;
    this.name = name;
    this.maxHp = GAME_CONSTANTS.BASE_HP;
    this.hp = this.maxHp;
    this.arenaW = scene.scale.width;
    this.arenaH = scene.scale.height;

    // Cuerpo: círculo placeholder con el color del bot
    this.gameObject = scene.add
      .circle(x, y, 16, Phaser.Display.Color.HexStringToColor(color).color)
      .setStrokeStyle(2, Phaser.Display.Color.HexStringToColor('#555555').color);
    scene.physics.add.existing(this.gameObject as unknown as Phaser.GameObjects.GameObject);
    this.body = this.gameObject.body as Phaser.Physics.Arcade.Body;
    this.body.setCollideWorldBounds(true);

    // Nombre sobre el bot
    this.nameText = scene.add
      .text(x, y - 28, name, {
        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        fontSize: '12px',
        color: '#cccccc',
      })
      .setOrigin(0.5);

    // Arma simple: rifle de asalto (hitscan, fiable)
    this.weapon = new Weapon(scene, WEAPONS.w2);
    this.targetX = x;
    this.targetY = y;
  }

  /** Paredes del mapa (bloquean disparos). */
  setWalls(walls: Phaser.GameObjects.Rectangle[]): void {
    this.walls = walls;
  }

  /** IA: moverse hacia el objetivo y dispararle. `now` en ms. */
  update(now: number, targets: Damageable[]): void {
    if (!this.alive) return;

    // Elegir objetivo: el más cercano vivo
    let nearest: Damageable | null = null;
    let nearestDist = Infinity;
    for (const t of targets) {
      if (!t.alive) continue;
      const d = Phaser.Math.Distance.Between(this.gameObject.x, this.gameObject.y, t.gameObject.x, t.gameObject.y);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = t;
      }
    }

    if (!nearest) return;

    const tx = nearest.gameObject.x;
    const ty = nearest.gameObject.y;

    // Movimiento: acercarse hasta ~200px, luego mantenerse a distancia
    const desired = nearestDist > 200 ? this.speed : nearestDist < 140 ? -this.speed * 0.5 : 0;
    if (desired !== 0) {
      const angle = Phaser.Math.Angle.Between(this.gameObject.x, this.gameObject.y, tx, ty);
      this.body.setVelocity(Math.cos(angle) * desired, Math.sin(angle) * desired);
    } else {
      this.body.setVelocity(0, 0);
    }

    // Disparo: apuntar al objetivo con miss rate — fallan más lejos y
    // mucho más si el objetivo se está moviendo
    const baseAngle = Phaser.Math.Angle.Between(this.gameObject.x, this.gameObject.y, tx, ty);
    let inaccuracy = GAME_CONSTANTS.BOT_MISS_RATE_BASE;
    inaccuracy += nearestDist * GAME_CONSTANTS.BOT_MISS_RATE_PER_DIST;
    const targetBody = nearest.gameObject.body as Phaser.Physics.Arcade.Body | null;
    if (targetBody) {
      const targetSpeed = Math.hypot(targetBody.velocity.x, targetBody.velocity.y);
      inaccuracy += targetSpeed * GAME_CONSTANTS.BOT_MISS_RATE_PER_SPEED;
    }
    const fireAngle = baseAngle + Phaser.Math.FloatBetween(-inaccuracy, inaccuracy);
    this.weapon.fire(this.gameObject.x, this.gameObject.y, fireAngle, targets, now, this.walls);
    // Recarga automática cuando el cargador se vacía
    if (this.weapon.isEmpty && !this.weapon.isReloading) {
      this.weapon.reload();
    }

    // "Pensar" cada 1.5s: elegir un punto de patrulla si no hay objetivo cercano
    if (now - this.lastThinkAt > 1500) {
      this.lastThinkAt = now;
      this.targetX = Phaser.Math.Between(80, this.arenaW - 80);
      this.targetY = Phaser.Math.Between(80, this.arenaH - 80);
    }
  }

  /** Recibe daño (también carga la Super con el daño recibido). */
  takeDamage(amount: number): number {
    const real = applyDamage(this, amount);
    if (real > 0) addPowerCharge(this, real);
    return real;
  }

  /** Revive en una posición nueva (FFA: los bots respawnean tras morir). */
  respawn(x: number, y: number): void {
    this.hp = this.maxHp;
    this.alive = true;
    this.powerCharge = 0;
    this.gameObject.setPosition(x, y);
    this.nameText.setPosition(x, y - 28);
    this.body.enable = true;
    this.body.reset(x, y);
    this.targetX = x;
    this.targetY = y;
  }

  destroy(): void {
    this.gameObject.destroy();
    this.nameText.destroy();
    this.body.enable = false;
  }
}