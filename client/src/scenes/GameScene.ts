import Phaser from 'phaser';
import { GAME_CONSTANTS, EventBus, GameEvents, type GameMode, type JonyConfig, type PowerId } from '../types';
import { network } from '../systems/network';
import { loadJony } from '../data/catalog';
import { THEME, monoStyle, monoFaStyle } from '../ui/theme';
import { ICONS, fa, iconStyle } from '../ui/icons';
import { Player } from '../entities/Player';
import type { Damageable } from '../systems/combat';
import { WEAPONS } from '../systems/weapon-catalog';

/**
 * GameScene — Arena de juego.
 *
 * PUCK main: estructura base + red del cliente (NetworkManager) + HUD.
 * puck pilas: gameplay básico del cliente (Player, Weapon, combat) —
 *   base para que Shrek ponga el gameplay real (sprites, enemigos, poderes).
 *
 * - Jugador local: Player (entities/Player.ts) con armas del catálogo real.
 * - Dummies de prueba (placeholder hasta que Shrek ponga enemigos).
 * - HUD FontAwesome: HP (heart), Super (zap), slots de arma 1/2/3.
 * - Red: conecta al servidor si está disponible (no bloquea offline).
 */

/** Dummy de prueba (placeholder de enemigo — Shrek lo reemplaza). */
class Dummy implements Damageable {
  readonly gameObject: Phaser.GameObjects.Arc;
  readonly name: string;
  hp: number;
  maxHp: number;
  alive = true;
  powerCharge = 0;
  powerId: PowerId = 'p1';

