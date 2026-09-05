/**
 * ArenaRoom — Sala base del servidor (Colyseus).
 *
 * PUCK: infraestructura (conexión, join/leave, estado base).
 * Shrek: extiende esta sala para COOP (CoopRoom) y FFA (FFARoom)
 * con la lógica de gameplay: movimiento autoritativo, daño, armas,
 * poderes, enemigos (COOP), zona que se encoge (FFA).
 */

import { Room, Client } from 'colyseus';
import { ArenaState, Player } from '../state';

export class ArenaRoom extends Room<ArenaState> {
  maxClients = 6;

  onCreate(_options: any): void {
    this.setState(new ArenaState());
    this.state.mode = 'ffa';
    this.state.maxPlayers = this.maxClients;

    // Tick del servidor (30 Hz) — Shrek: aquí va el game loop autoritativo
    this.setSimulationInterval(() => this.updateGame(), 1000 / 30);
  }

  onJoin(client: Client, options: any): void {
    const player = new Player();
    player.id = client.sessionId;
    player.name = options?.name ?? 'Jony';
    player.color = options?.color ?? '#3A86FF';
    player.weapon1 = options?.weapon1 ?? 'w1';
    player.weapon2 = options?.weapon2 ?? 'w2';
    player.power = options?.power ?? 'p1';
    player.x = 100 + Math.random() * 1000;
    player.y = 100 + Math.random() * 500;

    this.state.players.set(client.sessionId, player);
    console.log(`[JOIN] ${player.name} (${client.sessionId}) — ${this.state.players.size}/${this.maxClients}`);
  }

  onLeave(client: Client): void {
    this.state.players.delete(client.sessionId);
    console.log(`[LEAVE] ${client.sessionId} — ${this.state.players.size}/${this.maxClients}`);
  }

  onMessage(client: Client, type: string | number, message: any): void {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    switch (type) {
      case 'move':
        // Shrek: movimiento autoritativo con validación de velocidad
        player.x = message.x;
        player.y = message.y;
        break;
      case 'shoot':
        // Shrek: lógica de disparo autoritativa
        break;
      case 'knife':
        // Shrek: lógica de cuchillo instakill
        break;
      case 'power':
        // Shrek: lógica de poderes
        break;
      default:
        break;
    }
  }

  private updateGame(): void {
    // Shrek: game loop autoritativo (daño, colisiones, rondas, zona)
  }
}