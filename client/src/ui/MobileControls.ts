/**
 * ui/MobileControls.ts — Controles táctiles para móvil (PUCK).
 *
 * - Joystick virtual: zona izquierda de la pantalla. Aparece donde tocas,
 *   arrastra para mover, suelta para detenerte.
 * - Botones de arma 1/2/3 + poder: zona derecha inferior.
 * - Solo se activan con touch (pointerType === 'touch'); en desktop no interfieren.
 * - Los controles marcan `isConsumingPointer` para que el Player no dispare
 *   cuando el toque está sobre ellos (el otro dedo dispara).
 */

import Phaser from 'phaser';

export class MobileControls {
  private scene: Phaser.Scene;

  // Joystick
  private joystickBase: Phaser.GameObjects.Arc | null = null;
  private joystickKnob: Phaser.GameObjects.Arc | null = null;
  private joystickPointerId: number | null = null;
  private originX = 0;
  private originY = 0;
  private vector = { x: 0, y: 0 };
  private readonly radius = 55;
  private readonly zoneRatio = 0.45;

  // Dedos activos sobre controles (joystick + botones)
  private touchCount = 0;
  private buttonPointers = new Set<number>();

  // Callbacks hacia el Player
  private onWeaponSlot: (slot: 1 | 2 | 3) => void = () => {};
  private onPower: () => void = () => {};

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    scene.input.on('pointerdown', this.handlePointerDown, this);
    scene.input.on('pointermove', this.handlePointerMove, this);
    scene.input.on('pointerup', this.handlePointerUp, this);
    scene.input.on('pointerupoutside', this.handlePointerUp, this);
    this.createButtons();
  }

  setCallbacks(opts: { onWeaponSlot: (slot: 1 | 2 | 3) => void; onPower: () => void }): void {
    this.onWeaponSlot = opts.onWeaponSlot;
    this.onPower = opts.onPower;
  }

  get isConsumingPointer(): boolean {
    return this.touchCount > 0;
  }

  get vectorX(): number {
    return this.vector.x;
  }

  get vectorY(): number {
    return this.vector.y;
  }

  get isActive(): boolean {
    return this.joystickPointerId !== null;
  }

  // ============================================================
  // Joystick
  // ============================================================

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (!pointer.wasTouch) return;
    if (this.joystickPointerId !== null) return;
    const w = this.scene.scale.width;
    if (pointer.x >= w * this.zoneRatio) return;

    this.joystickPointerId = pointer.id;
    this.originX = pointer.x;
    this.originY = pointer.y;
    this.vector = { x: 0, y: 0 };
    this.touchCount++;

    this.joystickBase = this.scene.add
      .circle(pointer.x, pointer.y, this.radius, 0xffffff, 0.12)
      .setStrokeStyle(2, 0xffffff, 0.35)
      .setScrollFactor(0)
      .setDepth(100);
    this.joystickKnob = this.scene.add
      .circle(pointer.x, pointer.y, 26, 0xffffff, 0.4)
      .setScrollFactor(0)
      .setDepth(101);
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.joystickPointerId || !this.joystickBase || !this.joystickKnob) return;
    const dx = pointer.x - this.originX;
    const dy = pointer.y - this.originY;
    const dist = Math.hypot(dx, dy);
    const max = this.radius;
    const clamped = Math.min(dist, max);
    const nx = dist > 0 ? dx / dist : 0;
    const ny = dist > 0 ? dy / dist : 0;
    this.joystickKnob.setPosition(this.originX + nx * clamped, this.originY + ny * clamped);
    this.vector = { x: nx * (clamped / max), y: ny * (clamped / max) };
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id === this.joystickPointerId) {
      this.joystickPointerId = null;
      this.vector = { x: 0, y: 0 };
      this.touchCount = Math.max(0, this.touchCount - 1);
      this.joystickBase?.destroy();
      this.joystickKnob?.destroy();
      this.joystickBase = null;
      this.joystickKnob = null;
    }
    if (this.buttonPointers.has(pointer.id)) {
      this.buttonPointers.delete(pointer.id);
      this.touchCount = Math.max(0, this.touchCount - 1);
    }
  }

  // ============================================================
  // Botones de arma / poder (solo dispositivos táctiles)
  // ============================================================

  private createButtons(): void {
    const isTouchDevice = this.scene.sys.game.device.input.touch;
    if (!isTouchDevice) return;

    const { width, height } = this.scene.scale;
    const r = 34;
    const gap = 14;
    const startX = width - r - 24;
    const y = height - r - 24;

    const defs: Array<{ label: string; x: number; y: number; cb: () => void }> = [
      { label: '⚡', x: startX, y: y - r * 2 - gap, cb: () => this.onPower() },
      { label: '1', x: startX, y, cb: () => this.onWeaponSlot(1) },
      { label: '2', x: startX - r * 2 - gap, y, cb: () => this.onWeaponSlot(2) },
      { label: '3', x: startX - (r * 2 + gap) * 2, y, cb: () => this.onWeaponSlot(3) },
    ];

    for (const d of defs) {
      const circle = this.scene.add
        .circle(d.x, d.y, r, 0x000000, 0.55)
        .setStrokeStyle(2, 0xffffff, 0.5)
        .setScrollFactor(0)
        .setDepth(100)
        .setInteractive({ useHandCursor: true });
      this.scene.add
        .text(d.x, d.y, d.label, {
          fontFamily: "'Rajdhani', 'Segoe UI', sans-serif",
          fontSize: '24px',
          color: '#ffffff',
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(101);

      circle.on('pointerdown', (p: Phaser.Input.Pointer) => {
        if (!p.wasTouch) return;
        this.buttonPointers.add(p.id);
        this.touchCount++;
        d.cb();
      });
      circle.on('pointerup', (p: Phaser.Input.Pointer) => {
        if (this.buttonPointers.has(p.id)) {
          this.buttonPointers.delete(p.id);
          this.touchCount = Math.max(0, this.touchCount - 1);
        }
      });
      circle.on('pointerout', (p: Phaser.Input.Pointer) => {
        if (this.buttonPointers.has(p.id)) {
          this.buttonPointers.delete(p.id);
          this.touchCount = Math.max(0, this.touchCount - 1);
        }
      });
    }
  }

  destroy(): void {
    this.scene.input.off('pointerdown', this.handlePointerDown, this);
    this.scene.input.off('pointermove', this.handlePointerMove, this);
    this.scene.input.off('pointerup', this.handlePointerUp, this);
    this.scene.input.off('pointerupoutside', this.handlePointerUp, this);
    this.joystickBase?.destroy();
    this.joystickKnob?.destroy();
  }
}