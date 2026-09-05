import Phaser from 'phaser';

/**
 * MenuScene — Menú principal de LosJonys Arena.
 * PUCK: estructura base. El diseño visual se pule en Fase 1.
 */
export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create(): void {
    const { width, height } = this.scale;

    // Título
    this.add
      .text(width / 2, height / 2 - 120, 'LOSJONYS ARENA', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '64px',
        color: '#3A86FF',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 - 60, 'Crea tu Jony. Elige tus armas. Sobrevive.', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '20px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    // Botón Jugar
    const playButton = this.add
      .text(width / 2, height / 2 + 40, '▶ JUGAR', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '32px',
        color: '#ffffff',
        backgroundColor: '#3A86FF',
        padding: { x: 24, y: 12 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    playButton.on('pointerover', () => playButton.setColor('#FFBE0B'));
    playButton.on('pointerout', () => playButton.setColor('#ffffff'));
    playButton.on('pointerdown', () => this.scene.start('GameScene'));

    // Versión
    this.add
      .text(width - 10, height - 10, 'v0.1.0 — Fase 0', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        color: '#666666',
      })
      .setOrigin(1, 1);
  }
}