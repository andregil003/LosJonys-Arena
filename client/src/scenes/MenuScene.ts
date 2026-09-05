import Phaser from 'phaser';
import { TuringBackground } from '../ui/TuringBackground';
import { THEME, monoStyle, sansStyle } from '../ui/theme';
import { ICONS, iconStyle } from '../ui/icons';

/**
 * MenuScene — Menú principal de LosJonys Arena.
 *
 * Estética: la de `presentacion.html` de André —
 * fondo oscuro #0f0f0f + acento cian #22d3ee + fondo animado de Turing patterns.
 *
 * Territorio: PUCK (escenas / UI).
 */
export class MenuScene extends Phaser.Scene {
  private bg?: TuringBackground;

  constructor() {
    super('MenuScene');
  }

  create(): void {
    const { width, height } = this.scale;

    // Fondo animado de Turing (reacción-difusión), aleatorio en cada carga
    // El canvas HTML se posiciona con z-index:0 en CSS (detrás del juego).
    this.bg = new TuringBackground(this, { accent: THEME.accent, maxAlpha: 190 });

    // Eyebrow en mono (estilo presentacion.html)
    this.add
      .text(width / 2, height / 2 - 150, '// LOSJONYS ARENA', monoStyle({
        fontSize: '14px',
        color: THEME.accent,
        letterSpacing: 4,
      }))
      .setOrigin(0.5);

    // Título principal (logo en Rajdhani)
    this.add
      .text(width / 2, height / 2 - 100, 'LOSJONYS\nARENA', monoStyle({
        fontSize: '72px',
        color: THEME.text,
        fontStyle: 'bold',
        align: 'center',
        lineSpacing: 4,
      }))
      .setOrigin(0.5);

    // Subtítulo
    this.add
      .text(width / 2, height / 2 - 10, 'Crea tu Jony. Elige tus armas. Sobrevive.', sansStyle({
        fontSize: '18px',
        color: THEME.secondary,
      }))
      .setOrigin(0.5);

    // Divisor (línea cian, estilo presentacion.html)
    this.add
      .rectangle(width / 2 - 24, height / 2 + 30, 48, 2, Phaser.Display.Color.HexStringToColor(THEME.accent).color)
      .setOrigin(0.5);

    // Botón JUGAR (borde fino + hover cian)
    const playIcon = this.add
      .text(width / 2 - 78, height / 2 + 70, ICONS.play, iconStyle({
        fontSize: '18px',
        color: THEME.text,
      }))
      .setOrigin(0.5);

    const playBtn = this.add
      .text(width / 2, height / 2 + 70, 'JUGAR', monoStyle({
        fontSize: '22px',
        color: THEME.text,
        backgroundColor: THEME.bg,
        padding: { x: 28, y: 14 },
      }))
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    // Borde fino alrededor del botón
    const btnBounds = playBtn.getBounds();
    const btnBorder = this.add
      .rectangle(btnBounds.centerX, btnBounds.centerY, btnBounds.width + 2, btnBounds.height + 2, 0x000000, 0)
      .setStrokeStyle(1, Phaser.Display.Color.HexStringToColor(THEME.border).color)
      .setOrigin(0.5);

    playBtn.on('pointerover', () => {
      playBtn.setColor(THEME.accent);
      btnBorder.setStrokeStyle(1, Phaser.Display.Color.HexStringToColor(THEME.accent).color);
    });
    playBtn.on('pointerout', () => {
      playBtn.setColor(THEME.text);
      btnBorder.setStrokeStyle(1, Phaser.Display.Color.HexStringToColor(THEME.border).color);
    });
    playBtn.on('pointerdown', () => this.scene.start('CreateJonyScene'));

    // Versión (mono, discreto)
    this.add
      .text(width - 10, height - 10, 'v0.1.0 — Fase 0', monoStyle({
        fontSize: '12px',
        color: THEME.secondary,
      }))
      .setOrigin(1, 1);
  }

  shutdown(): void {
    this.bg?.destroy();
    this.bg = undefined;
  }
}
