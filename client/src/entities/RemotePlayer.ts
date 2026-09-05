/**
 * entities/RemotePlayer.ts — Jugador remoto (otro cliente) renderizado desde
 * el estado autoritativo del servidor (ServerPlayerState).
 *
 * ⚠️ TERRITORIO DE SHREK — implementación base hecha por puck pilas.
 * Shrek extiende: sprites reales, animaciones, interpolación de movimiento,
 * game feel.
 *
 * - Círculo placeholder con el color del Jony (mismo estilo que Player.ts).
 * - Texto con el nombre sobre el jugador.
 * - sync(state): actualiza posición, HP y estado alive desde el servidor.
 * - destroy(): limpia los game objects.
 */

import Phaser from 'phaser';
import type { ServerPlayerState } from '../systems/network';

export class RemotePlayer {
  readonly id: string;
  readonly name: string;
  readonly color: string;

  hp: number;
  maxHp: number;
  alive = true;

  private scene: Phaser.Scene;
  private body: Phaser.GameObjects.Arc;
  private nameText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, state: ServerPlayerState) {
    this.scene = scene;
    this.id = state.id;
    this.name = state.name.trim() || 'Jony';
    this.color = state.color;
    this.hp = state.hp;
    this.maxHp = state.maxHp;
    this.alive = state.alive;

    // Cuerpo: círculo placeholder con el color del Jony (Shrek pone sprites)
    this.body = scene.add
      .circle(state.x, state.y, 16, Phaser.Display.Color.HexStringToColor(this.color).color)
      .setStrokeStyle(2, Phaser.Display.Color.HexStringToColor('#fafafa').color);

    // Nombre sobre el jugador
    this.nameText = scene.add
      .text(state.x, state.y - 28, this.name, {
        fontFamily: "'Nunito', 'Segoe UI', sans-serif",
        fontSize: '12px',
        color: '#fafafa',
      })
      .setOrigin(0.5);
  }

  get x(): number {
    return this.body.x;
  }

  get y(): number {
    return this.body.y;
  }

  /**
   * Sincroniza este jugador remoto con el estado más reciente del servidor.
   * Actualiza posición, HP y estado alive.
   */
  sync(state: ServerPlayerState): void {
    this.hp = state.hp;
    this.maxHp = state.maxHp;
    this.alive = state.alive;

    if (this.alive) {
      this.body.setPosition(state.x, state.y);
      this.nameText.setPosition(state.x, state.y - 28);
      this.body.setVisible(true);
      this.nameText.setVisible(true);
    } else {
      this.body.setVisible(false);
      this.nameText.setVisible(false);
    }
  }

  destroy(): void {
    this.body.destroy();
    this.nameText.destroy();
  }
}
