/**
 * state.ts — Estado autoritativo del servidor (Colyseus Schema).
 *
 * PUCK: estructura base del estado.
 * Shrek: extiende con lógica de gameplay (armas, poderes, enemigos, rondas).
 */

import { Schema, type, MapSchema } from '@colyseus/schema';

export class Player extends Schema {
  @type('string') id: string = '';
  @type('string') name: string = '';
  @type('string') color: string = '#3A86FF';
  @type('string') weapon1: string = 'w1';
  @type('string') weapon2: string = 'w2';
  @type('string') power: string = 'p1';
  @type('number') x: number = 0;
  @type('number') y: number = 0;
  @type('number') hp: number = 100;
  @type('number') maxHp: number = 100;
  @type('number') activeSlot: number = 1;
  @type('number') powerCharge: number = 0;
  @type('boolean') alive: boolean = true;
  @type('number') kills: number = 0;
}

export class ArenaState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type('string') status: string = 'lobby'; // lobby | agent-select | playing | ended
  @type('string') mode: string = 'ffa'; // coop | ffa
  @type('number') timeLeft: number = 0;
  @type('number') round: number = 1;
  @type('number') maxPlayers: number = 6;
}