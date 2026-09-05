/**
 * ArenaRoom — Sala base del servidor (Colyseus 0.18).
 *
 * PUCK: infraestructura (conexión, join/leave, estado base).
 * Shrek: extiende esta sala para COOP (CoopRoom) y FFA (FFARoom)
 * con la lógica de gameplay: movimiento autoritativo, daño, armas,
 * poderes, enemigos (COOP), zona que se encoge (FFA).
 *
 * NOTA API 0.18: onMessage se registra con this.onMessage(tipo, callback)
 * dentro de onCreate. El callback recibe (client, message, ctx).
 */

import { Room, Client } from '@colyseus/core';
import { ArenaState, Player } from '../state';

export class ArenaRoom extends Room<{ state: ArenaState }> {
  maxClients = 6;

  onCreate(_options: any): void {
    this.setState(new ArenaState());
    this.state.mode = 'ffa';
    this.state.maxPlayers = this.maxClients;

    // Tick del servidor (30 Hz) — Shrek: aquí va el game loop autoritativo
    this.setTimestep((deltaTime) => this.updateGame(deltaTime));

    // --- Mensajes del cliente ---
    this.onMessage('move', (client, message: { x: number; y: number }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      // Shrek: validar velocidad máxima aquí (anti-cheat)
      player.x = message.x;
      player.y = message.y;
    });

    this.onMessage('shoot', (client) => {
      // Shrek: lógica de disparo autoritativa
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
    });

    this.onMessage('knife', (client) => {
      // Shrek: lógica de cuchillo instakill
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
    });

    this.onMessage('power', (client) => {
      // Shrek: lógica de poderes
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
    });
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

  private updateGame(_deltaTime: number): void {
    // Shrek: game loop autoritativo (daño, colisiones, rondas, zona)
  }
}