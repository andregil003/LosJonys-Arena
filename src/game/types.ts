// src/game/types.ts — EL CONTRATO del equipo LosJonys (sagrado).
// Tipos compartidos, EventBus y GameState. Cualquier cambio requiere aviso al equipo.
// Territorio raíz: PUCK mantiene la base; Shrek puede AÑADIR tipos de gameplay (nunca borrar).

import Phaser from 'phaser';

// ---------------------------------------------------------------------------
// EventBus — único canal de comunicación entre roles (gameplay → UI/audio/niveles)
// ---------------------------------------------------------------------------
export const EventBus = new Phaser.Events.EventEmitter();

export const GameEvents = {
  PlayerDamaged: 'player-damaged',
  PlayerDied: 'player-died',
  EnemyDied: 'enemy-died',
  KnifeKill: 'knife-kill',
  WeaponFired: 'weapon-fired',
  PowerUsed: 'power-used',
  PlayerBlinded: 'player-blinded',
  TeleportMarked: 'teleport-marked',
  TeleportMoved: 'teleport-moved',
} as const;

// ---------------------------------------------------------------------------
// Armas (1 de 5 por jugador) — independientes de poderes
// ---------------------------------------------------------------------------
export type WeaponId = 'shotgun' | 'assault_rifle' | 'sniper' | 'smg' | 'grenade_launcher';

export interface WeaponStats {
  id: WeaponId;
  name: string;
  desc: string;
  /** daño por proyectil */
  damage: number;
  /** intervalo entre disparos (ms) */
  fireRateMs: number;
  /** proyectiles por disparo (escopeta = abanico) */
  pellets: number;
  /** dispersión TOTAL del abanico (grados) */
  spreadDeg: number;
  /** velocidad de cada proyectil (px/s) */
  pelletSpeed: number;
  /** alcance máximo antes de desaparecer (px) */
  range: number;
  /** tiempo de preparación antes del disparo (sniper, ms; 0 = instantáneo) */
  windupMs: number;
  /** el proyectil explota en área (lanzagranadas) */
  explosive: boolean;
  /** radio de la explosión (px) */
  explosionRadius: number;
  /** true = automática (mantener click); false = semiautomática (por click) */
  auto: boolean;
  /** color del proyectil (feedback visual procedural) */
  color: number;
}

// ---------------------------------------------------------------------------
// Poderes (1 de 5 por jugador) — independientes de armas y personaje
// ---------------------------------------------------------------------------
export type PowerId = 'kamehameha' | 'dash' | 'shield' | 'blind' | 'teleport';

export interface PowerStats {
  id: PowerId;
  name: string;
  desc: string;
  /** cooldown tras usar el poder (ms) */
  cooldownMs: number;
  /** tiempo de carga / preparación (kamehameha, ms) */
  windupMs: number;
  /** duración del efecto (escudo, rayo, ceguera, dash — ms) */
  durationMs: number;
  /** velocidad del proyectil/rayo (blind; px/s) */
  speed: number;
  /** daño directo (kamehameha) */
  damage: number;
}

// ---------------------------------------------------------------------------
// Contexto de combate — lo que los sistemas necesitan de la escena (top-down arena)
// La escena implementa esta interfaz estructuralmente (sin imports cruzados).
// ---------------------------------------------------------------------------
export interface ArenaContext {
  /** grupo de proyectiles de armas */
  bullets: Phaser.Physics.Arcade.Group;
  /** grupo de esferas de ceguera (poder) */
  orbGroup: Phaser.Physics.Arcade.Group;
  /** grupo de enemigos/bots */
  enemies: Phaser.Physics.Arcade.Group;
  /** cobertura estática (cajas) — bloquean movimiento, no proyectiles */
  cover: Phaser.Physics.Arcade.StaticGroup;
}

// ---------------------------------------------------------------------------
// GameState — única fuente de verdad del estado global (mínimo para la jam)
// ---------------------------------------------------------------------------
export interface ArenaState {
  score: number;
  enemiesKilled: number;
  playerHp: number;
  playerWeapon: WeaponId;
  playerPower: PowerId;
}