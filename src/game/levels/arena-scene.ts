// src/game/levels/arena-scene.ts — Escena de prueba top-down (ADRENALINA: esqueleto temporal
// que Fiona adoptará como nivel oficial; aquí se validan armas/poderes/cuchillo).
// Todo el feedback visual es procedural (sin assets) para iterar rápido en la jam.
import Phaser from 'phaser';
import type { ArenaContext, PowerId, WeaponId } from '../types';
import { EventBus, GameEvents } from '../types';
import { Player, type PlayerKeys } from '../entities/player';
import { EnemyBot, EnemyBalance, spawnBot } from '../entities/enemies';
import { WEAPONS } from '../systems/weapons';
import { POWERS } from '../systems/powers';
import { CombatSystem } from '../systems/combat';
import { PowerSystem } from '../systems/powers';

const WORLD_W = 960;
const WORLD_H = 640;
const MAX_BOTS = 12;

export class ArenaScene extends Phaser.Scene implements ArenaContext {
  // ArenaContext (lo que los sistemas esperan de la escena)
  bullets!: Phaser.Physics.Arcade.Group;
  orbGroup!: Phaser.Physics.Arcade.Group;
  enemies!: Phaser.Physics.Arcade.Group;
  cover!: Phaser.Physics.Arcade.StaticGroup;

  private player!: Player;
  private keys!: PlayerKeys;

  private hudText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private killText!: Phaser.GameObjects.Text;

  // FX reutilizables
  private aimLine!: Phaser.GameObjects.Line;
  private chargeFx!: Phaser.GameObjects.Arc;
  private teleMarker!: Phaser.GameObjects.Arc;

  private kills = 0;

  constructor() {
    super({ key: 'ArenaScene' });
  }

