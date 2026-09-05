import Phaser from 'phaser';
import { gameConfig } from './config';

// Instrumentación obligatoria para Phaser 4 (usa import.meta.env)
declare global {
  interface Window {
    __PHASER_GAME__?: Phaser.Game;
  }
}

// Asegurar que las fuentes estén cargadas antes de renderizar textos
async function boot(): Promise<void> {
  try {
    // FontAwesome (iconos) + Rajdhani (títulos/números) + Nunito (UI)
    await Promise.all([
      document.fonts.load('900 16px "Font Awesome 6 Free"'),
      document.fonts.load('700 16px "Rajdhani"'),
      document.fonts.load('700 16px "Nunito"'),
    ]);
  } catch {
    // Si falla la carga, el juego arranca igual (las fuentes pueden no verse)
  }
  const game = new Phaser.Game(gameConfig);
  window.__PHASER_GAME__ = game;
}

void boot();

export default window.__PHASER_GAME__;