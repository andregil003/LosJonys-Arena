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
 *
 * Fixes de diseño (revisión de André vía Gemini):
 *  - Título con espacio: "LOS JONYS / ARENA" (antes "LOSJONYS" pegado).
 *  - Eyebrow separado claramente del título (antes se superponía y se asomaba
 *    como texto fantasma detrás de las letras → duplicado visual).
 *  - Divisor más largo y con aire, para que no parezca una línea huérfana "---".
 *  - Botón JUGAR como contenedor: icono y texto dentro del mismo rectángulo,
 *    centrados en el mismo eje (antes el icono flotaba fuera y desalineado).
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

    // Eyebrow en mono (bien separado del título para evitar duplicado visual)
    this.add
      .text(width / 2, height / 2 - 195, '// LOSJONYS ARENA', monoStyle({
        fontSize: '14px',
        color: THEME.accent,
        letterSpacing: 4,
      }))
      .setOrigin(0.5);

    // Título principal (logo en Rajdhani) — con espacio en "LOS JONYS"
    this.add
      .text(width / 2, height / 2 - 100, 'LOS JONYS\nARENA', monoStyle({
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

    // Divisor (línea cian, ancho generoso para que parezca un acento intencional)
    this.add
      .rectangle(width / 2, height / 2 + 30, 140, 2, Phaser.Display.Color.HexStringToColor(THEME.accent).color)
      .setOrigin(0.5);

    // Botón JUGAR: icono + texto dentro del mismo contenedor, centrados
    this.createPlayButton(width / 2, height / 2 + 72);

    // Versión (mono, discreto)
    this.add
      .text(width - 10, height - 10, 'v0.1.0 — Fase 0', monoStyle({
        fontSize: '12px',
        color: THEME.secondary,
      }))
      .setOrigin(1, 1);
  }

  /** Botón JUGAR balanceado: caja con borde + icono + texto alineados al centro. */
  private createPlayButton(cx: number, cy: number): void {
    const PAD_X = 30;
    const PAD_Y = 14;
    const GAP = 14;

    const playTxt = this.add
      .text(0, 0, 'JUGAR', monoStyle({ fontSize: '22px', color: THEME.text }))
      .setOrigin(0.5);
    const playIcon = this.add
      .text(0, 0, ICONS.play, iconStyle({ fontSize: '16px', color: THEME.text }))
      .setOrigin(0.5);

    const contentW = playIcon.width + GAP + playTxt.width;
    const boxW = contentW + PAD_X * 2;
    const boxH = Math.max(playIcon.height, playTxt.height) + PAD_Y * 2;

    // Icono a la izquierda, texto a la derecha, ambos centrados en Y
    playIcon.setX(-(contentW / 2) + playIcon.width / 2);
    playTxt.setX(contentW / 2 - playTxt.width / 2);

    // Caja con fondo y borde fino
    const box = this.add
      .rectangle(0, 0, boxW, boxH, Phaser.Display.Color.HexStringToColor(THEME.bg).color)
      .setStrokeStyle(1, Phaser.Display.Color.HexStringToColor(THEME.border).color)
      .setOrigin(0.5);

    const btn = this.add.container(cx, cy, [box, playIcon, playTxt]);
    btn.setSize(boxW, boxH);
    btn.setInteractive({ useHandCursor: true });

    const setHover = (active: boolean): void => {
      const color = active ? THEME.accent : THEME.text;
      box.setStrokeStyle(1, Phaser.Display.Color.HexStringToColor(active ? THEME.accent : THEME.border).color);
      playTxt.setColor(color);
      playIcon.setColor(color);
    };

    btn.on('pointerover', () => setHover(true));
    btn.on('pointerout', () => setHover(false));
    btn.on('pointerdown', () => this.scene.start('CreateJonyScene'));
  }

  shutdown(): void {
    this.bg?.destroy();
    this.bg = undefined;
  }
}