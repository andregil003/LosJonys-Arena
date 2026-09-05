/**
 * ArenaRoom — Sala base del servidor (Colyseus 0.18) con gameplay autoritativo v1.
 *
 * PUCK: infraestructura (conexión, join/leave, estado base).
 * Shrek: lógica de gameplay — movimiento validado (anti-cheat), armas, cuchillo,
 * poderes, daño, ronda/estado. El cliente renderiza; el servidor decide.
 *
 * API 0.18: onMessage(tipo, callback) en onCreate; callback (client, message, ctx).
 * El reloj (this.now) lo avanza setTimestep (delta en ms).
 */

import { Room, Client } from '@colyseus/core';
import { ArenaState, Player, PlayerState } from '../state';
import { WEAPONS, POWERS, KNIFE, PLAYER_BALANCE, angleDiff, dist } from '../balance';

interface MoveMessage { x: number; y: number }
interface ShootMessage { angle: number }

/** Timers por jugador (memoria del room, no va al estado del cliente) */
interface PlayerTimers {
  weaponCdUntil: number;
  knifeCdUntil: number;
  powerCdUntil: number;
  dashUntil: number;
  shieldUntil: number;
  blindUntil: number;
  lastMoveAt: number;
  /** Sniper en preparación: ángulo y momento del disparo */
  sniperWindup: { angle: number; until: number } | null;
  /** Kamehameha cargando: ángulo y momento del rayo */
  kamehamehaCharge: { angle: number; until: number } | null;
  teleportMarker: { x: number; y: number } | null;
}

const MAX_SPEED = 320; // px/s (BASE_SPEED 200 + 60% de margen por lag)
const CHARGE_FACTOR = 100 / PLAYER_BALANCE.chargeRequired;

export class ArenaRoom extends Room<{ state: ArenaState }> {
  maxClients = 6;

  private now = 0;
  private timers = new Map<string, PlayerTimers>();

  onCreate(_options: unknown): void {
    this.setState(new ArenaState());
    this.state.mode = 'ffa';
    this.state.maxPlayers = this.maxClients;

    // Tick del servidor (30 Hz) — game loop autoritativo
    this.setTimestep((deltaTime) => this.updateGame(deltaTime));

    // --- Movimiento validado (anti-cheat: no más rápido que MAX_SPEED) ---
    this.onMessage('move', (client, message: MoveMessage) => {
      const player = this.state.players.get(client.sessionId);
      const timers = this.timers.get(client.sessionId);
      if (!player || !timers || !player.alive) return;

      const now = this.now;
      const dtMs = Math.max(16, now - timers.lastMoveAt);
      const moved = dist(player.x, player.y, message.x, message.y);
      const speed = (moved / dtMs) * 1000;

      if (speed > MAX_SPEED) {
        // Clamp la posición a la máxima distancia legal
        const scale = (MAX_SPEED * dtMs) / 1000 / moved;
        player.x = player.x + (message.x - player.x) * scale;
        player.y = player.y + (message.y - player.y) * scale;
      } else {
        player.x = message.x;
        player.y = message.y;
      }
      timers.lastMoveAt = now;
    });

    // --- Disparo de arma (slot 1|2; el 3 es cuchillo) ---
    this.onMessage('shoot', (client, message: ShootMessage) => {
      const player = this.state.players.get(client.sessionId);
      const timers = this.timers.get(client.sessionId);
      if (!player || !timers || !player.alive) return;
      if (this.now < timers.weaponCdUntil) return;

      const weaponId = player.activeSlot === 2 ? player.weapon2 : player.weapon1;
      const stats = WEAPONS[weaponId];
      if (!stats) return;
      timers.weaponCdUntil = this.now + stats.fireRateMs;

      if (stats.windupMs > 0) {
        // Sniper: comienza la preparación; el disparo ocurre en el tick
        timers.sniperWindup = { angle: message.angle, until: this.now + stats.windupMs };
        return;
      }
      this.fireWeapon(player, timers, weaponId, stats, message.angle);
    });

    // --- Cuchillo (slot 3, instakill en cono) ---
    this.onMessage('knife', (client, message: ShootMessage) => {
      const player = this.state.players.get(client.sessionId);
      const timers = this.timers.get(client.sessionId);
      if (!player || !timers || !player.alive) return;
      if (this.now < timers.knifeCdUntil) return;
      timers.knifeCdUntil = this.now + KNIFE.cooldownMs;

      const angle = message.angle;
      for (const [, target] of this.state.players) {
        if (target.id === player.id || !target.alive) continue;
        const d = dist(player.x, player.y, target.x, target.y);
        const angTo = Math.atan2(target.y - player.y, target.x - player.x);
        if (d <= KNIFE.range && angleDiff(angTo, angle) <= KNIFE.halfAngle) {
          this.kill(player, target);
        }
      }
    });

    // --- Poder (barra de Super) ---
    this.onMessage('power', (client, message: ShootMessage) => {
      const player = this.state.players.get(client.sessionId);
      const timers = this.timers.get(client.sessionId);
      if (!player || !timers || !player.alive) return;
      if (this.now < timers.powerCdUntil) return;
      if (player.powerCharge < 100) return; // La barra debe estar llena

      const stats = POWERS[player.power];
      if (!stats) return;
      player.powerCharge = 0;
      timers.powerCdUntil = this.now + stats.cooldownMs;

      switch (player.power) {
        case 'p1': // Kamehameha: carga y luego rayo masivo
          timers.kamehamehaCharge = { angle: message.angle, until: this.now + stats.windupMs };
          break;
        case 'p2': // Dash: impulso hacia adelante
          timers.dashUntil = this.now + stats.durationMs;
          player.x += Math.cos(message.angle) * stats.speed * (stats.durationMs / 1000);
          player.y += Math.sin(message.angle) * stats.speed * (stats.durationMs / 1000);
          break;
        case 'p3': // Escudo
          timers.shieldUntil = this.now + stats.durationMs;
          break;
        case 'p4': // Ceguera: orbe que ciega al primero en línea
          this.fireBlindOrb(player, message.angle);
          break;
        case 'p5': // Teletransporte: marca / vuelve
          if (timers.teleportMarker) {
            player.x = timers.teleportMarker.x;
            player.y = timers.teleportMarker.y;
            timers.teleportMarker = null;
          } else {
            timers.teleportMarker = { x: player.x, y: player.y };
          }
          break;
      }
    });
  }

