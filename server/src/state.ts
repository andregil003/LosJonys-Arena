/**
 * state.ts — Estado autoritativo del servidor (Colyseus 0.18 / Schema v5).
 *
 * PUCK: estructura base del estado.
 * Shrek: extiende con lógica de gameplay (armas, poderes, enemigos, rondas).
 *
 * NOTA: Schema v5 usa el builder `schema({...}, "Name")` — sin decorators.
 * Los defaults se definen con `.default(valor)`.
 */

import { schema, t } from '@colyseus/schema';

export const Player = schema(
  {
    id: t.string().default(''),
    name: t.string().default('Jony'),
    color: t.string().default('#3A86FF'),
    weapon1: t.string().default('w1'),
    weapon2: t.string().default('w2'),
    power: t.string().default('p1'),
    x: t.number().default(0),
    y: t.number().default(0),
    hp: t.number().default(100),
    maxHp: t.number().default(100),
    activeSlot: t.number().default(1),
    powerCharge: t.number().default(0),
    alive: t.boolean().default(true),
    kills: t.number().default(0),
  },
  'Player',
);

export const ArenaState = schema(
  {
    players: t.map(Player),
    status: t.string().default('lobby'), // lobby | agent-select | playing | ended
    mode: t.string().default('ffa'), // coop | ffa
    timeLeft: t.number().default(0),
    round: t.number().default(1),
    maxPlayers: t.number().default(6),
  },
  'ArenaState',
);

// Tipo de instancia para tipar Room<ArenaState> (schema v5 devuelve un valor)
export type ArenaState = InstanceType<typeof ArenaState>;
export type PlayerState = InstanceType<typeof Player>;