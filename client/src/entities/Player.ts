/**
 * entities/Player.ts — Jugador local (Jony) con gameplay básico del cliente.
 *
 * ⚠️ TERRITORIO DE SHREK — implementación base hecha por puck pilas
 * con aviso a Shrek. Shrek extiende: sprites reales, animaciones,
 * poderes con efecto, server sync, game feel.
 *
 * - Movimiento 8 direcciones: WASD + flechas.
 * - Cambio de arma 1/2/3 (1 y 2 del loadout, 3 = cuchillo).
 * - Cuchillo: instakill en rango melee (KNIFE_RANGE) y +20% velocidad
 *   (KNIFE_SPEED_BONUS) mientras está en mano.
 * - HP (GAME_CONSTANTS.BASE_HP) y barra de Super (carga con daño hecho/recibido).
 */

import Phaser from 'phaser';
import { GAME_CONSTANTS, EventBus, GameEvents } from '../types';
import type { JonyConfig, PowerId } from '../types';
import { WEAPONS } from '../systems/weapon-catalog';
import { applyDamage, addPowerCharge, consumePower, heal } from '../systems/combat';
import type { Damageable } from '../systems/combat';
import { network } from '../systems/network';
import { Weapon } from './Weapon';

export class Player implements Damageable {
  readonly gameObject: Phaser.GameObjects.Arc;
  readonly jony: JonyConfig;
  readonly name: string;
  readonly color: string;
  readonly powerId: PowerId;

  hp: number;
  maxHp: number;
  alive = true;
  powerCharge = 0;
  /** Kills del jugador (cuchillo local + killer del payload cuando Shrek lo emita). */
  kills = 0;

  activeSlot: 1 | 2 | 3 = 1;

  private scene: Phaser.Scene;
  private nameText: Phaser.GameObjects.Text;
  private body: Phaser.Physics.Arcade.Body;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;
  private key1: Phaser.Input.Keyboard.Key;
  private key2: Phaser.Input.Keyboard.Key;
  private key3: Phaser.Input.Keyboard.Key;
  private keyR: Phaser.Input.Keyboard.Key;
  private keyQ: Phaser.Input.Keyboard.Key;
  private keyShift: Phaser.Input.Keyboard.Key;
  private weapons: [Weapon, Weapon]; // arma 1 y arma 2 del loadout
  private knifeCooldownUntil = 0;
  /** Paredes del mapa (bloquean disparos) — las setea GameScene. */
  private walls: Phaser.GameObjects.Rectangle[] = [];
  /** Combate habilitado (false durante el countdown — no dispara ni gasta munición). */
  private combatEnabled = true;

  constructor(scene: Phaser.Scene, jony: JonyConfig, x: number, y: number) {
    this.scene = scene;
    this.jony = jony;
    this.name = jony.name.trim() || 'Jony';
    this.color = jony.color;
    this.powerId = jony.power;
    this.maxHp = GAME_CONSTANTS.BASE_HP;
    this.hp = this.maxHp;

    // Cuerpo: círculo placeholder con el color del Jony (Shrek pone sprites)
    this.gameObject = scene.add
      .circle(x, y, 16, Phaser.Display.Color.HexStringToColor(this.color).color)
      .setStrokeStyle(2, Phaser.Display.Color.HexStringToColor('#fafafa').color);
    scene.physics.add.existing(this.gameObject as unknown as Phaser.GameObjects.GameObject);
    this.body = this.gameObject.body as Phaser.Physics.Arcade.Body;
    this.body.setCollideWorldBounds(true);

    // Nombre sobre el jugador
    this.nameText = scene.add
      .text(x, y - 28, this.name, {
        fontFamily: "'Nunito', 'Segoe UI', sans-serif",
        fontSize: '12px',
        color: '#fafafa',
      })
      .setOrigin(0.5);

    // Input
    const kb = scene.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.wasd = {
      W: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.key1 = kb.addKey(Phaser.Input.Keyboard.KeyCodes.ONE);
    this.key2 = kb.addKey(Phaser.Input.Keyboard.KeyCodes.TWO);
    this.key3 = kb.addKey(Phaser.Input.Keyboard.KeyCodes.THREE);
    this.keyR = kb.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.keyQ = kb.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
    this.keyShift = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);

    // Armas del loadout (catálogo real de Shrek)
    this.weapons = [new Weapon(scene, WEAPONS[jony.weapon1]), new Weapon(scene, WEAPONS[jony.weapon2])];
  }

  get x(): number {
    return this.gameObject.x;
  }

  get y(): number {
    return this.gameObject.y;
  }

  /** Paredes del mapa (bloquean disparos). */
  setWalls(walls: Phaser.GameObjects.Rectangle[]): void {
    this.walls = walls;
  }

  /** Habilita/deshabilita el combate (countdown lo deshabilita). */
  setCombatEnabled(enabled: boolean): void {
    this.combatEnabled = enabled;
  }

  /** Arma activa (null si el cuchillo está en mano). */
  get activeWeapon(): Weapon | null {
    return this.activeSlot === 3 ? null : this.weapons[this.activeSlot - 1];
  }

