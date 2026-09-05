import Phaser from 'phaser';
import { TuringBackground } from '../ui/TuringBackground';
import { THEME, monoStyle, sansStyle } from '../ui/theme';
import type { GameMode } from '../types';

/**
 * ModeSelectScene — Elección de modo de juego (COOP / FFA).
 *
 * COOP: jugadores contra la IA, rondas, lobby 2:00 + pantalla tipo Valorant.
 * FFA:  todos contra todos, último en pie.
 *
 * Estética: presentacion.html (oscuro #0f0f0f + cian #22d3ee + Turing).
 *
 * Territorio: PUCK (escenas / UI).
 */
export class ModeSelectScene extends Phaser.Scene {
  private bg?: TuringBackground;
  private selected: GameMode | null = null;

  constructor() {
    super('ModeSelectScene');
  }

  create(): void {
    const { width, height } = this.scale;

    this.bg = new TuringBackground(this, { accent: THEME.accent, maxAlpha: 160 });

    // ============================================================
    // Header
    // ============================================================
    this.add
      .text(width / 2, 60, '// MODO DE JUEGO', monoStyle({
        fontSize: '14px',
        color: THEME.accent,
        letterSpacing: 4,
      }))
      .setOrigin(0.5);

    this.add
      .text(width / 2, 100, 'Elige cómo quieres jugar', sansStyle({
        fontSize: '20px',
        color: THEME.secondary,
      }))
      .setOrigin(0.5);

    // ============================================================
    // Tarjeta COOP
    // ============================================================
    const cardW = 420;
    const cardH = 340;
    const coopX = width / 2 - cardW / 2 - 40;
    const ffaX = width / 2 + 40;
    const cardY = height / 2 + 20;

    const coopCard = this.createModeCard(
      coopX, cardY, cardW, cardH,
      'COOP',
      'Jugadores contra la IA',
      ['👥 Hasta 6 jugadores', '🛡️ Rondas de oleadas', '🎯 Pantalla tipo Valorant', '⏱️ Lobby 2:00'],
      THEME.accent,
      'coop',
    );

    // ============================================================
    // Tarjeta FFA
    // ============================================================
    const ffaCard = this.createModeCard(
      ffaX, cardY, cardW, cardH,
      'FFA',
      'Todos contra todos',
      ['⚔️ Hasta 6 jugadores', '💀 Último en pie', '🗡️ Cuchillo instakill', '⏱️ Partida rápida'],
      '#f97316',
      'ffa',
    );

    // ============================================================
    // Botones inferiores
    // ============================================================
    const backBtn = this.createActionButton(width / 2 - 120, height - 60, '◀ VOLVER', false);
    backBtn.on('pointerdown', () => this.scene.start('CreateJonyScene'));

    const playBtn = this.createActionButton(width / 2 + 120, height - 60, 'JUGAR ▶', true);
    playBtn.on('pointerdown', () => {
      if (!this.selected) {
        // Feedback: parpadeo si no eligió modo
        this.tweens.add({
          targets: [coopCard, ffaCard],
          alpha: 0.4,
          duration: 100,
          yoyo: true,
          repeat: 2,
        });
        return;
      }
      this.onPlay();
    });

    // Versión
    this.add
      .text(width - 10, height - 10, 'v0.1.0 — Fase 1', monoStyle({
        fontSize: '12px',
        color: THEME.secondary,
      }))
      .setOrigin(1, 1);
  }

  // ============================================================
  // Helpers
  // ============================================================

