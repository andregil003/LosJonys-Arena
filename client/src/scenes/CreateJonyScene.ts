import Phaser from 'phaser';
import { TuringBackground } from '../ui/TuringBackground';
import { THEME, monoStyle, sansStyle, monoFaStyle } from '../ui/theme';
import { fa } from '../ui/icons';
import {
  COLORS,
  ACCESSORIES,
  WEAPONS,
  POWERS,
  loadJony,
  saveJony,
  type StoredJony,
} from '../data/catalog';
import type { WeaponId, PowerId } from '../types';

/**
 * CreateJonyScene — "Crea tu Jony".
 *
 * Personalización del personaje: nombre, color, accesorio,
 * 2 armas (teclas 1 y 2) + 1 poder (barra de Super).
 * Persiste en localStorage y continúa al modo de juego.
 *
 * Estética: presentacion.html (oscuro #0f0f0f + cian #22d3ee + Turing).
 *
 * Territorio: PUCK (escenas / UI).
 */
export class CreateJonyScene extends Phaser.Scene {
  private bg?: TuringBackground;

  // Estado editable del Jony
  private jony: StoredJony = {
    name: '',
    color: COLORS[0].hex,
    accessory: ACCESSORIES[0].id,
    weapon1: 'w1',
    weapon2: 'w2',
    power: 'p1',
  };

  // Referencias para actualizar la UI
  private nameInput?: Phaser.GameObjects.DOMElement;
  private previewCircle?: Phaser.GameObjects.Arc;
  private previewAccessory?: Phaser.GameObjects.Text;
  private previewName?: Phaser.GameObjects.Text;
  private weapon1Label?: Phaser.GameObjects.Text;
  private weapon2Label?: Phaser.GameObjects.Text;
  private powerLabel?: Phaser.GameObjects.Text;
  private colorSwatches: Phaser.GameObjects.Arc[] = [];
  private accessoryBtns: Phaser.GameObjects.Container[] = [];
  private weapon1Cards: Phaser.GameObjects.Container[] = [];
  private weapon2Cards: Phaser.GameObjects.Container[] = [];
  private powerCards: Phaser.GameObjects.Container[] = [];

  constructor() {
    super('CreateJonyScene');
  }

