/**
 * systems/music-system.ts — Música por arma y lobby (Shrek).
 *
 * Reglas (definidas por André):
 * - 'music-lobby' suena en el LOBBY (menú / selección de agente).
 * - Cada ARMA PRINCIPAL (slot 1) tiene SU canción: al entrar a la arena
 *   la música cambia a la canción del arma principal del Jony local.
 * - La secundaria (slot 2) y el cuchillo (slot 3) NO cambian la música:
 *   sigue sonando la canción del arma principal.
 * - En FFA cada jugador escucha la canción de SU arma principal (solo la local).
 *
 * Integración desde las escenas (PUCK):
 *   1. preload():  MusicSystem.preload(this)
 *   2. LobbyScene / MenuScene: MusicSystem.playLobby(this) — canción del lobby.
 *   3. GameScene create(): MusicSystem.init(this, weapon1DelJonyLocal)
 *   4. Al cambiar slot (va con keydown 1|2|3): emite el evento del contrato:
 *        EventBus.emit(GameEvents.WEAPON_CHANGED, { weaponId, slot })
 *      El sistema reacciona solo (slot 1 cambia tema; slots 2/3 ignoran).
 */

import Phaser from 'phaser';
import { EventBus, GameEvents, WeaponId } from '../types';

/** Mapeo canción → archivo. Para reordenar canciones solo cambia esto. */
export const MUSIC_TRACKS: Record<'lobby' | WeaponId, string> = {
  lobby: 'assets/audio/music/music-lobby.mp3',
  w1: 'assets/audio/music/music-w1.mp3',
  w2: 'assets/audio/music/music-w2.mp3',
  w3: 'assets/audio/music/music-w3.mp3',
  w4: 'assets/audio/music/music-w4.mp3',
  w5: 'assets/audio/music/music-w5.mp3',
};

/** Payload que emite la escena al cambiar de slot (contrato WEAPON_CHANGED). */
export interface WeaponChangedPayload {
  weaponId: WeaponId;
  slot: 1 | 2 | 3;
}

const VOLUME = {
  lobby: 0.275,
  weapon: 0.35,
} as const;

class MusicSystemImpl {
  private scene: Phaser.Scene | null = null;
  private current: Phaser.Sound.BaseSound | null = null;
  private weapon1: WeaponId = 'w1';
  private playing: 'lobby' | WeaponId | null = null;

  /** Registra las 6 canciones en el loader de la escena. */
  preload(scene: Phaser.Scene): void {
    for (const [key, url] of Object.entries(MUSIC_TRACKS)) {
      scene.load.audio(`music-${key}`, url);
    }
  }

  /** Canción del lobby (LobbyScene/MenuScene). */
  playLobby(scene: Phaser.Scene): void {
    this.setScene(scene);
    this.play('lobby');
  }

  /** Inicia la música de arena con la canción del arma principal del Jony. */
  init(scene: Phaser.Scene, weapon1: WeaponId): void {
    this.setScene(scene);
    this.weapon1 = weapon1;
    EventBus.on(GameEvents.WEAPON_CHANGED, this.onWeaponChanged, this);
    this.play(weapon1);
  }

  /** Detiene todo y libera listeners (llamarlo al salir de la escena). */
  stop(): void {
    EventBus.off(GameEvents.WEAPON_CHANGED, this.onWeaponChanged, this);
    this.current?.stop();
    this.current = null;
    this.scene = null;
    this.playing = null;
  }

  private setScene(scene: Phaser.Scene): void {
    if (this.scene === scene) return;
    this.scene = scene;
  }

  private onWeaponChanged = (payload: WeaponChangedPayload): void => {
    // Solo el slot 1 (arma principal) cambia la música; 2 y 3 la dejan igual.
    if (payload.slot !== 1) return;
    if (payload.weaponId === this.playing) return;
    this.weapon1 = payload.weaponId;
    this.play(payload.weaponId);
  };

  private play(track: 'lobby' | WeaponId): void {
    if (!this.scene) return;
    if (this.playing === track && this.current?.isPlaying) return;

    const key = `music-${track}`;
    if (!this.scene.cache.audio.exists(key)) return;

    const vol = track === 'lobby' ? VOLUME.lobby : VOLUME.weapon;

    if (this.current) {
      this.scene.sound.remove(this.current); // frena y libera la anterior
    }
    const next = this.scene.sound.add(key, { loop: true, volume: vol });
    next.play();
    this.current = next;
    this.playing = track;
  }
}

export const MusicSystem = new MusicSystemImpl();