  onJoin(client: Client, options: { name?: string; color?: string; weapon1?: string; weapon2?: string; power?: string; mode?: string }): void {
    const player = new Player();
    player.id = client.sessionId;
    player.name = options?.name ?? 'Jony';
    player.color = options?.color ?? '#3A86FF';
    player.weapon1 = options?.weapon1 ?? 'w1';
    player.weapon2 = options?.weapon2 ?? 'w2';
    player.power = options?.power ?? 'p1';
    player.x = 100 + Math.random() * 1000;
    player.y = 100 + Math.random() * 500;

    // Modo (el cliente lo manda en joinOrCreate; fallback al del room)
    this.state.mode = options?.mode ?? this.state.mode;

    // Equipos: COOP — todos los humanos al team 0; FFA — cada uno su índice único.
    // En FFA el índice se asigna ANTES de insertar (players.size = 0..5).
    player.team = this.state.mode === 'coop' ? 0 : this.state.players.size;

    this.state.players.set(client.sessionId, player);
    this.timers.set(client.sessionId, {
      weaponCdUntil: 0,
      knifeCdUntil: 0,
      powerCdUntil: 0,
      dashUntil: 0,
      shieldUntil: 0,
      blindUntil: 0,
      lastMoveAt: this.now,
      sniperWindup: null,
      kamehamehaCharge: null,
      teleportMarker: null,
    });
    console.log(`[JOIN] ${player.name} (${client.sessionId}) — ${this.state.players.size}/${this.maxClients}`);
  }

  onLeave(client: Client): void {
    this.state.players.delete(client.sessionId);
    this.timers.delete(client.sessionId);
    console.log(`[LEAVE] ${client.sessionId} — ${this.state.players.size}/${this.maxClients}`);
  }

  // ==========================================================
  // Gameplay (Shrek)
  // ==========================================================

  /** Dispara un arma: daño a todos los jugadores alcanzados por la línea/cono. */
  private fireWeapon(
    shooter: PlayerState,
    timers: PlayerTimers,
    weaponId: string,
    stats: (typeof WEAPONS)[string],
    angle: number,
  ): void {
    const now = this.now;

    for (const [, target] of this.state.players) {
      if (target.id === shooter.id || !target.alive) continue;
      const d = dist(shooter.x, shooter.y, target.x, target.y);
      if (d > stats.range) continue;

      const angTo = Math.atan2(target.y - shooter.y, target.x - shooter.x);
      const width = Math.asin(Math.min(1, 18 / Math.max(1, d))); // ~radio 18px
      const diff = angleDiff(angTo, angle);

      if (stats.explosive) {
        // Lanzagranadas: explota en área alrededor del punto de impacto
        const impact = { x: shooter.x + Math.cos(angle) * d, y: shooter.y + Math.sin(angle) * d };
        const ad = dist(target.x, target.y, impact.x, impact.y);
        if (ad <= stats.explosionRadius) {
          const falloff = 1 - (ad / stats.explosionRadius) * 0.5;
          this.damage(shooter, target, Math.round(stats.damage * falloff));
        }
        continue;
      }

      // Armas de 1 proyectil: pega si el objetivo está cerca de la línea del disparo
      if (stats.pellets === 1) {
        if (diff <= width) this.damage(shooter, target, stats.damage);
        continue;
      }

      // Escopeta: reparte los perdigones según qué tan centrado esté el objetivo
      if (diff <= stats.spreadDeg / 2 + width) {
        const hitPellets = Math.max(1, Math.round(stats.pellets * (1 - diff / (stats.spreadDeg / 2 + width))));
        this.damage(shooter, target, stats.damage * hitPellets);
      }
    }
  }

