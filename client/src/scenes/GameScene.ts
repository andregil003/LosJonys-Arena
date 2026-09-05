import Phaser from 'phaser';
import { GAME_CONSTANTS, EventBus, GameEvents } from '../types';

/**
 * GameScene — Arena de juego (placeholder Fase 0).
 *
 * PUCK: estructura base para validar que el juego corre.
 * Shrek: el gameplay real (movimiento, armas, cuchillo, poderes)
 * vive en src/entities/ y src/systems/ — esto es solo el esqueleto.
 */
export class GameScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Arc;
  private playerName!: Phaser.GameObjects.Text;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private bullets!: Phaser.Physics.Arcade.Group;

  constructor() {
    super('GameScene');
  }

  create(): void {
    const { width, height } = this.scale;

    // Fondo de la arena
    this.add.rectangle(width / 2, height / 2, width, height, 0x2a2a3f);

    // Jugador placeholder (círculo) — Shrek lo reemplaza con sprites
    this.player = this.add.circle(width / 2, height / 2, 16, 0x3a86ff);
    this.physics.add.existing(this.player as unknown as Phaser.GameObjects.GameObject);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);

    // Nombre sobre el jugador
    this.playerName = this.add
      .text(this.player.x, this.player.y - 28, 'Jony', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    // Input
    this.cursors = this.input.keyboard!.createCursorKeys();

    // Grupo de balas (pool)
    this.bullets = this.physics.add.group();

    // Instrucciones
    this.add
      .text(10, 10, 'WASD: mover | Clic: disparar | 3: cuchillo (placeholder)', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        color: '#888888',
      })
      .setOrigin(0, 0);

    // Volver al menú
    this.input.keyboard!.on('keydown-ESC', () => this.scene.start('MenuScene'));
  }

  update(): void {
    const speed = GAME_CONSTANTS.BASE_SPEED;
    const body = this.player.body as Phaser.Physics.Arcade.Body;

    // Movimiento 8 direcciones
    let vx = 0;
    let vy = 0;
    if (this.cursors.left.isDown) vx = -1;
    if (this.cursors.right.isDown) vx = 1;
    if (this.cursors.up.isDown) vy = -1;
    if (this.cursors.down.isDown) vy = 1;

    if (vx !== 0 && vy !== 0) {
      const inv = Math.SQRT1_2;
      vx *= inv;
      vy *= inv;
    }

    body.setVelocity(vx * speed, vy * speed);

    // Nombre sigue al jugador
    this.playerName.setPosition(this.player.x, this.player.y - 28);

    // Disparo con clic
    if (this.input.activePointer.isDown) {
      this.shoot();
    }
  }

  private shoot(): void {
    const pointer = this.input.activePointer;
    const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, pointer.worldX, pointer.worldY);

    const bullet = this.bullets.get(this.player.x, this.player.y) as Phaser.Physics.Arcade.Image | null;
    if (!bullet) return;

    bullet.setActive(true).setVisible(true);
    bullet.setPosition(this.player.x, this.player.y);
    bullet.setSize(8, 8);
    const body = bullet.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(Math.cos(angle) * 500, Math.sin(angle) * 500);

    // Limpiar balas fuera de pantalla
    this.time.delayedCall(2000, () => {
      bullet.setActive(false).setVisible(false);
    });
  }
}