  private createModeCard(
    x: number,
    y: number,
    w: number,
    h: number,
    title: string,
    subtitle: string,
    features: string[],
    accent: string,
    mode: GameMode,
  ): Phaser.GameObjects.Container {
    const accentColor = Phaser.Display.Color.HexStringToColor(accent).color;
    const borderColor = Phaser.Display.Color.HexStringToColor(THEME.border).color;

    // Fondo de la tarjeta
    const bg = this.add
      .rectangle(0, 0, w, h, 0x000000, 0)
      .setStrokeStyle(1, borderColor);

    // Título del modo
    const titleText = this.add
      .text(0, -h / 2 + 50, title, monoStyle({
        fontSize: '44px',
        color: accent,
        fontStyle: 'bold',
        letterSpacing: 6,
      }))
      .setOrigin(0.5);

    // Subtítulo
    const subText = this.add
      .text(0, -h / 2 + 95, subtitle, sansStyle({
        fontSize: '16px',
        color: THEME.secondary,
      }))
      .setOrigin(0.5);

    // Divisor
    this.add
      .rectangle(0, -h / 2 + 120, 60, 2, accentColor)
      .setOrigin(0.5);

    // Características
    const featTexts = features.map((f, i) =>
      this.add
        .text(0, -h / 2 + 155 + i * 32, f, monoStyle({
          fontSize: '14px',
          color: THEME.text,
        }))
        .setOrigin(0.5)
    );

    // Badge "SELECCIONADO" (oculto al inicio)
    const badge = this.add
      .text(0, h / 2 - 35, '✓ SELECCIONADO', monoStyle({
        fontSize: '13px',
        color: THEME.bg,
        backgroundColor: accent,
        padding: { x: 14, y: 6 },
      }))
      .setOrigin(0.5)
      .setVisible(false);

    const container = this.add.container(x, y, [bg, titleText, subText, ...featTexts, badge]);
    container.setSize(w, h);
    container.setInteractive({ useHandCursor: true });

    // Hover
    container.on('pointerover', () => {
      if (this.selected !== mode) {
        bg.setStrokeStyle(2, accentColor);
        titleText.setColor(accent);
      }
    });
    container.on('pointerout', () => {
      if (this.selected !== mode) {
        bg.setStrokeStyle(1, borderColor);
      }
    });

    // Selección
    container.on('pointerdown', () => {
      this.selected = mode;
      this.refreshCards();
    });

    // Guardar referencia para refresh
    container.setData('mode', mode);
    container.setData('accent', accent);
    container.setData('bg', bg);
    container.setData('title', titleText);
    container.setData('badge', badge);

    return container;
  }

  private refreshCards(): void {
    this.children.list.forEach((child) => {
      if (child instanceof Phaser.GameObjects.Container && child.getData('mode')) {
        const mode = child.getData('mode') as GameMode;
        const accent = child.getData('accent') as string;
        const bg = child.getData('bg') as Phaser.GameObjects.Rectangle;
        const title = child.getData('title') as Phaser.GameObjects.Text;
        const badge = child.getData('badge') as Phaser.GameObjects.Text;
        const selected = this.selected === mode;

        bg.setStrokeStyle(selected ? 2 : 1, Phaser.Display.Color.HexStringToColor(selected ? accent : THEME.border).color);
        badge.setVisible(selected);
        title.setColor(accent);
      }
    });
  }

  private createActionButton(x: number, y: number, label: string, primary: boolean): Phaser.GameObjects.Text {
    const btn = this.add
      .text(x, y, label, monoStyle({
        fontSize: '18px',
        color: primary ? THEME.bg : THEME.text,
        backgroundColor: primary ? THEME.accent : THEME.bg,
        padding: { x: 28, y: 14 },
      }))
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const bounds = btn.getBounds();
    const border = this.add
      .rectangle(bounds.centerX, bounds.centerY, bounds.width + 2, bounds.height + 2, 0x000000, 0)
      .setStrokeStyle(1, Phaser.Display.Color.HexStringToColor(primary ? THEME.accent : THEME.border).color)
      .setOrigin(0.5);

    btn.on('pointerover', () => {
      if (!primary) {
        btn.setColor(THEME.accent);
        border.setStrokeStyle(1, Phaser.Display.Color.HexStringToColor(THEME.accent).color);
      }
    });
    btn.on('pointerout', () => {
      if (!primary) {
        btn.setColor(THEME.text);
        border.setStrokeStyle(1, Phaser.Display.Color.HexStringToColor(THEME.border).color);
      }
    });

    return btn;
  }

  // ============================================================
  // Acciones
  // ============================================================

  private onPlay(): void {
    // Guardar modo elegido
    localStorage.setItem('losjonys-mode', this.selected ?? 'ffa');

    // Ir al lobby (2:00 de espera) — desde ahí: COOP → AgentSelectScene / FFA → GameScene
    this.scene.start('LobbyScene', { mode: this.selected });
  }

  shutdown(): void {
    this.bg?.destroy();
    this.bg = undefined;
  }
}