  constructor(scene: Phaser.Scene, x: number, y: number, name: string, color: string) {
    this.name = name;
    this.maxHp = GAME_CONSTANTS.BASE_HP;
    this.hp = this.maxHp;
    this.gameObject = scene.add.circle(x, y, 18, Phaser.Display.Color.HexStringToColor(color).color);
    // Body estático para que los proyectiles hagan overlap
    scene.physics.add.existing(this.gameObject as unknown as Phaser.GameObjects.GameObject, true);
    scene.add
      .text(x, y - 32, name, monoStyle({ fontSize: '11px', color: '#888888' }))
      .setOrigin(0.5);
  }
}

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private dummies: Damageable[] = [];
  private mode: GameMode = 'ffa';
  private netStatus?: Phaser.GameObjects.Text;

  // HUD
  private hpFill?: Phaser.GameObjects.Rectangle;
  private hpText?: Phaser.GameObjects.Text;
  private superFill?: Phaser.GameObjects.Rectangle;
  private superText?: Phaser.GameObjects.Text;
  private slotHighlights: Phaser.GameObjects.Rectangle[] = [];
  private superReadyFlash?: Phaser.GameObjects.Text;
  private deathOverlay?: Phaser.GameObjects.Text;

  constructor() {
    super('GameScene');
  }

  init(data: { mode?: GameMode }): void {
    this.mode = data.mode ?? 'ffa';
  }

  create(): void {
    const { width, height } = this.scale;
    const jony = loadJony();

    // Fondo de la arena
    this.add.rectangle(width / 2, height / 2, width, height, 0x2a2a3f);

    // Jugador local (Player de entities/ — base de puck pilas, Shrek extiende)
    const fallback: JonyConfig = {
      name: 'Jony',
      color: THEME.accent,
      accessory: '',
      weapon1: 'w1',
      weapon2: 'w2',
      power: 'p1',
    };
    this.player = new Player(this, jony ?? fallback, width / 2, height / 2);

    // Dummies de prueba (placeholder hasta que Shrek ponga enemigos reales)
    this.createDummies();

    // HUD
    this.createHud();

    // Instrucciones
    this.add
      .text(10, 10, 'WASD: mover | Clic: disparar | 1/2/3: arma | R: recargar | Q: poder', monoStyle({
        fontSize: '12px',
        color: '#888888',
      }))
      .setOrigin(0, 0);

    // Estado de red (esquina superior derecha)
    this.netStatus = this.add
      .text(width - 10, 10, 'RED: conectando...', monoStyle({
        fontSize: '12px',
        color: '#888888',
      }))
      .setOrigin(1, 0);

    // Conectar al servidor (no bloquea el juego si falla)
    this.connectToServer(jony);

    // Eventos del contrato
    EventBus.on(GameEvents.WEAPON_CHANGED, this.onWeaponChanged, this);
    EventBus.on(GameEvents.POWER_READY, this.onPowerReady, this);
    EventBus.on(GameEvents.PLAYER_DIED, this.onPlayerDied, this);

    // Volver al menú
    this.input.keyboard!.on('keydown-ESC', () => {
      network.disconnect();
      this.scene.start('MenuScene');
    });
  }

  update(time: number): void {
    if (this.player.alive) {
      this.player.update(time, this.dummies);

      // Enviar posición al servidor (si está conectado)
      if (network.isConnected) {
        network.sendMove(this.player.x, this.player.y);
      }
    }

    this.updateHud();
  }

  shutdown(): void {
    EventBus.off(GameEvents.WEAPON_CHANGED, this.onWeaponChanged, this);
    EventBus.off(GameEvents.POWER_READY, this.onPowerReady, this);
    EventBus.off(GameEvents.PLAYER_DIED, this.onPlayerDied, this);
    this.player?.destroy();
    this.dummies = [];
  }

  // ============================================================
  // Dummies de prueba
  // ============================================================

  private createDummies(): void {
    const { width, height } = this.scale;
    const spots: Array<[number, number, string, string]> = [
      [width * 0.25, height * 0.3, 'DUMMY 1', '#ef4444'],
      [width * 0.75, height * 0.3, 'DUMMY 2', '#3b82f6'],
      [width * 0.5, height * 0.7, 'DUMMY 3', '#a855f7'],
    ];
    this.dummies = spots.map(([x, y, name, color]) => new Dummy(this, x, y, name, color));
  }

  // ============================================================
  // HUD (FontAwesome)
  // ============================================================

  private createHud(): void {
    const { width } = this.scale;
    const jony = this.player.jony;

    // ---- Barra de vida (heart) ----
    this.add
      .text(24, 24, ICONS.heart, iconStyle({ fontSize: '22px', color: '#ef4444' }))
      .setOrigin(0.5);

    this.add
      .rectangle(52, 24, 220, 14, 0x000000, 0.5)
      .setStrokeStyle(1, Phaser.Display.Color.HexStringToColor(THEME.border).color)
      .setOrigin(0, 0.5);
    this.hpFill = this.add
      .rectangle(54, 24, 216, 10, 0xef4444)
      .setOrigin(0, 0.5);

    this.hpText = this.add
      .text(280, 24, '', monoStyle({ fontSize: '12px', color: THEME.text }))
      .setOrigin(0, 0.5);

    // ---- Barra de Super (zap) ----
    this.add
      .text(24, 52, ICONS.zap, iconStyle({ fontSize: '22px', color: '#facc15' }))
      .setOrigin(0.5);

    this.add
      .rectangle(52, 52, 220, 14, 0x000000, 0.5)
      .setStrokeStyle(1, Phaser.Display.Color.HexStringToColor(THEME.border).color)
      .setOrigin(0, 0.5);
    this.superFill = this.add
      .rectangle(54, 52, 216, 10, 0xfacc15)
      .setOrigin(0, 0.5);

    this.superText = this.add
      .text(280, 52, '', monoStyle({ fontSize: '12px', color: THEME.text }))
      .setOrigin(0, 0.5);

    // Flash cuando el Super está listo
    this.superReadyFlash = this.add
      .text(52, 80, `${fa('zap')}  SUPER LISTO`, monoFaStyle({
        fontSize: '14px',
        color: '#facc15',
        fontStyle: 'bold',
      }))
      .setOrigin(0, 0.5)
      .setAlpha(0);

    // ---- Slots de arma 1/2/3 (1 y 2 del loadout, 3 = cuchillo) ----
    const slotLabels: Array<[string, string]> = [
      [`1  ${fa('gun')}`, WEAPONS[this.player.jony.weapon1].name.toUpperCase()],
      [`2  ${fa('gun')}`, WEAPONS[this.player.jony.weapon2].name.toUpperCase()],
      [`3  ${fa('fist')}`, 'CUCHILLO'],
    ];

    const slotW = 150;
    const slotGap = 12;
    const totalW = 3 * slotW + 2 * slotGap;
    const startX = (width - totalW) / 2 + slotW / 2;
    const slotY = this.scale.height - 34;

    slotLabels.forEach(([label, name], i) => {
      const x = startX + i * (slotW + slotGap);

      // Fondo del slot
      this.add
        .rectangle(x, slotY, slotW, 40, 0x000000, 0.4)
        .setStrokeStyle(1, Phaser.Display.Color.HexStringToColor(THEME.border).color);

      // Highlight del slot activo
      const hl = this.add
        .rectangle(x, slotY, slotW, 40, 0x000000, 0)
        .setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(THEME.accent).color)
        .setAlpha(0);
      this.slotHighlights.push(hl);

      // Icono + número
      this.add
        .text(x - 40, slotY - 6, label, monoFaStyle({
          fontSize: '16px',
          color: THEME.text,
        }))
        .setOrigin(0.5);

      // Nombre del arma
      this.add
        .text(x, slotY + 12, name, monoStyle({
          fontSize: '9px',
          color: THEME.secondary,
          letterSpacing: 1,
        }))
        .setOrigin(0.5);
    });

    this.onWeaponChanged({ slot: this.player.activeSlot });
  }

  private updateHud(): void {
    if (!this.player.alive) return;

    // Vida
    const hpPct = this.player.hp / this.player.maxHp;
    this.hpFill?.setScale(Math.max(0, hpPct), 1);
    this.hpText?.setText(`${this.player.hp}/${this.player.maxHp}`);

    // Super
    const power = this.player.powerCharge;
    const required = 500; // chargeRequired del poder (placeholder: p1 = 500)
    const superPct = Math.min(1, power / required);
    this.superFill?.setScale(Math.max(0, superPct), 1);
    this.superText?.setText(power >= required ? 'LISTO (Q)' : `${Math.floor(superPct * 100)}%`);
  }

  // ============================================================
  // Eventos del contrato
  // ============================================================

  private onWeaponChanged(data: { slot: 1 | 2 | 3 }): void {
    this.slotHighlights.forEach((hl, i) => {
      hl.setAlpha(i + 1 === data.slot ? 1 : 0);
    });
  }

  private onPowerReady(): void {
    if (!this.superReadyFlash) return;
    this.superReadyFlash.setAlpha(1);
    this.tweens.add({
      targets: this.superReadyFlash,
      alpha: 0,
      delay: 1500,
      duration: 500,
    });
  }

  private onPlayerDied(target: Damageable): void {
    if (target !== this.player) return;

    const { width, height } = this.scale;
    this.deathOverlay = this.add
      .text(width / 2, height / 2, 'HAS MUERTO\nESC para salir', monoStyle({
        fontSize: '32px',
        color: '#ef4444',
        align: 'center',
        fontStyle: 'bold',
      }))
      .setOrigin(0.5)
      .setDepth(20);
  }

  // ============================================================
  // Red (PUCK main)
  // ============================================================

  private async connectToServer(jony: ReturnType<typeof loadJony>): Promise<void> {
    if (!jony) {
      this.netStatus?.setText('RED: sin Jony guardado');
      return;
    }
    try {
      await network.joinRoom(jony, this.mode);
      this.netStatus?.setText('RED: conectado');
    } catch {
      this.netStatus?.setText('RED: sin servidor (offline)');
    }
  }
}