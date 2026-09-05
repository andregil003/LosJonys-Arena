// src/main.ts — Configuración del juego Phaser 4 (arquitectura: PUCK adoptará este archivo)
import Phaser from 'phaser';
import { ArenaScene } from './game/levels/arena-scene';

const config: Phaser.Types.Core.GameConfig = {
  // AUTO usa el renderer WebGL de Phaser 4, y cae a Canvas si no está disponible
  type: Phaser.AUTO,

  // Dimensiones de la arena (se escala con FIT)
  width: 960,
  height: 640,

  // Elemento DOM donde se inyecta el canvas (id en index.html)
  parent: 'game-container',

  backgroundColor: '#14141e',

  // Escalado responsive
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },

  // Física Arcade (AABB ligera, ideal para top-down shooters)
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 }, // top-down: sin gravedad
      debug: false, // true pinta los cuerpos (útil mientras se construye)
    },
  },

  // Escenas: la primera arranca automáticamente
  scene: [ArenaScene],
};

// Instancia única del juego (Vite importa este módulo al cargar la página)
export default new Phaser.Game(config);