  create(): void {
    const { width, height } = this.scale;

    // Cargar Jony guardado si existe
    const saved = loadJony();
    if (saved) this.jony = { ...this.jony, ...saved };

    // Fondo animado
    this.bg = new TuringBackground(this, { accent: THEME.accent, maxAlpha: 160 });

    // ============================================================
    // Header
    // ============================================================
    this.add
      .text(width / 2, 46, '// CREA TU JONY', monoStyle({
        fontSize: '14px',
        color: THEME.accent,
        letterSpacing: 4,
      }))
      .setOrigin(0.5);

    this.add
      .text(width / 2, 84, 'Personaliza tu personaje', sansStyle({
        fontSize: '20px',
        color: THEME.secondary,
      }))
      .setOrigin(0.5);

    // ============================================================
    // Panel izquierdo — Preview del Jony
    // ============================================================
    const previewX = 250;
    const previewY = 360;

    // Marco del preview
    this.add
      .rectangle(previewX, previewY, 360, 420, 0x000000, 0)
      .setStrokeStyle(1, Phaser.Display.Color.HexStringToColor(THEME.border).color);

    this.add
      .text(previewX, previewY - 180, 'PREVIEW', monoStyle({
        fontSize: '12px',
        color: THEME.secondary,
        letterSpacing: 3,
      }))
      .setOrigin(0.5);

    // Círculo del Jony (cabeza)
    this.previewCircle = this.add
      .circle(previewX, previewY - 30, 70, Phaser.Display.Color.HexStringToColor(this.jony.color).color)
      .setStrokeStyle(3, Phaser.Display.Color.HexStringToColor(THEME.text).color);

    // Accesorio (glyph placeholder)
    const acc = ACCESSORIES.find((a) => a.id === this.jony.accessory) ?? ACCESSORIES[0];
    this.previewAccessory = this.add
      .text(previewX, previewY - 95, acc.glyph, { fontSize: '48px' })
      .setOrigin(0.5);

    // Nombre bajo el círculo
    this.previewName = this.add
      .text(previewX, previewY + 70, this.jony.name || 'JONY', monoStyle({
        fontSize: '22px',
        color: THEME.text,
        letterSpacing: 2,
      }))
      .setOrigin(0.5);

    // Armas y poder elegidos (mini resumen)
    const w1 = WEAPONS.find((w) => w.id === this.jony.weapon1) ?? WEAPONS[0];
    const w2 = WEAPONS.find((w) => w.id === this.jony.weapon2) ?? WEAPONS[1];
    const pw = POWERS.find((p) => p.id === this.jony.power) ?? POWERS[0];

    this.add
      .text(previewX, previewY + 110, `1: ${w1.name}   2: ${w2.name}`, monoStyle({
        fontSize: '13px',
        color: THEME.secondary,
      }))
      .setOrigin(0.5);

    this.add
      .text(previewX, previewY + 135, `P: ${pw.name}`, monoStyle({
        fontSize: '13px',
        color: THEME.accent,
      }))
      .setOrigin(0.5);

    // ============================================================
    // Panel derecho — Controles
    // ============================================================
    const ctrlX = 780;
    let ctrlY = 150;

    // --- NOMBRE ---
    this.add
      .text(ctrlX - 300, ctrlY, 'NOMBRE', monoStyle({
        fontSize: '12px',
        color: THEME.secondary,
        letterSpacing: 3,
      }))
      .setOrigin(0, 0.5);

    this.nameInput = this.add.dom(ctrlX - 60, ctrlY, 'input', [
      'width: 260px;',
      'height: 38px;',
      `background: ${THEME.bg};`,
      `color: ${THEME.text};`,
      `border: 1px solid ${THEME.border};`,
      `font-family: ${THEME.fontMono};`,
      'font-size: 16px;',
      'padding: 0 12px;',
      'outline: none;',
      'text-align: center;',
    ].join(''));
    const inputNode = this.nameInput.node as HTMLInputElement;
    inputNode.value = this.jony.name;
    inputNode.maxLength = 14;
    inputNode.placeholder = 'Nombre del Jony';
    inputNode.addEventListener('focus', () => {
      inputNode.style.borderColor = THEME.accent;
    });
    inputNode.addEventListener('blur', () => {
      inputNode.style.borderColor = THEME.border;
    });
    inputNode.addEventListener('input', () => {
      this.jony.name = inputNode.value;
      this.updatePreviewName();
    });
    ctrlY += 60;

    // --- COLOR ---
    this.add
      .text(ctrlX - 300, ctrlY, 'COLOR', monoStyle({
        fontSize: '12px',
        color: THEME.secondary,
        letterSpacing: 3,
      }))
      .setOrigin(0, 0.5);

    const swatchStartX = ctrlX - 300;
    COLORS.forEach((c, i) => {
      const x = swatchStartX + 20 + i * 42;
      const swatch = this.add
        .circle(x, ctrlY + 22, 16, Phaser.Display.Color.HexStringToColor(c.hex).color)
        .setInteractive({ useHandCursor: true })
        .setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(THEME.border).color);

      swatch.on('pointerdown', () => {
        this.jony.color = c.hex;
        this.refreshColorSwatches();
        this.updatePreviewCircle();
      });

      this.colorSwatches.push(swatch);
    });
    this.refreshColorSwatches();
    ctrlY += 70;

    // --- ACCESORIO ---
    this.add
      .text(ctrlX - 300, ctrlY, 'ACCESORIO', monoStyle({
        fontSize: '12px',
        color: THEME.secondary,
        letterSpacing: 3,
      }))
      .setOrigin(0, 0.5);

    ACCESSORIES.forEach((a, i) => {
      const x = ctrlX - 300 + 20 + i * 92;
      const btn = this.createSmallButton(x, ctrlY + 24, a.name, a.id === this.jony.accessory);
      btn.on('pointerdown', () => {
        this.jony.accessory = a.id;
        this.refreshAccessoryButtons();
        this.updatePreviewAccessory();
      });
      this.accessoryBtns.push(btn);
    });
    ctrlY += 70;

