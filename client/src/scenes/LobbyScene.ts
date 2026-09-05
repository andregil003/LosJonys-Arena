import Phaser from 'phaser';
import { TuringBackground } from '../ui/TuringBackground';
import { THEME, monoStyle, sansStyle } from '../ui/theme';
import { GAME_CONSTANTS } from '../types';
import { loadJony } from '../data/catalog';
import type { GameMode } from '../types';

/**
 * LobbyScene — Sala de espera antes de la partida.
 *
 * - Countdown 2:00 (GAME_CONSTANTS.LOBBY_SECONDS).
 * - Lista de jugadores (placeholder): el Jony local (localStorage losjonys-jony)
 *   + slots vacíos hasta 6.
 * - Botón LISTO (toggle verde/cian).
 * - Al llegar a 0:00 → COOP: AgentSelectScene / FFA: GameScene.
 *
 * Recibe el modo por scene data:
 *   this.scene.start('LobbyScene', { mode: 'coop' | 'ffa' })
 *
 * Estética: presentacion.html (oscuro #0f0f0f + cian #22d3ee + Turing).
 *
 * Territorio: PUCK (escenas / UI).
 */
export class LobbyScene extends Phaser.Scene {
  private bg?: TuringBackground;

  private mode: GameMode = 'ffa';
  private timeLeft = GAME_CONSTANTS.LOBBY_SECONDS;
  private ready = false;

  private timerText?: Phaser.GameObjects.Text;
  private readyBtn?: Phaser.GameObjects.Text;
  private readyBorder?: Phaser.GameObjects.Rectangle;
  private countdownEvent?: Phaser.Time.TimerEvent;

  constructor() {
    super('LobbyScene');
  }

  init(data: { mode?: GameMode }): void {
    // Reiniciar estado en cada entrada a la escena
    this.mode = data.mode ?? 'ffa';
    this.timeLeft = GAME_CONSTANTS.LOBBY_SECONDS;
    this.ready = false;
  }

