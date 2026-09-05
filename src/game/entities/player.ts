// src/game/entities/player.ts — Entidad del jugador (territorio Shrek)
// JUGADOR = Arma principal (1 de 5) + Poder (1 de 5) + Cuchillo (todos)
import Phaser from 'phaser';
import type { ArenaContext, PowerId, WeaponId } from '../types';
import { WEAPONS, WeaponSystem } from '../systems/weapons';

/** Teclas que el jugador usa (la escena le pasa las que creó) */
export type PlayerKeys = Record<string, Phaser.Input.Keyboard.Key>;

export class Player extends Phaser.Physics.Arcade.Sprite {
  readonly playerId: string;
  hp: number;
  readonly maxHp = 100;

  /** 1 arma principal elegida */
  weaponId: WeaponId;
  /** 1 poder especial elegido */
  powerId: PowerId;

  // Cooldowns (timestamps de juego: scene.time.now)
  weaponCdUntil = 0;
  knifeCdUntil = 0;
  powerCdUntil = 0;

  // Estados de poderes
  shieldUntil = 0;
  blindUntil = 0;
  dashUntil = 0;
  /** marcador del teletransporte (null = sin marca) */
  teleportMarker: { x: number; y: number } | null = null;

  /** Preparación del sniper: -1 = lista; >=0 = cargando desde ese timestamp */
  sniperWindupStart = -1;
  /** Carga de kamehameha: 0 = inactiva; >0 = carga termina en ese timestamp */
  kamehamehaChargeUntil = 0;

  private keys: PlayerKeys = {};

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    playerId: string,
    weaponId: WeaponId,
    powerId: PowerId,
  ) {
    super(scene, x, y, 'player');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.playerId = playerId;
    this.weaponId = weaponId;
    this.powerId = powerId;
    this.hp = this.maxHp;

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(13);
    this.setCollideWorldBounds(true);
    this.setDepth(10);
    this.setTint(0x33ff99);
  }

  /** La escena le entrega las teclas (WASD + acciones). Compatible con 2 jugadores locales. */
  setupInput(keys: PlayerKeys): void {
    this.keys = keys;
  }

  /** Cambiar arma (por dígitos 1-5 en el prototipo) */
  setWeapon(id: WeaponId): void {
    this.weaponId = id;
    this.sniperWindupStart = -1;
    this.weaponCdUntil = 0;
  }

  /** Cambiar poder (por dígitos 6-0 en el prototipo) */
  setPower(id: PowerId): void {
    this.powerId = id;
  }

  get isShielded(): boolean {
    return this.scene.time.now < this.shieldUntil;
  }

  get isDashing(): boolean {
    return this.scene.time.now < this.dashUntil;
  }

  get isBlinded(): boolean {
    return this.scene.time.now < this.blindUntil;
  }

  /**
   * Intenta disparar el arma equipada.
   * - Armas con windup (sniper) inician la carga aquí; el disparo ocurre al vencer el windup.
   * - Armas semiautomáticas disparan por click; las auto cada frame mientras se mantiene.
   */
  tryFire(now: number): void {
    if (now < this.weaponCdUntil) return;
    const stats = WEAPONS[this.weaponId];
    if (stats.windupMs > 0) {
      if (this.sniperWindupStart < 0) this.sniperWindupStart = now; // comenzar carga
      return;
    }
    WeaponSystem.fire(this.scene as Phaser.Scene & ArenaContext, this, now);
  }

  /** Actualización por frame: facing al ratón, movimiento, tint de estado, disparo automático. */
  update(now: number, moveSpeed = 240): void {
    // 1) Apuntar (facing) hacia el puntero del ratón
    const pointer = this.scene.input.activePointer;
    this.setRotation(Phaser.Math.Angle.Between(this.x, this.y, pointer.worldX, pointer.worldY));

    // 2) Movimiento WASD normalizado (diagonales a igual velocidad)
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (now >= this.dashUntil) {
      const k = this.keys;
      let vx = 0;
      let vy = 0;
      if (k.W?.isDown) vy -= 1;
      if (k.S?.isDown) vy += 1;
      if (k.A?.isDown) vx -= 1;
      if (k.D?.isDown) vx += 1;
      if (vx !== 0 || vy !== 0) {
        const len = Math.hypot(vx, vy);
        vx /= len;
        vy /= len;
      }
      // Vulnerable mientras carga el kamehameha: se mueve al 50%
      const speed = this.kamehamehaChargeUntil > now ? moveSpeed * 0.5 : moveSpeed;
      body.setVelocity(vx * speed, vy * speed);
    }

    // 3) Feedback visual por estado (tint)
    if (this.isShielded) this.setTint(0x66ccff);
    else if (this.isBlinded) this.setTint(0x111111);
    else if (this.isDashing) this.setTint(0x00ffff);
    else this.setTint(0x33ff99);

    // 4) Armas automáticas: disparan mientras se mantiene el click izquierdo
    const stats = WEAPONS[this.weaponId];
    if (stats.auto && pointer.leftButtonDown()) this.tryFire(now);

    // 5) Venció la preparación del sniper → dispara
    if (this.sniperWindupStart >= 0 && now >= this.sniperWindupStart + stats.windupMs) {
      this.sniperWindupStart = -1;
      WeaponSystem.fire(this.scene as Phaser.Scene & ArenaContext, this, now);
    }
  }
}