import Phaser from 'phaser';
import { TuringBackground } from '../ui/TuringBackground';
import { THEME, monoStyle, sansStyle, monoFaStyle } from '../ui/theme';
import { ICONS, iconStyle, fa } from '../ui/icons';
import { GAME_CONSTANTS } from '../types';
import { loadJony } from '../data/catalog';
import type { GameMode } from '../types';

/**
 * AgentSelectScene — Pantalla tipo Valorant antes de la partida.
 *
 * Grid de 6 slots de jugador (nombre + color del Jony local + vacíos).
 * El Jony local se destaca con su color.
 * Botón CONFIRMAR → GameScene.
 *
 * Estética: presentacion.html (oscuro #0f0f0f + cian #22d3ee + Turing).
 *
 * Territorio: PUCK (escenas / UI).
 */
export class AgentSelectScene extends Phaser.Scene {
  private bg?: TuringBackground;
  private mode: GameMode = 'ffa';

  constructor() {
    super('AgentSelectScene');
  }

  init(data: { mode?: GameMode }): void {
    this.mode = data.mode ?? 'ffa';
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
      .text(width / 2, 46, '// AGENT SELECT', monoStyle({
        fontSize: '14px',
        color: THEME.accent,
        letterSpacing: 4,
      }))
      .setOrigin(0.5);

    this.add
      .text(width / 2, 84, 'Estos son los Jonys que entran a la arena', sansStyle({
        fontSize: '20px',
        color: THEME.secondary,
      }))
      .setOrigin(0.5);

    // ============================================================
    // Grid 3×2 de slots (estilo Valorant)
    // ============================================================
    const cardW = 340;
    const cardH = 210;
    const gapX = 40;
    const gapY = 30;
    const gridW = 3 * cardW + 2 * gapX;
    const startX = (width - gridW) / 2 + cardW / 2;
    const startY = 220;

    const localName = jony?.name?.trim() || 'Jony';
    const localColor = jony?.color ?? THEME.accent;

    for (let i = 0; i < GAME_CONSTANTS.MAX_PLAYERS; i++) {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = startX + col * (cardW + gapX);
      const y = startY + row * (cardH + gapY);

      if (i === 0) {
        this.createAgentCard(x, y, cardW, cardH, localName, localColor, true);
      } else {
        this.createAgentCard(x, y, cardW, cardH, null, null, false);
      }
    }

    // ============================================================
    // Botón CONFIRMAR → GameScene
    // ============================================================
    const confirmBtn = this.add
      .text(width / 2, height - 60, `CONFIRMAR  ${fa('arrowRight')}`, monoFaStyle({
        fontSize: '20px',
        color: THEME.bg,
        backgroundColor: THEME.accent,
        padding: { x: 40, y: 14 },
      }))
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const confirmBounds = confirmBtn.getBounds();
    this.add
      .rectangle(confirmBounds.centerX, confirmBounds.centerY, confirmBounds.width + 2, confirmBounds.height + 2, 0x000000, 0)
      .setStrokeStyle(1, Phaser.Display.Color.HexStringToColor(THEME.accent).color)
      .setOrigin(0.5);

    confirmBtn.on('pointerdown', () => this.scene.start('GameScene', { mode: this.mode }));

    // ============================================================
    // Volver al lobby
    // ============================================================
    const backBtn = this.add
      .text(90, height - 60, `${fa('arrowLeft')}  LOBBY`, monoFaStyle({
        fontSize: '16px',
        color: THEME.secondary,
      }))
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    backBtn.on('pointerover', () => backBtn.setColor(THEME.accent));
    backBtn.on('pointerout', () => backBtn.setColor(THEME.secondary));
    backBtn.on('pointerdown', () => this.scene.start('LobbyScene', { mode: this.mode }));

    // Versión
    this.add
      .text(width - 10, height - 10, 'v0.1.0 — Fase 1', monoStyle({
        fontSize: '12px',
        color: THEME.secondary,
      }))
      .setOrigin(1, 1);
  }

  // ============================================================
  // Helpers de UI
  // ============================================================

  /** Tarjeta de agente (ocupada con el Jony local o vacía) */
  private createAgentCard(
    x: number,
    y: number,
    w: number,
    h: number,
    name: string | null,
    color: string | null,
    isLocal: boolean,
  ): void {
    const accentColor = color ? Phaser.Display.Color.HexStringToColor(color).color : 0x000000;
    const borderHex = isLocal && color ? color : THEME.border;

    // Fondo de la tarjeta (tinte sutil del color si es el local)
    const bg = this.add
      .rectangle(x, y, w, h, isLocal && color ? accentColor : 0x000000, isLocal && color ? 0.08 : 0)
      .setStrokeStyle(isLocal ? 2 : 1, Phaser.Display.Color.HexStringToColor(borderHex).color);

    if (name && color) {
      // Avatar (círculo grande con el color del Jony)
      this.add
        .circle(x, y - 30, 42, accentColor)
        .setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(THEME.text).color);

      // Nombre
      this.add
        .text(x, y + 42, name, monoStyle({
          fontSize: '20px',
          color: THEME.text,
          letterSpacing: 1,
        }))
        .setOrigin(0.5);

      // Badge TÚ (destaca al Jony local)
      if (isLocal) {
        this.add
          .text(x, y + 72, 'TÚ', monoStyle({
            fontSize: '11px',
            color: THEME.bg,
            backgroundColor: color,
            padding: { x: 10, y: 4 },
          }))
          .setOrigin(0.5);
      }
    } else {
      // Slot vacío
      this.add
        .text(x, y - 10, ICONS.question, iconStyle({
          fontSize: '40px',
          color: '#444444',
        }))
        .setOrigin(0.5);

      this.add
        .text(x, y + 42, 'ESPERANDO...', monoStyle({
          fontSize: '14px',
          color: '#555555',
        }))
        .setOrigin(0.5);
    }
  }

  shutdown(): void {
    this.bg?.destroy();
    this.bg = undefined;
  }
}