  create(): void {
    const { width, height } = this.scale;
    const jony = loadJony();

    // Fondo animado de Turing
    this.bg = new TuringBackground(this, { accent: THEME.accent, maxAlpha: 160 });

    // ============================================================
    // Header
    // ============================================================
    this.add
      .text(width / 2, 46, '// LOBBY', monoStyle({
        fontSize: '14px',
        color: THEME.accent,
        letterSpacing: 4,
      }))
      .setOrigin(0.5);

    // Badge de modo
    const modeColor = this.mode === 'coop' ? THEME.accent : '#f97316';
    this.add
      .text(width / 2, 84, this.mode === 'coop' ? 'COOP — CONTRA LA IA' : 'FFA — TODOS CONTRA TODOS', monoStyle({
        fontSize: '13px',
        color: modeColor,
        letterSpacing: 2,
      }))
      .setOrigin(0.5);

    // ============================================================
    // Countdown
    // ============================================================
    this.timerText = this.add
      .text(width / 2, 150, this.formatTime(this.timeLeft), monoStyle({
        fontSize: '64px',
        color: THEME.text,
        fontStyle: 'bold',
        letterSpacing: 4,
      }))
      .setOrigin(0.5);

    this.add
      .text(width / 2, 195, 'LA PARTIDA EMPIEZA EN', monoStyle({
        fontSize: '11px',
        color: THEME.secondary,
        letterSpacing: 3,
      }))
      .setOrigin(0.5);

    // ============================================================
    // Lista de jugadores (placeholder)
    // ============================================================
    const panelW = 520;
    const panelH = GAME_CONSTANTS.MAX_PLAYERS * 52 + 36;
    const panelX = width / 2;
    const panelY = 400;

    this.add
      .rectangle(panelX, panelY, panelW, panelH, 0x000000, 0)
      .setStrokeStyle(1, Phaser.Display.Color.HexStringToColor(THEME.border).color);

    this.add
      .text(panelX, panelY - panelH / 2 + 22, `JUGADORES  (1/${GAME_CONSTANTS.MAX_PLAYERS})`, monoStyle({
        fontSize: '12px',
        color: THEME.secondary,
        letterSpacing: 3,
      }))
      .setOrigin(0.5);

    // Slot 0: Jony local (localStorage losjonys-jony)
    const localName = jony?.name?.trim() || 'Jony';
    const localColor = jony?.color ?? THEME.accent;
    this.createPlayerSlot(panelX, panelY - panelH / 2 + 44, localName, localColor, true);

    // Slots 1..5: vacíos
    for (let i = 1; i < GAME_CONSTANTS.MAX_PLAYERS; i++) {
      this.createPlayerSlot(panelX, panelY - panelH / 2 + 44 + i * 52, null, null, false);
    }

    // ============================================================
    // Botón LISTO (toggle verde/cian)
    // ============================================================
    this.readyBtn = this.add
      .text(width / 2, height - 60, 'LISTO', monoStyle({
        fontSize: '20px',
        color: THEME.bg,
        backgroundColor: THEME.accent,
        padding: { x: 48, y: 14 },
      }))
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const readyBounds = this.readyBtn.getBounds();
    this.readyBorder = this.add
      .rectangle(readyBounds.centerX, readyBounds.centerY, readyBounds.width + 2, readyBounds.height + 2, 0x000000, 0)
      .setStrokeStyle(1, Phaser.Display.Color.HexStringToColor(THEME.accent).color)
      .setOrigin(0.5);

    this.readyBtn.on('pointerdown', () => this.toggleReady());

    // ============================================================
    // Volver a selección de modo
    // ============================================================
    const backBtn = this.add
      .text(90, height - 60, '◀ SALIR', monoStyle({
        fontSize: '16px',
        color: THEME.secondary,
      }))
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    backBtn.on('pointerover', () => backBtn.setColor(THEME.accent));
    backBtn.on('pointerout', () => backBtn.setColor(THEME.secondary));
    backBtn.on('pointerdown', () => this.scene.start('ModeSelectScene'));

    // Versión
    this.add
      .text(width - 10, height - 10, 'v0.1.0 — Fase 1', monoStyle({
        fontSize: '12px',
        color: THEME.secondary,
      }))
      .setOrigin(1, 1);

    // ============================================================
    // Countdown (1 tick por segundo)
    // ============================================================
    this.countdownEvent = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => this.tick(),
    });
  }

  // ============================================================
  // Helpers de UI
  // ============================================================

  /** Fila de jugador dentro del panel (ocupada o vacía) */
  private createPlayerSlot(x: number, y: number, name: string | null, color: string | null, isLocal: boolean): void {
    const rowW = 460;
    const rowH = 44;

    const borderHex = isLocal && color ? color : THEME.border;
    this.add
      .rectangle(x, y, rowW, rowH, 0x000000, 0)
      .setStrokeStyle(1, Phaser.Display.Color.HexStringToColor(borderHex).color);

    if (name && color) {
      // Círculo de color del Jony
      this.add
        .circle(x - rowW / 2 + 30, y, 12, Phaser.Display.Color.HexStringToColor(color).color)
        .setStrokeStyle(1, Phaser.Display.Color.HexStringToColor(THEME.text).color);

      // Nombre
      this.add
        .text(x - rowW / 2 + 56, y, name, monoStyle({
          fontSize: '16px',
          color: THEME.text,
        }))
        .setOrigin(0, 0.5);

      // Badge TÚ
      if (isLocal) {
        this.add
          .text(x + rowW / 2 - 24, y, 'TÚ', monoStyle({
            fontSize: '11px',
            color: THEME.bg,
            backgroundColor: color,
            padding: { x: 8, y: 3 },
          }))
          .setOrigin(0.5);
      }
    } else {
      // Slot vacío
      this.add
        .text(x, y, 'ESPERANDO...', monoStyle({
          fontSize: '14px',
          color: '#555555',
        }))
        .setOrigin(0.5);
    }
  }

  // ============================================================
  // Lógica del countdown
  // ============================================================

  private tick(): void {
    this.timeLeft -= 1;
    this.timerText?.setText(this.formatTime(this.timeLeft));

    // Aviso visual cuando quedan 10s
    if (this.timeLeft <= 10) {
      this.timerText?.setColor('#f97316');
    }

    if (this.timeLeft <= 0) {
      this.countdownEvent?.remove();
      this.countdownEvent = undefined;
      this.onCountdownEnd();
    }
  }

  private onCountdownEnd(): void {
    if (this.mode === 'coop') {
      this.scene.start('AgentSelectScene', { mode: this.mode });
    } else {
      this.scene.start('GameScene', { mode: this.mode });
    }
  }

  private formatTime(totalSeconds: number): string {
    const safe = Math.max(0, totalSeconds);
    const m = Math.floor(safe / 60);
    const s = safe % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  // ============================================================
  // Acciones
  // ============================================================

  private toggleReady(): void {
    this.ready = !this.ready;
    const color = this.ready ? '#22c55e' : THEME.accent;
    this.readyBtn?.setBackgroundColor(color);
    this.readyBtn?.setText(this.ready ? '✓ LISTO' : 'LISTO');
    this.readyBorder?.setStrokeStyle(1, Phaser.Display.Color.HexStringToColor(color).color);
  }

  shutdown(): void {
    this.bg?.destroy();
    this.bg = undefined;
    this.countdownEvent?.remove();
    this.countdownEvent = undefined;
  }
}