  /** Velocidad actual (con cuchillo en mano: +20%). */
  get speed(): number {
    const base = GAME_CONSTANTS.BASE_SPEED;
    return this.activeSlot === 3 ? base * (1 + GAME_CONSTANTS.KNIFE_SPEED_BONUS) : base;
  }

update(time: number, targets: Damageable[]): void {
    if (!this.alive) return;

    this.handleMovement();
    this.handleWeaponSwitch();
    this.handleReload();
    this.handlePower();

    // Apuntar al mouse: en Phaser 4 pointer.worldX NO incluye el scroll de la cámara,
    // así que calculamos las coordenadas de mundo manualmente (screen + scroll).
    const pointer = this.scene.input.activePointer;
    const cam = this.scene.cameras.main;
    const wx = pointer.x + cam.scrollX;
    const wy = pointer.y + cam.scrollY;
    // Miss rate bajo del jugador: pequeña desviación aleatoria del ángulo
    const inaccuracy = GAME_CONSTANTS.PLAYER_MISS_RATE;
    const angle = Phaser.Math.Angle.Between(this.x, this.y, wx, wy) + Phaser.Math.FloatBetween(-inaccuracy, inaccuracy);

    // Disparar / cuchillo con clic (bloqueado durante el countdown)
    if (pointer.isDown && this.combatEnabled) {
      if (this.activeSlot === 3) {
        this.tryKnife(time, targets);
      } else {
this.activeWeapon?.fire(this.x, this.y, angle, targets, time, this.walls, this);
        // Recarga automática cuando el cargador se vacía
        if (this.activeWeapon?.isEmpty && !this.activeWeapon.isReloading) {
          this.activeWeapon.reload();
        }
      }
    }

// Nombre sigue al jugador
    this.nameText.setPosition(this.x, this.y - 28);
  }

  // ============================================================
  // Input
  // ============================================================

  private handleMovement(): void {
    let vx = 0;
    let vy = 0;
    if (this.cursors.left.isDown || this.wasd.A.isDown) vx = -1;
    if (this.cursors.right.isDown || this.wasd.D.isDown) vx = 1;
    if (this.cursors.up.isDown || this.wasd.W.isDown) vy = -1;
    if (this.cursors.down.isDown || this.wasd.S.isDown) vy = 1;

    if (vx !== 0 && vy !== 0) {
      const inv = Math.SQRT1_2;
      vx *= inv;
      vy *= inv;
    }

    this.body.setVelocity(vx * this.speed, vy * this.speed);
  }

  private handleWeaponSwitch(): void {
    if (Phaser.Input.Keyboard.JustDown(this.key1)) this.setSlot(1);
    if (Phaser.Input.Keyboard.JustDown(this.key2)) this.setSlot(2);
    if (Phaser.Input.Keyboard.JustDown(this.key3)) this.setSlot(3);
  }

  private setSlot(slot: 1 | 2 | 3): void {
    if (this.activeSlot === slot) return;
    this.activeSlot = slot;
    EventBus.emit(GameEvents.WEAPON_CHANGED, { slot, player: this });
  }

  private handleReload(): void {
    if (Phaser.Input.Keyboard.JustDown(this.keyR)) {
      this.activeWeapon?.reload();
    }
  }

  private handlePower(): void {
    if (Phaser.Input.Keyboard.JustDown(this.keyQ) || Phaser.Input.Keyboard.JustDown(this.keyShift)) {
      if (consumePower(this)) {
        // Enviar la acción de poder al servidor (multiplayer autoritativo)
        const pointer = this.scene.input.activePointer;
        const angle = Phaser.Math.Angle.Between(this.x, this.y, pointer.worldX, pointer.worldY);
        network.sendPower(angle);

        // TODO(Shrek): efecto real del poder (dash, escudo, kamehameha...)
        // Placeholder: flash cian
        const flash = this.scene.add.circle(this.x, this.y, 40, 0x22d3ee, 0.4).setDepth(6);
        this.scene.tweens.add({
          targets: flash,
          alpha: 0,
          scale: 2.5,
          duration: 300,
          onComplete: () => flash.destroy(),
        });
      }
    }
  }

  // ============================================================
  // Cuchillo (slot 3)
  // ============================================================

  private tryKnife(time: number, targets: Damageable[]): void {
    if (time < this.knifeCooldownUntil) return;
    this.knifeCooldownUntil = time + 400; // 0.4s entre cuchilladas

    // Ángulo hacia el mouse (para el servidor)
    const pointer = this.scene.input.activePointer;
    const angle = Phaser.Math.Angle.Between(this.x, this.y, pointer.worldX, pointer.worldY);
    network.sendKnife(angle);

    // Instakill al primer target vivo en rango melee
    for (const t of targets) {
      if (!t.alive) continue;
      const d = Phaser.Math.Distance.Between(this.x, this.y, t.gameObject.x, t.gameObject.y);
      if (d <= GAME_CONSTANTS.KNIFE_RANGE) {
        const real = applyDamage(t, t.maxHp, this); // instakill, killer = jugador
        addPowerCharge(t, real);
        // Feedback visual
        const spark = this.scene.add.circle(t.gameObject.x, t.gameObject.y, 20, 0xffffff, 0.5).setDepth(6);
        this.scene.tweens.add({
          targets: spark,
          alpha: 0,
          scale: 2,
          duration: 250,
          onComplete: () => spark.destroy(),
        });
        break;
      }
    }
  }

  // ============================================================
  // Daño / cura / Super
  // ============================================================

  /** Recibe daño (también carga la Super con el daño recibido). */
  takeDamage(amount: number): number {
    const real = applyDamage(this, amount);
    if (real > 0) addPowerCharge(this, real);
    return real;
  }

  /** Se cura sin pasar de maxHp. */
  heal(amount: number): number {
    return heal(this, amount);
  }

  /** Registra una kill del jugador (para el kill counter del HUD). */
  registerKill(): void {
    this.kills += 1;
  }

  destroy(): void {
    this.gameObject.destroy();
    this.nameText.destroy();
  }
}