  /** Orbe de ceguera: ciega (2.5s) al primer jugador vivo en línea, hasta 640px. */
  private fireBlindOrb(shooter: PlayerState, angle: number): void {
    const stats = POWERS.p4;
    let best: PlayerState | null = null;
    let bestD = stats.speed; // el orbe viaja hasta su alcance

    for (const [, target] of this.state.players) {
      if (target.id === shooter.id || !target.alive) continue;
      const d = dist(shooter.x, shooter.y, target.x, target.y);
      if (d > stats.speed) continue;
      const angTo = Math.atan2(target.y - shooter.y, target.x - shooter.x);
      const width = Math.asin(Math.min(1, 14 / Math.max(1, d)));
      if (angleDiff(angTo, angle) <= width && d < bestD) {
        best = target;
        bestD = d;
      }
    }

    if (best) {
      const t = this.timers.get(best.id);
      if (t) t.blindUntil = this.now + stats.durationMs;
    }
  }

  /** Aplica daño respetando dash (inmune) y escudo (bloquea). Carga la barra. */
  private damage(shooter: PlayerState, target: PlayerState, amount: number): void {
    const targetTimers = this.timers.get(target.id);
    if (!targetTimers) return;
    if (this.now < targetTimers.dashUntil) return; // invulnerable en dash

    const raw = amount;
    if (this.now < targetTimers.shieldUntil) {
      // Escudo: bloquea, pero carga la barra de quien dispara un poco
      this.addCharge(shooter, Math.round(raw * 0.1));
      return;
    }

    target.hp = Math.max(0, target.hp - raw);
    this.addCharge(shooter, raw);
    this.addCharge(target, Math.round(raw * PLAYER_BALANCE.chargeFromDamageTaken));

    if (target.hp <= 0) this.kill(shooter, target);
  }

  /** Regala carga de barra de Super (0-100). */
  private addCharge(player: PlayerState, amount: number): void {
    if (amount <= 0) return;
    player.powerCharge = Math.min(100, player.powerCharge + amount * CHARGE_FACTOR);
  }

  /** Muerte: apaga al objetivo y suma un kill al autor. */
  private kill(shooter: PlayerState, target: PlayerState): void {
    if (!target.alive) return;
    target.hp = 0;
    target.alive = false;
    shooter.kills += 1;
    console.log(`[KILL] ${shooter.name} -> ${target.name}`);
  }

  /** Tick de juego: vence el windup del sniper y el rayo del kamehameha. */
  private updateGame(_deltaTime: number): void {
    this.now += _deltaTime;
    const now = this.now;

    for (const [sessionId, timers] of this.timers) {
      // Sniper listo
      if (timers.sniperWindup && now >= timers.sniperWindup.until) {
        const { angle } = timers.sniperWindup;
        timers.sniperWindup = null;
        const shooter = this.state.players.get(sessionId);
        if (shooter) this.fireWeapon(shooter, timers, 'w3', WEAPONS.w3, angle);
      }

      // Kamehameha dispara el rayo
      if (timers.kamehamehaCharge && now >= timers.kamehamehaCharge.until) {
        const { angle } = timers.kamehamehaCharge;
        timers.kamehamehaCharge = null;
        const shooter = this.state.players.get(sessionId);
        if (!shooter) continue;
        const stats = POWERS.p1;
        for (const [, target] of this.state.players) {
          if (target.id === shooter.id || !target.alive) continue;
          const d = dist(shooter.x, shooter.y, target.x, target.y);
          if (d > 600) continue;
          const angTo = Math.atan2(target.y - shooter.y, target.x - shooter.x);
          if (angleDiff(angTo, angle) <= 0.25) {
            this.damage(shooter, target, stats.damage);
          }
        }
      }
    }
  }
}