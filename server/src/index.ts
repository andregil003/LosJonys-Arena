/**
 * index.ts — Punto de entrada del servidor LosJonys Arena.
 *
 * PUCK: infraestructura del servidor (Colyseus 0.18 + Express).
 * Shrek: las salas (CoopRoom/FFARoom) viven en src/rooms/.
 */

import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { createServer } from 'http';
import express from 'express';
import { ArenaRoom } from './rooms/ArenaRoom';

const PORT = Number(process.env.PORT) || 2567;

const app = express();
app.use(express.json());

// Health check para el deploy
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const httpServer = createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
});

// Registrar salas
gameServer.define('arena', ArenaRoom);

gameServer.listen(PORT).then(() => {
  console.log(`🚀 LosJonys Arena server escuchando en http://localhost:${PORT}`);
  console.log(`   Salas: arena (máx 6 jugadores)`);
});