import Phaser from 'phaser';
import { gameConfig } from './config';

// Instrumentación obligatoria para Phaser 4 (usa import.meta.env)
declare global {
  interface Window {
    __PHASER_GAME__?: Phaser.Game;
  }
}

// Asegurar que FontAwesome esté cargada antes de renderizar textos con iconos
async function boot(): Promise<void> {
  try {
    await document.fonts.load('900 16px "Font Awesome 6 Free"');
  } catch {
    // Si falla la carga, el juego arranca igual (los iconos pueden no verse)
  }
  const game = new Phaser.Game(gameConfig);
  window.__PHASER_GAME__ = game;
}

void boot();

export default window.__PHASER_GAME__;