    // --- ARMA 1 ---
    this.add
      .text(ctrlX - 300, ctrlY, 'ARMA 1  [TECLA 1]', monoStyle({
        fontSize: '12px',
        color: THEME.accent,
        letterSpacing: 3,
      }))
      .setOrigin(0, 0.5);

    WEAPONS.forEach((w, i) => {
      const x = ctrlX - 300 + 20 + i * 128;
      const card = this.createWeaponCard(x, ctrlY + 52, w, w.id === this.jony.weapon1);
      card.on('pointerdown', () => {
        this.jony.weapon1 = w.id;
        // No permitir arma 2 igual a arma 1
        if (this.jony.weapon2 === w.id) {
          this.jony.weapon2 = WEAPONS.find((ww) => ww.id !== w.id)?.id ?? 'w2';
        }
        this.refreshWeaponCards();
        this.updatePreviewSummary();
      });
      this.weapon1Cards.push(card);
    });
    ctrlY += 120;

    // --- ARMA 2 ---
    this.add
      .text(ctrlX - 300, ctrlY, 'ARMA 2  [TECLA 2]', monoStyle({
        fontSize: '12px',
        color: THEME.accent,
        letterSpacing: 3,
      }))
      .setOrigin(0, 0.5);

    WEAPONS.forEach((w, i) => {
      const x = ctrlX - 300 + 20 + i * 128;
      const card = this.createWeaponCard(x, ctrlY + 52, w, w.id === this.jony.weapon2);
      card.on('pointerdown', () => {
        if (w.id === this.jony.weapon1) return; // no duplicar arma 1
        this.jony.weapon2 = w.id;
        this.refreshWeaponCards();
        this.updatePreviewSummary();
      });
      this.weapon2Cards.push(card);
    });
    ctrlY += 120;

    // --- PODER ---
    this.add
      .text(ctrlX - 300, ctrlY, 'PODER  [BARRA DE SUPER]', monoStyle({
        fontSize: '12px',
        color: THEME.accent,
        letterSpacing: 3,
      }))
      .setOrigin(0, 0.5);

    POWERS.forEach((p, i) => {
      const x = ctrlX - 300 + 20 + i * 128;
      const card = this.createPowerCard(x, ctrlY + 52, p, p.id === this.jony.power);
      card.on('pointerdown', () => {
        this.jony.power = p.id;
        this.refreshPowerCards();
        this.updatePreviewSummary();
      });
      this.powerCards.push(card);
    });
    ctrlY += 120;

    // ============================================================
    // Botones inferiores
    // ============================================================
    const backBtn = this.createActionButton(width / 2 - 120, height - 60, `${fa('arrowLeft')}  VOLVER`, false);
    backBtn.on('pointerdown', () => this.scene.start('MenuScene'));

    const continueBtn = this.createActionButton(width / 2 + 120, height - 60, `CONTINUAR  ${fa('arrowRight')}`, true);
    continueBtn.on('pointerdown', () => this.onContinue());

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

