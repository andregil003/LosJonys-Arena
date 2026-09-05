/**
 * types.ts — EL CONTRATO del proyecto LosJonys Arena.
 *
 * Este archivo es SAGRADO: define los tipos compartidos entre PUCK y Shrek.
 * Cualquier cambio requiere avisar al otro antes. Nunca borres tipos de otros.
 */

// ============================================================
// Identidad del Jony (personalización)
// ============================================================

export interface JonyConfig {
  /** Nombre del personaje (aparece sobre la cabeza en la arena) */
  name: string;
  /** Paleta de color elegida */
  color: string;
  /** Accesorio elegido (sombrero, gafas, moño...) */
  accessory: string;
  /** Arma principal (tecla 1) */
  weapon1: WeaponId;
  /** Arma secundaria (tecla 2) */
  weapon2: WeaponId;
  /** Poder elegido (barra de Super) */
  power: PowerId;
}

// ============================================================
// Armas y poderes (los define Shrek — ver GDD Section 6)
// ============================================================

export type WeaponId = 'w1' | 'w2' | 'w3' | 'w4' | 'w5';
export type PowerId = 'p1' | 'p2' | 'p3' | 'p4' | 'p5';

export interface WeaponStats {
  id: WeaponId;
  name: string;
  damage: number;
  fireRate: number; // disparos por segundo
  range: number; // px
  reloadTime: number; // segundos
  projectileSpeed: number; // px/s
  /** true = hitscan/instantáneo, false = proyectil */
  hitscan: boolean;
}

export interface PowerStats {
  id: PowerId;
  name: string;
  description: string;
  /** Cuánto daño (hecho o recibido) se necesita para cargar la barra al 100% */
  chargeRequired: number;
  cooldown: number; // segundos tras usar
}

// ============================================================
// Estado del juego (autoritativo en servidor, espejo en cliente)
// ============================================================

export interface PlayerState {
  id: string;
  jony: JonyConfig;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  /** Arma en mano: 1, 2 o 3 (cuchillo) */
  activeSlot: 1 | 2 | 3;
  /** Carga del poder 0-100 */
  powerCharge: number;
  alive: boolean;
  kills: number;
}

export interface GameState {
  players: Record<string, PlayerState>;
  mode: GameMode;
  /** Segundos restantes de la partida */
  timeLeft: number;
  /** Ronda actual (COOP) */
  round: number;
  status: 'lobby' | 'agent-select' | 'playing' | 'ended';
}

export type GameMode = 'coop' | 'ffa';

// ============================================================
// EventBus — comunicación entre sistemas sin imports cruzados
// ============================================================

import Phaser from 'phaser';

export const EventBus = new Phaser.Events.EventEmitter();

export const GameEvents = {
  /** Disparado cuando el jugador cambia de arma (slot 1|2|3) */
  WEAPON_CHANGED: 'weapon-changed',
  /** Disparado cuando el poder está cargado y listo */
  POWER_READY: 'power-ready',
  /** Disparado cuando el jugador muere */
  PLAYER_DIED: 'player-died',
  /** Disparado cuando se conecta/desconecta un jugador (multiplayer) */
  PLAYER_JOINED: 'player-joined',
  PLAYER_LEFT: 'player-left',
  /** Disparado al cambiar de escena (menú → lobby → arena) */
  SCENE_CHANGED: 'scene-changed',
} as const;

// ============================================================
// Constantes del juego
// ============================================================

export const GAME_CONSTANTS = {
  /** Tamaño de la arena en px */
  ARENA_WIDTH: 1280,
  ARENA_HEIGHT: 720,
  /** Velocidad base del Jony en px/s */
  BASE_SPEED: 200,
  /** Bonus de velocidad con cuchillo en mano */
  KNIFE_SPEED_BONUS: 0.2,
  /** Rango del cuchillo (instakill) en px */
  KNIFE_RANGE: 40,
  /** HP base del Jony */
  BASE_HP: 100,
  /** Duración del lobby en segundos */
  LOBBY_SECONDS: 120,
  /** Máximo de jugadores por sala */
  MAX_PLAYERS: 6,
  /** Tick rate del servidor en Hz */
  SERVER_TICK_RATE: 30,
} as const;