import Phaser from 'phaser';
import { GAME_CONSTANTS } from './types';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_CONSTANTS.ARENA_WIDTH,
  height: GAME_CONSTANTS.ARENA_HEIGHT,
  parent: 'game-container',
  backgroundColor: '#1b1b2f',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [MenuScene, GameScene],
};