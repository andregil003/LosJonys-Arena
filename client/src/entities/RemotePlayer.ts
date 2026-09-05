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
  private teamText: Phaser.GameObjects.Text | null = null;

  constructor(scene: Phaser.Scene, state: ServerPlayerState) {
    this.scene = scene;
    this.id = state.id;
    this.name = state.name.trim() || 'Jony';
    this.color = state.color;
    this.hp = state.hp;
    this.maxHp = state.maxHp;
    this.alive = state.alive;

    // Color del cuerpo: en COOP el equipo define el color (0 = aliado azul,
    // 1 = enemigo rojo); en FFA (team único o ausente) se usa el del Jony.
    const bodyColor = teamColor(state);

    this.body = scene.add
      .circle(state.x, state.y, 16, Phaser.Display.Color.HexStringToColor(bodyColor).color)
      .setStrokeStyle(2, Phaser.Display.Color.HexStringToColor('#fafafa').color);

    // Nombre sobre el jugador
    this.nameText = scene.add
      .text(state.x, state.y - 28, this.name, {
        fontFamily: "'Nunito', 'Segoe UI', sans-serif",
        fontSize: '12px',
        color: '#fafafa',
      })
      .setOrigin(0.5);

    // Badge de equipo (solo en COOP: 0/1)
    const badge = teamBadge(state);
    if (badge) {
      this.teamText = scene.add
        .text(state.x, state.y - 44, badge.label, {
          fontFamily: "'Nunito', 'Segoe UI', sans-serif",
          fontSize: '9px',
          fontStyle: 'bold',
          color: badge.color,
          backgroundColor: 'rgba(0,0,0,0.55)',
          padding: { x: 4, y: 1 },
        })
        .setOrigin(0.5);
    }
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
      this.teamText?.setPosition(state.x, state.y - 44);
      this.body.setVisible(true);
      this.nameText.setVisible(true);
      this.teamText?.setVisible(true);
    } else {
      this.body.setVisible(false);
      this.nameText.setVisible(false);
      this.teamText?.setVisible(false);
    }
  }

  destroy(): void {
    this.body.destroy();
    this.nameText.destroy();
    this.teamText?.destroy();
  }
}

/** Color del círculo según el equipo (COOP) o el color del Jony (FFA). */
function teamColor(state: ServerPlayerState): string {
  if (state.team === 0) return '#3b82f6'; // aliado
  if (state.team === 1) return '#ef4444'; // enemigo
  return state.color; // FFA: cada quien su color
}

/** Badge de equipo: solo en COOP (team 0/1). FFA → null. */
function teamBadge(state: ServerPlayerState): { label: string; color: string } | null {
  if (state.team === 0) return { label: 'ALIADO', color: '#93c5fd' };
  if (state.team === 1) return { label: 'ENEMIGO', color: '#fca5a5' };
  return null;
}