  /** Botón pequeño (accesorios) */
  private createSmallButton(x: number, y: number, label: string, active: boolean): Phaser.GameObjects.Container {
    const text = this.add
      .text(0, 0, label, monoStyle({
        fontSize: '12px',
        color: active ? THEME.bg : THEME.text,
      }))
      .setOrigin(0.5);

    const bg = this.add
      .rectangle(0, 0, text.width + 24, 30, Phaser.Display.Color.HexStringToColor(active ? THEME.accent : THEME.bg).color)
      .setStrokeStyle(1, Phaser.Display.Color.HexStringToColor(active ? THEME.accent : THEME.border).color);

    const container = this.add.container(x, y, [bg, text]);
    container.setSize(bg.width, bg.height);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerover', () => {
      if (!active) {
        text.setColor(THEME.accent);
        bg.setStrokeStyle(1, Phaser.Display.Color.HexStringToColor(THEME.accent).color);
      }
    });
    container.on('pointerout', () => {
      if (!active) {
        text.setColor(THEME.text);
        bg.setStrokeStyle(1, Phaser.Display.Color.HexStringToColor(THEME.border).color);
      }
    });

    return container;
  }

  /** Tarjeta de arma (selección) */
  private createWeaponCard(x: number, y: number, w: (typeof WEAPONS)[number], active: boolean): Phaser.GameObjects.Container {
    const name = this.add
      .text(0, -14, w.name, monoStyle({
        fontSize: '13px',
        color: active ? THEME.bg : THEME.text,
      }))
      .setOrigin(0.5);

    const tagline = this.add
      .text(0, 8, w.tagline, sansStyle({
        fontSize: '9px',
        color: active ? THEME.bg : THEME.secondary,
        wordWrap: { width: 108 },
        align: 'center',
      }))
      .setOrigin(0.5);

    const bg = this.add
      .rectangle(0, 0, 118, 76, Phaser.Display.Color.HexStringToColor(active ? w.color : THEME.bg).color)
      .setStrokeStyle(1, Phaser.Display.Color.HexStringToColor(active ? w.color : THEME.border).color);

    const container = this.add.container(x, y, [bg, name, tagline]);
    container.setSize(bg.width, bg.height);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerover', () => {
      if (!active) {
        name.setColor(w.color);
        bg.setStrokeStyle(1, Phaser.Display.Color.HexStringToColor(w.color).color);
      }
    });
    container.on('pointerout', () => {
      if (!active) {
        name.setColor(THEME.text);
        bg.setStrokeStyle(1, Phaser.Display.Color.HexStringToColor(THEME.border).color);
      }
    });

    return container;
  }

  /** Tarjeta de poder (selección) */
  private createPowerCard(x: number, y: number, p: (typeof POWERS)[number], active: boolean): Phaser.GameObjects.Container {
    const name = this.add
      .text(0, -16, p.name, monoStyle({
        fontSize: '12px',
        color: active ? THEME.bg : THEME.text,
      }))
      .setOrigin(0.5);

    const desc = this.add
      .text(0, 8, p.description, sansStyle({
        fontSize: '8px',
        color: active ? THEME.bg : THEME.secondary,
        wordWrap: { width: 108 },
        align: 'center',
      }))
      .setOrigin(0.5);

    const bg = this.add
      .rectangle(0, 0, 118, 76, Phaser.Display.Color.HexStringToColor(active ? p.color : THEME.bg).color)
      .setStrokeStyle(1, Phaser.Display.Color.HexStringToColor(active ? p.color : THEME.border).color);

    const container = this.add.container(x, y, [bg, name, desc]);
    container.setSize(bg.width, bg.height);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerover', () => {
      if (!active) {
        name.setColor(p.color);
        bg.setStrokeStyle(1, Phaser.Display.Color.HexStringToColor(p.color).color);
      }
    });
    container.on('pointerout', () => {
      if (!active) {
        name.setColor(THEME.text);
        bg.setStrokeStyle(1, Phaser.Display.Color.HexStringToColor(THEME.border).color);
      }
    });

    return container;
  }

  /** Botón de acción inferior (VOLVER / CONTINUAR) */
  private createActionButton(x: number, y: number, label: string, primary: boolean): Phaser.GameObjects.Text {
    const btn = this.add
      .text(x, y, label, monoFaStyle({
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
  // Refrescos de UI
  // ============================================================

  private refreshColorSwatches(): void {
    this.colorSwatches.forEach((swatch, i) => {
      const selected = COLORS[i].hex === this.jony.color;
      swatch.setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(selected ? THEME.accent : THEME.border).color);
      swatch.setScale(selected ? 1.15 : 1);
    });
  }

  private refreshAccessoryButtons(): void {
    this.accessoryBtns.forEach((btn, i) => {
      const active = ACCESSORIES[i].id === this.jony.accessory;
      const bg = btn.list[0] as Phaser.GameObjects.Rectangle;
      const text = btn.list[1] as Phaser.GameObjects.Text;
      bg.setFillStyle(Phaser.Display.Color.HexStringToColor(active ? THEME.accent : THEME.bg).color);
      bg.setStrokeStyle(1, Phaser.Display.Color.HexStringToColor(active ? THEME.accent : THEME.border).color);
      text.setColor(active ? THEME.bg : THEME.text);
    });
  }

  private refreshWeaponCards(): void {
    const refresh = (cards: Phaser.GameObjects.Container[], selectedId: string, isWeapon1: boolean) => {
      cards.forEach((card, i) => {
        const w = WEAPONS[i];
        const active = w.id === selectedId;
        const disabled = isWeapon1 ? false : w.id === this.jony.weapon1;
        const bg = card.list[0] as Phaser.GameObjects.Rectangle;
        const name = card.list[1] as Phaser.GameObjects.Text;
        const tagline = card.list[2] as Phaser.GameObjects.Text;

        bg.setFillStyle(Phaser.Display.Color.HexStringToColor(active ? w.color : THEME.bg).color);
        bg.setStrokeStyle(1, Phaser.Display.Color.HexStringToColor(active ? w.color : disabled ? '#3a3a3a' : THEME.border).color);
        name.setColor(active ? THEME.bg : disabled ? '#555' : THEME.text);
        tagline.setColor(active ? THEME.bg : disabled ? '#444' : THEME.secondary);
        card.setAlpha(disabled ? 0.45 : 1);
      });
    };
    refresh(this.weapon1Cards, this.jony.weapon1, true);
    refresh(this.weapon2Cards, this.jony.weapon2, false);
  }

  private refreshPowerCards(): void {
    this.powerCards.forEach((card, i) => {
      const p = POWERS[i];
      const active = p.id === this.jony.power;
      const bg = card.list[0] as Phaser.GameObjects.Rectangle;
      const name = card.list[1] as Phaser.GameObjects.Text;
      const desc = card.list[2] as Phaser.GameObjects.Text;

      bg.setFillStyle(Phaser.Display.Color.HexStringToColor(active ? p.color : THEME.bg).color);
      bg.setStrokeStyle(1, Phaser.Display.Color.HexStringToColor(active ? p.color : THEME.border).color);
      name.setColor(active ? THEME.bg : THEME.text);
      desc.setColor(active ? THEME.bg : THEME.secondary);
    });
  }

  private updatePreviewCircle(): void {
    this.previewCircle?.setFillStyle(Phaser.Display.Color.HexStringToColor(this.jony.color).color);
  }

  private updatePreviewAccessory(): void {
    const acc = ACCESSORIES.find((a) => a.id === this.jony.accessory) ?? ACCESSORIES[0];
    this.previewAccessory?.setText(acc.glyph);
  }

  private updatePreviewName(): void {
    this.previewName?.setText(this.jony.name || 'JONY');
  }

  private updatePreviewSummary(): void {
    // Reconstruir el resumen de armas/poder del preview
    const w1 = WEAPONS.find((w) => w.id === this.jony.weapon1) ?? WEAPONS[0];
    const w2 = WEAPONS.find((w) => w.id === this.jony.weapon2) ?? WEAPONS[1];
    const pw = POWERS.find((p) => p.id === this.jony.power) ?? POWERS[0];

    // El resumen se creó en create(); lo actualizamos buscando por posición.
    // Para simplicidad, guardamos las referencias en el preview container.
    // (Implementación simple: re-creamos los textos del resumen.)
    const previewX = 250;
    const previewY = 360;
    // Eliminar textos viejos del resumen (los últimos 2 hijos del marco)
    // NOTA: esto es frágil; mejor guardar referencias. Lo hacemos con un tag.
    this.children.list
      .filter((c) => c.getData('preview-summary'))
      .forEach((c) => c.destroy());

    const line1 = this.add
      .text(previewX, previewY + 110, `1: ${w1.name}   2: ${w2.name}`, monoStyle({
        fontSize: '13px',
        color: THEME.secondary,
      }))
      .setOrigin(0.5)
      .setData('preview-summary', true);

    const line2 = this.add
      .text(previewX, previewY + 135, `P: ${pw.name}`, monoStyle({
        fontSize: '13px',
        color: THEME.accent,
      }))
      .setOrigin(0.5)
      .setData('preview-summary', true);

    // Mantenerlos por encima del marco
    line1.setDepth(10);
    line2.setDepth(10);
  }

  // ============================================================
  // Acciones
  // ============================================================

  private onContinue(): void {
    // Nombre por defecto si está vacío
    if (!this.jony.name.trim()) this.jony.name = 'Jony';

    // Persistir
    saveJony(this.jony);

    // Ir a selección de modo
    this.scene.start('ModeSelectScene');
  }

  shutdown(): void {
    this.bg?.destroy();
    this.bg = undefined;
  }
}