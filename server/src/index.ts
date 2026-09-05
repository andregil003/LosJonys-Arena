/**
 * index.ts — Punto de entrada del servidor LosJonys Arena.
 *
 * PUCK: infraestructura del servidor (Colyseus + Express).
 * Shrek: las salas (CoopRoom/FFARoom) viven en src/rooms/.
 */

import { Server } from 'colyseus';
import { createServer } from 'http';
import express from 'express';
import { ArenaRoom } from './rooms/ArenaRoom';

const PORT = Number(process.env.PORT) || 2567;

const app = express();
app.use(express.json());

// Health check para el deploy
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', players: 0 });
});

const httpServer = createServer(app);
const gameServer = new Server({ server: httpServer });

// Registrar salas
gameServer.define('arena', ArenaRoom);

gameServer.listen(PORT).then(() => {
  console.log(`🚀 LosJonys Arena server escuchando en http://localhost:${PORT}`);
  console.log(`   Salas: arena (máx 6 jugadores)`);
});