  create(): void {
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
    this.makeTextures();

    // --- Grupos -------------------------------------------------------------
    this.bullets = this.physics.add.group({ defaultKey: 'bullet', maxSize: 80 });
    this.orbGroup = this.physics.add.group({ defaultKey: 'orb', maxSize: 20 });
    this.enemies = this.physics.add.group();
    this.cover = this.physics.add.staticGroup();

    // --- Jugador -------------------------------------------------------------
    this.player = new Player(this, 180, 320, 'player-1', 'assault_rifle', 'kamehameha');
    this.createCover();
    this.createInput();
    this.createHud();

    // --- Bots iniciales -------------------------------------------------------
    this.spawnBotAt(760, 150);
    this.spawnBotAt(830, 470);
    this.spawnBotAt(150, 530);

    // --- Colisiones/overlaps (una sola vez en create) -------------------------
    this.physics.add.collider(this.player, this.cover);
    this.physics.add.collider(this.enemies, this.cover);
    this.physics.add.collider(this.enemies, this.enemies);
    this.physics.add.overlap(this.bullets, this.enemies, this.onBulletHit);
    this.physics.add.overlap(this.orbGroup, this.enemies, this.onOrbHit);
    this.physics.add.overlap(this.enemies, this.player, this.onEnemyTouch);

    // --- EventBus (desuscribir al cerrar la escena) ----------------------------
    EventBus.on(GameEvents.WeaponFired, this.onWeaponFired, this);
    EventBus.on(GameEvents.PlayerDied, this.onPlayerDied, this);
    EventBus.on(GameEvents.TeleportMarked, this.onTeleportMarked, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      EventBus.off(GameEvents.WeaponFired, this.onWeaponFired, this);
      EventBus.off(GameEvents.PlayerDied, this.onPlayerDied, this);
      EventBus.off(GameEvents.TeleportMarked, this.onTeleportMarked, this);
    });
  }

  // ---------------------------------------------------------------------------
  // Configuración
  // ---------------------------------------------------------------------------
  private createCover(): void {
    const boxes: Array<[number, number, number, number]> = [
      [330, 260, 130, 26],
      [600, 380, 130, 26],
      [470, 430, 44, 44],
      [740, 170, 100, 26],
      [180, 140, 90, 26],
    ];
    for (const [x, y, w, h] of boxes) {
      const img = this.physics.add.staticImage(x, y, 'box');
      img.setDisplaySize(w, h);
      img.setTint(0x3a3a55);
      img.setDepth(3);
      const body = img.body as Phaser.Physics.Arcade.StaticBody;
      body.setSize(w, h, true);
      body.updateFromGameObject();
      this.cover.add(img);
    }
  }

  private createInput(): void {
    this.keys = this.input.keyboard!.addKeys(
      'W,A,S,D,Q,E,ONE,TWO,THREE,FOUR,FIVE,SIX,SEVEN,EIGHT,NINE,ZERO,T',
    ) as PlayerKeys;
    this.input.mouse?.disableContextMenu();

    // Click izquierdo: disparar | Click derecho: cuchillo
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const now = this.time.now;
      if (pointer.leftButtonDown()) {
        this.player.tryFire(now);
      } else if (pointer.rightButtonDown()) {
        CombatSystem.knifeAttack(this, this.player, now, (x, y, a) => this.drawSlash(x, y, a));
      }
    });
  }

  private createHud(): void {
    const style = { fontFamily: 'monospace', fontSize: '13px', color: '#cfcfff' } as const;
    this.hudText = this.add.text(12, 10, '', style).setDepth(100);
    this.statusText = this.add.text(12, 96, '', style).setDepth(100);
    this.killText = this.add.text(12, 150, 'Bots eliminados: 0', style).setDepth(100);

    this.add.rectangle(WORLD_W / 2, 20, 160, 22, 0x000000, 0.45).setDepth(99);
    const title = this.add.text(WORLD_W / 2, 20, 'LOSJONYS ARENA — prototipo', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#ffffff',
    }).setDepth(101);
    title.setOrigin(0.5, 0.5);
  }

  private makeTextures(): void {
    const g = this.add.graphics();
    // Jugador (32x32 círculo)
    g.fillStyle(0xffffff, 1);
    g.fillCircle(16, 16, 13);
    g.lineStyle(2, 0x000000, 1);
    g.strokeCircle(16, 16, 13);
    g.generateTexture('player', 32, 32);
    g.clear();
    // Bot (26x26 cuadrado)
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 26, 26);
    g.lineStyle(2, 0x000000, 1);
    g.strokeRect(1, 1, 24, 24);
    g.generateTexture('enemy', 26, 26);
    g.clear();
    // Proyectil (8x8)
    g.fillStyle(0xffffff, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture('bullet', 8, 8);
    g.clear();
    // Esfera de ceguera (22x22)
    g.fillStyle(0xffffff, 1);
    g.fillCircle(11, 11, 11);
    g.generateTexture('orb', 22, 22);
    g.clear();
    // Caja/cobertura (128x128, se reescala con displaySize)
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 128, 128);
    g.generateTexture('box', 128, 128);
    g.destroy();
  }

  // ---------------------------------------------------------------------------
  // Update
  // ---------------------------------------------------------------------------
  update(): void {
    const now = this.time.now;
    const p = this.player;

    // Jugador (facing, movimiento, tint, auto-fire, sniper)
    p.update(now);

    // Cuchillo con tecla Q
    if (Phaser.Input.Keyboard.JustDown(this.keys.Q)) {
      CombatSystem.knifeAttack(this, p, now, (x, y, a) => this.drawSlash(x, y, a));
    }

    // Poder con tecla E
    if (Phaser.Input.Keyboard.JustDown(this.keys.E)) {
      PowerSystem.tryActivate(this, p, now);
    }

    // Cómputo de input de cambio de arma (1-5)
    this.handleWeaponKeys(now);
    this.handlePowerKeys();

    // Spawn bot de prueba (T)
    if (Phaser.Input.Keyboard.JustDown(this.keys.T) && this.enemies.countActive(true) < MAX_BOTS) {
      for (let i = 0; i < 3; i++) this.spawnBotAt(Phaser.Math.Between(80, WORLD_W - 80), Phaser.Math.Between(80, WORLD_H - 80));
    }

    // Bots
    for (const obj of this.enemies.getChildren()) {
      if (obj instanceof EnemyBot && obj.active) obj.update(now, p);
    }

    // Proyectiles: aplicar alcance máximo (y explosión al agotar rango)
    for (const obj of this.bullets.getChildren()) {
      if (!obj.active) continue;
      const b = obj as Phaser.Physics.Arcade.Image;
      const stats = WEAPONS[b.getData('weaponId') as WeaponId];
      const traveled = ((now - (b.getData('bornAt') as number)) * stats.pelletSpeed) / 1000;
      if (traveled >= stats.range) {
        if (stats.explosive) this.explodeAt(b.x, b.y, stats.explosionRadius, stats.damage, now);
        b.disableBody(true, true);
      }
    }

    // FX: línea de puntería del sniper
    if (p.sniperWindupStart >= 0) {
      this.aimLine.setVisible(true).setPosition(p.x, p.y).setRotation(p.rotation);
    } else {
      this.aimLine.setVisible(false);
    }

    // FX: carga del kamehameha (y disparo al vencer el windup)
    if (p.kamehamehaChargeUntil > 0) {
      if (now >= p.kamehamehaChargeUntil) {
        this.fireKamehameha(now);
      } else {
        const progress = 1 - (p.kamehamehaChargeUntil - now) / POWERS.kamehameha.windupMs;
        this.chargeFx.setVisible(true).setPosition(
          p.x + Math.cos(p.rotation) * 40,
          p.y + Math.sin(p.rotation) * 40,
        ).setScale(1 + progress * 3);
      }
    } else {
      this.chargeFx.setVisible(false);
    }

    // FX: marcador de teletransporte
    if (p.teleportMarker) {
      this.teleMarker.setVisible(true).setPosition(p.teleportMarker.x, p.teleportMarker.y);
    } else {
      this.teleMarker.setVisible(false);
    }

    this.updateHud(now);
  }

  // ---------------------------------------------------------------------------
  // Input helper
  // ---------------------------------------------------------------------------
  private handleWeaponKeys(now: number): void {
    const map: Array<[Phaser.Input.Keyboard.Key, WeaponId]> = [
      [this.keys.ONE, 'shotgun'],
      [this.keys.TWO, 'assault_rifle'],
      [this.keys.THREE, 'sniper'],
      [this.keys.FOUR, 'smg'],
      [this.keys.FIVE, 'grenade_launcher'],
    ];
    for (const [key, id] of map) {
      if (Phaser.Input.Keyboard.JustDown(key)) {
        this.player.setWeapon(id);
        EventBus.emit(GameEvents.WeaponFired, { playerId: this.player.playerId, weaponId: id });
      }
    }
  }

  private handlePowerKeys(): void {
    const map: Array<[Phaser.Input.Keyboard.Key, PowerId]> = [
      [this.keys.SIX, 'kamehameha'],
      [this.keys.SEVEN, 'dash'],
      [this.keys.EIGHT, 'shield'],
      [this.keys.NINE, 'blind'],
      [this.keys.ZERO, 'teleport'],
    ];
    for (const [key, id] of map) {
      if (Phaser.Input.Keyboard.JustDown(key)) this.player.setPower(id);
    }
  }

  // ---------------------------------------------------------------------------
  // Eventos del contrato
  // ---------------------------------------------------------------------------
  private onWeaponFired(payload: { playerId: string }): void {
    if (payload.playerId !== this.player.playerId || !this.player.active) return;
    const a = this.player.rotation;
    const flash = this.add.circle(
      this.player.x + Math.cos(a) * 26,
      this.player.y + Math.sin(a) * 26,
      6,
      0xffdd88,
      0.9,
    ).setDepth(8);
    this.tweens.add({ targets: flash, alpha: 0, scale: 1.6, duration: 90, onComplete: () => flash.destroy() });
  }

  private onPlayerDied(): void {
    this.time.delayedCall(600, () => this.scene.restart());
  }

  private onTeleportMarked(payload: { x: number; y: number }): void {
    this.teleMarker.setVisible(true).setPosition(payload.x, payload.y);
  }

  // ---------------------------------------------------------------------------
  // Combate / FX
  // ---------------------------------------------------------------------------
  private onBulletHit(obj1: unknown, obj2: unknown): void {
    const bullet = obj1 as Phaser.Physics.Arcade.Image;
    const enemy = obj2 as EnemyBot;
    const stats = WEAPONS[bullet.getData('weaponId') as WeaponId];
    const now = this.time.now;
    bullet.disableBody(true, true);
    if (stats.explosive) {
      this.explodeAt(bullet.x, bullet.y, stats.explosionRadius, stats.damage, now);
    } else {
      CombatSystem.damage(enemy, stats.damage, bullet.getData('weaponId') as string, now);
    }
  }

  private onOrbHit(obj1: unknown, obj2: unknown): void {
    const orb = obj1 as Phaser.Physics.Arcade.Image;
    const enemy = obj2 as EnemyBot;
    const ms = orb.getData('blindMs') as number;
    orb.disableBody(true, true);
    CombatSystem.applyBlind(enemy, ms, this.time.now);
  }

  private onEnemyTouch(enemyObj: unknown, playerObj: unknown): void {
    const enemy = enemyObj as EnemyBot;
    const player = playerObj as Player;
    const now = this.time.now;
    if (!enemy.canContactDamage(now)) return;
    enemy.setContactCooldown(now);
    CombatSystem.damage(player, EnemyBalance.contactDamage, enemy.botId, now);
  }

  private fireKamehameha(now: number): void {
    const p = this.player;
    p.kamehamehaChargeUntil = 0;
    p.powerCdUntil = now + POWERS.kamehameha.cooldownMs;

    const a = p.rotation;
    const cx = p.x + Math.cos(a) * 70;
    const cy = p.y + Math.sin(a) * 70;
    const beam = this.add.rectangle(cx, cy, 640, 36, 0x88ddff, 0.8).setRotation(a).setDepth(6);
    this.tweens.add({ targets: beam, scaleX: 0.6, alpha: 0, duration: 320, onComplete: () => beam.destroy() });
    this.cameras.main.shake(140, 0.006);

    // Daño a enemigos dentro del cono del rayo
    for (const obj of this.enemies.getChildren()) {
      if (!(obj instanceof EnemyBot) || !obj.active) continue;
      const dist = Phaser.Math.Distance.Between(p.x, p.y, obj.x, obj.y);
      const angTo = Phaser.Math.Angle.Between(p.x, p.y, obj.x, obj.y);
      const diff = Math.abs(Phaser.Math.Angle.Wrap(angTo - a));
      if (dist <= 340 && diff <= 0.3) {
        CombatSystem.damage(obj, POWERS.kamehameha.damage, 'kamehameha', now);
      }
    }
  }

  private explodeAt(x: number, y: number, radius: number, damage: number, now: number): void {
    const blast = this.add.circle(x, y, radius * 0.2, 0xff9933, 0.9).setDepth(5);
    this.tweens.add({ targets: blast, scale: 5, alpha: 0, duration: 280, onComplete: () => blast.destroy() });
    this.cameras.main.shake(120, 0.005);

    for (const obj of this.enemies.getChildren()) {
      if (!(obj instanceof EnemyBot) || !obj.active) continue;
      if (Phaser.Math.Distance.Between(x, y, obj.x, obj.y) <= radius) {
        CombatSystem.damage(obj, damage, 'explosion', now);
      }
    }
  }

  private drawSlash(x: number, y: number, angle: number): void {
    const g = this.add.graphics().setDepth(11);
    const r = 46;
    const p1x = x + Math.cos(angle) * r;
    const p1y = y + Math.sin(angle) * r;
    const p2x = x + Math.cos(angle - 0.6) * r;
    const p2y = y + Math.sin(angle - 0.6) * r;
    const p3x = x + Math.cos(angle + 0.6) * r;
    const p3y = y + Math.sin(angle + 0.6) * r;
    g.fillStyle(0xffffff, 0.75);
    g.fillTriangle(p1x, p1y, p2x, p2y, p3x, p3y);
    this.tweens.add({ targets: g, alpha: 0, duration: 130, onComplete: () => g.destroy() });
  }

  private spawnBotAt(x: number, y: number): void {
    spawnBot(this, this.enemies, x, y);
  }

  // ---------------------------------------------------------------------------
  // HUD (temporal de prueba; Fiona lo sustituirá por la UI oficial)
  // ---------------------------------------------------------------------------
  private updateHud(now: number): void {
    const p = this.player;
    const w = WEAPONS[p.weaponId];
    const pw = POWERS[p.powerId];

    const cdK = Math.max(0, (p.knifeCdUntil - now) / 1000);
    const cdW = Math.max(0, (p.weaponCdUntil - now) / 1000);
    const cdP = Math.max(0, (p.powerCdUntil - now) / 1000);

    const arma = `${w.name} ${p.sniperWindupStart >= 0 ? '[CARGANDO...]' : ''}`;
    const poder = `${pw.name}${p.kamehamehaChargeUntil > now ? ' [CARGANDO...]' : ''}${
      p.isShielded ? ' [ESCUDO]' : ''
    }`;

    this.hudText.setText([
      'MOV: WASD | MIRA: Mouse | DISPARA: Click izq | CUCHILLO: Click der / Q | PODER: E | BOT: T',
      'ARMA: 1 Escopeta | 2 Rifle | 3 Sniper | 4 SMG | 5 Granadas',
      'PODER: 6 Kamehameha | 7 Dash | 8 Escudo | 9 Ceguera | 0 Teletransporte',
    ]);
    this.statusText.setText([
      `HP: ${p.hp}/${p.maxHp}`,
      `Arma: ${arma} (CD ${cdW.toFixed(1)}s)`,
      `Poder: ${poder} (CD ${cdP.toFixed(1)}s)`,
      `Cuchillo: ${cdK > 0 ? cdK.toFixed(1) + 's' : 'LISTO'}  ${
        p.teleportMarker ? '| Teletransporte: marcado' : ''
      }`,
    ]);
    this.killText.setText(`Bots eliminados: ${this.kills}`);
  }

  /** La escena también cuenta bajas (auto-escucha el EnemyDied via counter local en bots) */
  private countKill(_payload: { source: string }): void {
    this.kills += 1;
  }
}