/**
 * systems/network.ts — Red del cliente (Colyseus SDK).
 *
 * PUCK: infraestructura de red (conexión, join/leave, envío de mensajes).
 * Shrek: extiende con la lógica de gameplay autoritativa del servidor.
 *
 * El NetworkManager es un singleton: una sola conexión por pestaña.
 * Usa @colyseus/sdk (^0.18) — el mismo contrato que el servidor.
 *
 * Territorio: PUCK (infraestructura) + Shrek (gameplay del servidor).
 */

import { Client, Room } from '@colyseus/sdk';
import { EventBus, GameEvents, type JonyConfig, type GameMode } from '../types';

// ============================================================
// Tipos que reflejan el schema del servidor (server/src/state.ts)
// ============================================================

export interface ServerPlayerState {
  id: string;
  name: string;
  color: string;
  weapon1: string;
  weapon2: string;
  power: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  activeSlot: number;
  powerCharge: number;
  alive: boolean;
  kills: number;
  /** Equipo (0 = aliados, 1 = enemigos en COOP; único por jugador en FFA). */
  team: number;
}

export interface ServerGameState {
  players: Map<string, ServerPlayerState>;
  status: string;
  mode: string;
  timeLeft: number;
  round: number;
  maxPlayers: number;
}

// ============================================================
// NetworkManager (singleton)
// ============================================================

export class NetworkManager {
  private static instance: NetworkManager;

  private client: Client | null = null;
  private room: Room<ServerGameState> | null = null;
  private connected = false;

  private constructor() {}

  static getInstance(): NetworkManager {
    if (!NetworkManager.instance) {
      NetworkManager.instance = new NetworkManager();
    }
    return NetworkManager.instance;
  }

  get isConnected(): boolean {
    return this.connected;
  }

  get sessionId(): string | null {
    return this.room?.sessionId ?? null;
  }

  get currentRoom(): Room<ServerGameState> | null {
    return this.room;
  }

  /**
   * Conecta al servidor y entra a la sala 'arena' con el Jony del jugador.
   * URL configurable: VITE_SERVER_URL (producción) o ws://localhost:2567 (dev).
   */
  async joinRoom(jony: JonyConfig, mode: GameMode): Promise<void> {
    if (this.connected && this.room) {
      return; // ya conectado
    }

    const url = import.meta.env.VITE_SERVER_URL ?? 'ws://localhost:2567';
    this.client = new Client(url);

    try {
      this.room = await this.client.joinOrCreate<ServerGameState>('arena', {
        name: jony.name,
        color: jony.color,
        weapon1: jony.weapon1,
        weapon2: jony.weapon2,
        power: jony.power,
        mode,
      });
      this.connected = true;

      this.room.onStateChange((state) => this.handleStateChange(state));
      this.room.onLeave(() => this.handleLeave());
      this.room.onError((code, message) => {
        console.error(`[NET] error ${code}: ${message}`);
      });

      console.log(`[NET] conectado a sala 'arena' como ${jony.name} (${this.room.sessionId})`);
    } catch (err) {
      this.connected = false;
      this.room = null;
      this.client = null;
      console.warn('[NET] no se pudo conectar al servidor:', err);
      throw err;
    }
  }

  // ============================================================
  // Envío de mensajes al servidor
  // ============================================================

  sendMove(x: number, y: number): void {
    this.room?.send('move', { x, y });
  }

  sendShoot(angle: number): void {
    this.room?.send('shoot', { angle });
  }

  sendKnife(angle: number): void {
    this.room?.send('knife', { angle });
  }

  sendPower(angle: number): void {
    this.room?.send('power', { angle });
  }

  disconnect(): void {
    this.room?.leave();
    this.room = null;
    this.client = null;
    this.connected = false;
  }

  // ============================================================
  // Eventos del servidor → EventBus del contrato
  // ============================================================

  private handleStateChange(state: ServerGameState): void {
    // El estado llega como schema de Colyseus; lo emitimos por el EventBus
    // para que las escenas/sistemas reaccionen sin imports cruzados.
    EventBus.emit(GameEvents.SCENE_CHANGED, { state });
  }

  private handleLeave(): void {
    this.connected = false;
    EventBus.emit(GameEvents.SCENE_CHANGED, { left: true });
    console.log('[NET] desconectado del servidor');
  }
}

/** Singleton exportado para uso directo */
export const network = NetworkManager.getInstance();