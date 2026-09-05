import Phaser from 'phaser';
import { GAME_CONSTANTS, EventBus, GameEvents, type GameMode, type JonyConfig, type PowerId } from '../types';
import { network } from '../systems/network';
import { loadJony } from '../data/catalog';
import { THEME, monoStyle, monoFaStyle } from '../ui/theme';
import { ICONS, fa, iconStyle } from '../ui/icons';
import { Player } from '../entities/Player';
import { NPC } from '../entities/NPC';
import { RemotePlayer } from '../entities/RemotePlayer';
import type { Damageable } from '../systems/combat';
import { WEAPONS } from '../systems/weapon-catalog';
import { generateMap, type WallRect } from '../systems/map-gen';
import { pickRandomArena, type Arena } from '../systems/arenas';
import { BackgroundSystem } from '../systems/backgrounds';
import { MusicSystem } from '../systems/music-system';
import type { ServerGameState } from '../systems/network';

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
  private solo = false;
  private netStatus?: Phaser.GameObjects.Text;

  // Mapa procedural (paredes)
  private walls: Phaser.GameObjects.Rectangle[] = [];

  // Arena elegida aleatoriamente (catálogo de Shrek)
  private arena: Arena = pickRandomArena();

  // Countdown inicial (3-2-1-PELEA): nadie dispara ni recibe daño
  private countdownActive = true;
  private countdownText?: Phaser.GameObjects.Text;

  // Jugadores remotos (multiplayer) — id del servidor → RemotePlayer
  private remotePlayers = new Map<string, RemotePlayer>();

  // HUD
  private hpFill?: Phaser.GameObjects.Rectangle;
  private hpText?: Phaser.GameObjects.Text;
  private superFill?: Phaser.GameObjects.Rectangle;
  private superText?: Phaser.GameObjects.Text;
  private slotHighlights: Phaser.GameObjects.Rectangle[] = [];
  private superReadyFlash?: Phaser.GameObjects.Text;
  private deathOverlay?: Phaser.GameObjects.Text;
  private ammoText?: Phaser.GameObjects.Text;
  private killText?: Phaser.GameObjects.Text;

  constructor() {
    super('GameScene');
  }

  init(data: { mode?: GameMode; solo?: boolean }): void {
    this.mode = data.mode ?? 'ffa';
    this.solo = data.solo ?? false;
  }

  create(): void {
    const { width, height } = this.scale;
    const jony = loadJony();

    // Mundo más grande que la pantalla: la cámara sigue al jugador.
    // El fondo y las paredes se generan en el mundo (ARENA_WIDTH x ARENA_HEIGHT).
    this.physics.world.setBounds(0, 0, GAME_CONSTANTS.ARENA_WIDTH, GAME_CONSTANTS.ARENA_HEIGHT);
    this.cameras.main.setBounds(0, 0, GAME_CONSTANTS.ARENA_WIDTH, GAME_CONSTANTS.ARENA_HEIGHT);

    // Fondo de la arena: fondos animados de Shrek (rotativos cada 30s)
    BackgroundSystem.installArena(this);

    // Mapa procedural: paredes aleatorias (no bloquean la zona de spawn)
    this.createWalls();

    // Jugador local (Player de entities/ — base de puck pilas, Shrek extiende)
    const fallback: JonyConfig = {
      name: 'Jony',
      color: THEME.accent,
      accessory: '',
      weapon1: 'w1',
      weapon2: 'w2',
      power: 'p1',
    };
    this.player = new Player(this, jony ?? fallback, GAME_CONSTANTS.ARENA_WIDTH / 2, GAME_CONSTANTS.ARENA_HEIGHT / 2);
    this.player.setWalls(this.walls);

    // Dummies de prueba (placeholder hasta que Shrek ponga enemigos reales)
    if (this.solo) {
      this.createNpcs();
    } else {
      this.createDummies();
    }

    // Pasar las paredes a los NPCs (bloquean sus disparos)
    for (const d of this.dummies) {
      if (d instanceof NPC) d.setWalls(this.walls);
    }

    // Colliders con las paredes (jugador + NPCs)
    this.physics.add.collider(this.player.gameObject, this.walls);
    for (const d of this.dummies) {
      this.physics.add.collider(d.gameObject, this.walls);
    }

    // La cámara sigue al jugador
    this.cameras.main.startFollow(this.player.gameObject, true, 0.12, 0.12);

    // Música de arena: canción del arma principal del Jony local
    MusicSystem.init(this, this.player.jony.weapon1);

    // HUD
    this.createHud();

    // Countdown inicial: 3-2-1-PELEA (nadie dispara ni recibe daño)
    this.player.setCombatEnabled(false);
    this.startCountdown();

    // Instrucciones
    this.add
      .text(10, 10, 'WASD: mover | Clic: disparar | 1/2/3: arma | R: recargar | Q: poder', monoStyle({
        fontSize: '12px',
        color: '#888888',
      }))
      .setOrigin(0, 0)
      .setScrollFactor(0);

    // Estado de red (esquina superior derecha)
    this.netStatus = this.add
      .text(width - 10, 10, 'RED: conectando...', monoStyle({
        fontSize: '12px',
        color: '#888888',
      }))
      .setOrigin(1, 0)
      .setScrollFactor(0);

    // Conectar al servidor (no bloquea el juego si falla)
    this.connectToServer(jony);

    // Eventos del contrato
    EventBus.on(GameEvents.WEAPON_CHANGED, this.onWeaponChanged, this);
    EventBus.on(GameEvents.POWER_READY, this.onPowerReady, this);
    EventBus.on(GameEvents.PLAYER_DIED, this.onPlayerDied, this);
    EventBus.on(GameEvents.SCENE_CHANGED, this.onServerState, this);

    // Volver al menú
    this.input.keyboard!.on('keydown-ESC', () => {
      network.disconnect();
      this.scene.start('MenuScene');
    });
  }

  update(time: number): void {
    if (this.player.alive) {
      // Durante el countdown el jugador se mueve pero no hay targets (no dispara)
      this.player.update(time, this.countdownActive ? [] : this.dummies);

      // Enviar posición al servidor (si está conectado)
      if (network.isConnected) {
        network.sendMove(this.player.x, this.player.y);
      }
    }

    // Actualizar NPCs (modo solitario): todos contra todos — cada bot ataca
    // al jugador Y a los demás bots. Quietos durante el countdown.
    if (!this.countdownActive) {
      for (const d of this.dummies) {
        if (d instanceof NPC) {
          const others = this.dummies.filter((o) => o !== d);
          d.update(time, [this.player, ...others]);
        }
      }
    }

    // Respawn de NPCs eliminado: los bots ya NO reviven (muerte definitiva con 💀).
    // El estado muerto visual lo maneja NPC.showDeath().

    this.updateHud();
  }

  shutdown(): void {
    EventBus.off(GameEvents.WEAPON_CHANGED, this.onWeaponChanged, this);
    EventBus.off(GameEvents.POWER_READY, this.onPowerReady, this);
    EventBus.off(GameEvents.PLAYER_DIED, this.onPlayerDied, this);
    EventBus.off(GameEvents.SCENE_CHANGED, this.onServerState, this);
    MusicSystem.stop();
    this.player?.destroy();
    for (const d of this.dummies) {
      if (d instanceof NPC) d.destroy();
    }
    this.dummies = [];
    this.remotePlayers.forEach((rp) => rp.destroy());
    this.remotePlayers.clear();
    this.walls.forEach((w) => w.destroy());
    this.walls = [];
    this.countdownText?.destroy();
    this.countdownText = undefined;
    this.countdownActive = true;
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
  // NPCs (modo solitario)
  // ============================================================

  private createNpcs(): void {
    // Partida de 4: jugador + 3 bots
    const names = ['BOT 1', 'BOT 2', 'BOT 3'];
    const colors = ['#ef4444', '#3b82f6', '#a855f7'];

    // Cada bot spawnea alejado del jugador y de los demás bots
    const taken: Array<[number, number]> = [];
    for (let i = 0; i < names.length; i++) {
      const [x, y] = this.randomSpawn(300, 280, taken);
      taken.push([x, y]);
      this.dummies.push(new NPC(this, x, y, names[i], colors[i]));
    }
  }

  /** Posición aleatoria lejos del jugador y de otras posiciones tomadas. */
  private randomSpawn(minFromPlayer: number, minBetween: number, taken: Array<[number, number]> = []): [number, number] {
    const { ARENA_WIDTH: width, ARENA_HEIGHT: height } = GAME_CONSTANTS;
    for (let i = 0; i < 80; i++) {
      const x = Phaser.Math.Between(100, width - 100);
      const y = Phaser.Math.Between(100, height - 100);

      // Lejos del jugador
      if (this.player && Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < minFromPlayer) continue;

      // Lejos de las otras posiciones tomadas
      let ok = true;
      for (const [tx, ty] of taken) {
        if (Phaser.Math.Distance.Between(x, y, tx, ty) < minBetween) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;

      return [x, y];
    }
    // Fallback: esquina alejada del centro
    return [Phaser.Math.Between(100, width / 2 - 80), Phaser.Math.Between(100, height / 2 - 80)];
  }

  // ============================================================
  // Mapa procedural (paredes)
  // ============================================================

  private createWalls(): void {
    const { ARENA_WIDTH: width, ARENA_HEIGHT: height } = GAME_CONSTANTS;
    const rects: WallRect[] = generateMap(width, height, {
      count: 16,
      safeRadius: 300, // respeta la zona de spawn central
    });

    this.walls = rects.map((r) => {
      const rect = this.add
        .rectangle(r.x + r.w / 2, r.y + r.h / 2, r.w, r.h, 0x1a1a2e)
        .setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(this.arena.accentColor).color);
      // Cuerpo estático para colisiones
      this.physics.add.existing(rect as unknown as Phaser.GameObjects.GameObject, true);
      return rect;
    });
  }

  // ============================================================
  // Countdown inicial (3-2-1-PELEA)
  // ============================================================

  private startCountdown(): void {
    const { width, height } = this.scale;
    const total = GAME_CONSTANTS.COUNTDOWN_SECONDS; // 10s
    const steps: string[] = [];
    for (let i = total; i >= 1; i--) steps.push(String(i));
    steps.push('¡PELEA!');

    this.countdownText = this.add
      .text(width / 2, height / 2, steps[0], monoStyle({
        fontSize: '72px',
        color: THEME.accent,
        fontStyle: 'bold',
      }))
      .setOrigin(0.5)
      .setDepth(30)
      .setScrollFactor(0);

    // Entrada del primer número
    this.countdownText.setScale(0.4);
    this.tweens.add({ targets: this.countdownText, scale: 1, duration: 250 });

    let i = 0;
    const tick = (): void => {
      i++;
      if (i >= steps.length) {
this.countdownText?.destroy();
      this.countdownText = undefined;
      this.countdownActive = false;
      this.player.setCombatEnabled(true);
      return;
      }
      this.countdownText?.setText(steps[i]);
      this.countdownText?.setScale(0.4);
      this.tweens.add({ targets: this.countdownText, scale: 1, duration: 200 });
      this.time.delayedCall(1000, tick);
    };
    this.time.delayedCall(1000, tick);
  }

  // ============================================================
  // HUD (FontAwesome)
  // ============================================================

  private createHud(): void {
    const { width } = this.scale;
    const jony = this.player.jony;

    // ---- Barra de vida (heart) — VERTICAL, se vacía de arriba hacia abajo ----
    this.add
      .text(24, 24, ICONS.heart, iconStyle({ fontSize: '22px', color: '#22c55e' }))
      .setOrigin(0.5)
      .setScrollFactor(0);

    // Fondo de la barra (marco)
    this.add
      .rectangle(52, 24, 14, 60, 0x000000, 0.5)
      .setStrokeStyle(1, Phaser.Display.Color.HexStringToColor(THEME.border).color)
      .setOrigin(0.5, 0)
      .setScrollFactor(0);

    // Relleno verde anclado abajo: al escalar en Y se vacía desde arriba
    this.hpFill = this.add
      .rectangle(52, 26, 10, 56, 0x22c55e)
      .setOrigin(0.5, 1)
      .setScrollFactor(0);

    this.hpText = this.add
      .text(70, 24, '', monoStyle({ fontSize: '12px', color: THEME.text }))
      .setOrigin(0, 0.5)
      .setScrollFactor(0);

    // ---- Barra de Super (zap) — VERTICAL, igual que la vida ----
    this.add
      .text(24, 100, ICONS.zap, iconStyle({ fontSize: '22px', color: '#facc15' }))
      .setOrigin(0.5)
      .setScrollFactor(0);

    this.add
      .rectangle(52, 100, 14, 60, 0x000000, 0.5)
      .setStrokeStyle(1, Phaser.Display.Color.HexStringToColor(THEME.border).color)
      .setOrigin(0.5, 0)
      .setScrollFactor(0);
    this.superFill = this.add
      .rectangle(52, 102, 10, 56, 0xfacc15)
      .setOrigin(0.5, 1)
      .setScrollFactor(0);

    this.superText = this.add
      .text(70, 100, '', monoStyle({ fontSize: '12px', color: THEME.text }))
      .setOrigin(0, 0.5)
      .setScrollFactor(0);

    // Flash cuando el Super está listo
    this.superReadyFlash = this.add
      .text(52, 172, `${fa('zap')}  SUPER LISTO`, monoFaStyle({
        fontSize: '14px',
        color: '#facc15',
        fontStyle: 'bold',
      }))
      .setOrigin(0, 0.5)
      .setAlpha(0)
      .setScrollFactor(0);

    // ---- Kill counter (esquina superior derecha, debajo del estado de red) ----
    this.killText = this.add
      .text(width - 10, 40, '💀 0', monoStyle({
        fontSize: '18px',
        color: '#f87171',
        fontStyle: 'bold',
      }))
      .setOrigin(1, 0)
      .setScrollFactor(0);

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
        .setStrokeStyle(1, Phaser.Display.Color.HexStringToColor(THEME.border).color)
        .setScrollFactor(0);

      // Highlight del slot activo
      const hl = this.add
        .rectangle(x, slotY, slotW, 40, 0x000000, 0)
        .setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(THEME.accent).color)
        .setAlpha(0)
        .setScrollFactor(0);
      this.slotHighlights.push(hl);

      // Icono + número
      this.add
        .text(x - 40, slotY - 6, label, monoFaStyle({
          fontSize: '16px',
          color: THEME.text,
        }))
        .setOrigin(0.5)
        .setScrollFactor(0);

      // Nombre del arma
      this.add
        .text(x, slotY + 12, name, monoStyle({
          fontSize: '9px',
          color: THEME.secondary,
          letterSpacing: 1,
        }))
        .setOrigin(0.5)
        .setScrollFactor(0);
    });

    // ---- Munición (cargador) ----
    this.ammoText = this.add
      .text(width / 2, this.scale.height - 84, '', monoStyle({
        fontSize: '16px',
        color: THEME.text,
        fontStyle: 'bold',
      }))
      .setOrigin(0.5)
      .setScrollFactor(0);

    this.onWeaponChanged({ slot: this.player.activeSlot });
  }

  private updateHud(): void {
    if (!this.player.alive) return;

    // Vida (barra vertical: se vacía de arriba hacia abajo)
    const hpPct = this.player.hp / this.player.maxHp;
    this.hpFill?.setScale(1, Math.max(0, hpPct));
    this.hpText?.setText(`${this.player.hp}/${this.player.maxHp}`);

    // Super (barra vertical)
    const power = this.player.powerCharge;
    const required = 500; // chargeRequired del poder (placeholder: p1 = 500)
    const superPct = Math.min(1, power / required);
    this.superFill?.setScale(1, Math.max(0, superPct));
    this.superText?.setText(power >= required ? 'LISTO (Q)' : `${Math.floor(superPct * 100)}%`);

    // Kill counter
    this.killText?.setText(`💀 ${this.player.kills}`);

    // Munición del arma activa
    const weapon = this.player.activeWeapon;
    if (weapon) {
      const ammo = weapon.ammoLeft;
      const mag = weapon.magSize;
      const reloading = weapon.isReloading ? ' RECARGANDO...' : '';
      this.ammoText?.setText(`${ammo}/${mag}${reloading}`);
    } else {
      this.ammoText?.setText('∞'); // cuchillo
    }
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

private onPlayerDied(payload: DiedPayload): void {
    const target = 'target' in payload ? payload.target : payload;
    const killer = 'target' in payload ? (payload.killer ?? null) : null;

    // Kill counter: si el jugador mató a alguien (armas → killer del payload; cuchillo → local)
    if (killer === this.player) {
      this.player.registerKill();
    }

    // Overlay de muerte del jugador
    if (target !== this.player) return;

    const { width, height } = this.scale;
    this.deathOverlay = this.add
      .text(width / 2, height / 2, '💀 HAS MUERTO\nESC para salir', monoStyle({
        fontSize: '32px',
        color: '#ef4444',
        align: 'center',
        fontStyle: 'bold',
      }))
      .setOrigin(0.5)
      .setDepth(20)
      .setScrollFactor(0);
  }

  // ============================================================
  // Jugadores remotos (multiplayer)
  // ============================================================

  /** Sincroniza los RemotePlayers con el estado autoritativo del servidor. */
  private onServerState(payload: { state?: ServerGameState; left?: boolean }): void {
    if (payload.left) {
      this.remotePlayers.forEach((rp) => rp.destroy());
      this.remotePlayers.clear();
      return;
    }

    const state = payload.state;
    if (!state?.players) return;

    const seen = new Set<string>();
    state.players.forEach((ps, id) => {
      if (id === network.sessionId) return; // el propio jugador
      seen.add(id);
      let rp = this.remotePlayers.get(id);
      if (!rp) {
        rp = new RemotePlayer(this, ps);
        this.remotePlayers.set(id, rp);
      }
      rp.sync(ps);
    });

    // Eliminar los que se fueron de la sala
    this.remotePlayers.forEach((rp, id) => {
      if (!seen.has(id)) {
        rp.destroy();
        this.remotePlayers.delete(id);
      }
    });
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

/** Payload de PLAYER_DIED: formato viejo (target directo) o nuevo (con killer). */
type DiedPayload = Damageable | { target: Damageable; killer?: Damageable | null };