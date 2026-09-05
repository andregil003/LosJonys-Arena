/**
 * entities/Weapon.ts — Arma del Jony: disparo con el catálogo REAL de Shrek.
 *
 * ⚠️ TERRITORIO DE SHREK — implementación base hecha por puck pilas
 * con aviso a Shrek. Shrek extiende: sonidos, partículas, game feel,
 * cargador real, server sync.
 *
 * Soporta las stats del catálogo (systems/weapon-catalog.ts):
 *  - hitscan (rayo instantáneo) vs proyectil
 *  - pellets (escopeta w1), spread (w1, w4)
 *  - windup (sniper w3 — placeholder: pequeño delay antes del disparo)
 *  - explosionRadius (lanzagranadas w5)
 *  - fireRate (cooldown entre disparos) y reloadTime (recarga manual con R)
 */

import Phaser from 'phaser';
import type { WeaponConfig } from '../systems/weapon-catalog';
import type { Damageable } from '../systems/combat';
import { applyDamage, addPowerCharge } from '../systems/combat';
import { playWeaponShot, playWeaponExplosion, playWeaponReload } from '../systems/weapon-sfx';

export class Weapon {
  readonly config: WeaponConfig;

  private scene: Phaser.Scene;
  private lastFireAt = 0;
  private reloading = false;

  constructor(scene: Phaser.Scene, config: WeaponConfig) {
    this.scene = scene;
    this.config = config;
  }

  get isReloading(): boolean {
    return this.reloading;
  }

  /** ¿Puede disparar ahora? (respeta fireRate y recarga) */
  canFire(now: number): boolean {
    if (this.reloading) return false;
    const interval = 1000 / this.config.fireRate;
    return now - this.lastFireAt >= interval;
  }

  /** Recarga manual (bloquea el disparo durante reloadTime). */
  reload(): void {
    if (this.reloading) return;
    this.reloading = true;
    playWeaponReload(this.scene);
    this.scene.time.delayedCall(this.config.reloadTime * 1000, () => {
      this.reloading = false;
    });
  }

  /**
   * Dispara desde (x, y) hacia `angle` (radianes).
   * `targets`: entidades dañables a comprobar (enemigos/dummies).
   */
  fire(x: number, y: number, angle: number, targets: Damageable[], now: number): void {
    if (!this.canFire(now)) return;
    this.lastFireAt = now;

    const doShot = (): void => {
      if (this.config.hitscan) {
        this.fireHitscan(x, y, angle, targets);
      } else {
        this.fireProjectile(x, y, angle, targets);
      }
      playWeaponShot(this.scene, this.config.id);
    };

    if (this.config.windup) {
      // El sonido del disparo sale al hacer el tiro (tras la preparación), no al cargar
      this.scene.time.delayedCall(this.config.windup * 1000, doShot);
      return;
    }

    doShot();
  }

  // ============================================================
  // Disparo hitscan (rayo instantáneo)
  // ============================================================

  private fireHitscan(x: number, y: number, angle: number, targets: Damageable[]): void {
    const { range, damage, tracer, spread, pellets } = this.config;
    const shots = pellets ?? 1;

    for (let i = 0; i < shots; i++) {
      const a = spread ? angle + Phaser.Math.FloatBetween(-spread, spread) : angle;
      const endX = x + Math.cos(a) * range;
      const endY = y + Math.sin(a) * range;

      // Tracer visual (línea que se desvanece)
      const line = this.scene.add
        .line(x, y, 0, 0, endX - x, endY - y, Phaser.Display.Color.HexStringToColor(tracer).color, 0.6)
        .setOrigin(0, 0)
        .setDepth(5);
      this.scene.tweens.add({
        targets: line,
        alpha: 0,
        duration: 120,
        onComplete: () => line.destroy(),
      });

      // Impacto: primer target cuyo círculo intersecta el segmento
      const hit = this.firstHitOnSegment(x, y, endX, endY, targets);
      if (hit) {
        const real = applyDamage(hit, damage);
        addPowerCharge(hit, real); // daño hecho carga la Super
        this.spawnHitSpark(hit.gameObject.x, hit.gameObject.y, tracer);
      }
    }
  }

  // ============================================================
  // Disparo con proyectil
  // ============================================================

  private fireProjectile(x: number, y: number, angle: number, targets: Damageable[]): void {
    const { projectileSpeed, range, damage, tracer, pellets, spread, explosionRadius } = this.config;
    const shots = pellets ?? 1;

    for (let i = 0; i < shots; i++) {
      const a = spread ? angle + Phaser.Math.FloatBetween(-spread, spread) : angle;

      // Proyectil placeholder (círculo pequeño con el color del tracer)
      const proj = this.scene.add.circle(x, y, 5, Phaser.Display.Color.HexStringToColor(tracer).color);
      proj.setDepth(5);
      this.scene.physics.add.existing(proj as unknown as Phaser.GameObjects.GameObject);
      const body = proj.body as Phaser.Physics.Arcade.Body;
      body.setVelocity(Math.cos(a) * projectileSpeed, Math.sin(a) * projectileSpeed);

      let exploded = false;
      const doExplode = (): void => {
        if (exploded) return;
        exploded = true;
        if (explosionRadius) {
          this.explode(proj.x, proj.y, explosionRadius, damage, targets);
        }
        proj.destroy();
      };

      // Vida útil = tiempo en recorrer el rango
      const lifeMs = (range / projectileSpeed) * 1000;
      this.scene.time.delayedCall(lifeMs, doExplode);

      // Colisión con targets (los dummies/enemigos tienen body estático)
      this.scene.physics.add.overlap(
        proj as unknown as Phaser.GameObjects.GameObject,
        targets.map((t) => t.gameObject),
        () => {
          if (exploded) return;
          exploded = true;
          if (explosionRadius) {
            this.explode(proj.x, proj.y, explosionRadius, damage, targets);
          } else {
            const hit = this.nearestTarget(proj.x, proj.y, targets);
            if (hit) {
              const real = applyDamage(hit, damage);
              addPowerCharge(hit, real);
              this.spawnHitSpark(hit.gameObject.x, hit.gameObject.y, tracer);
            }
          }
          proj.destroy();
        },
      );
    }
  }

  // ============================================================
  // Helpers
  // ============================================================

  /** Explosión en área (lanzagranadas w5). */
  private explode(x: number, y: number, radius: number, damage: number, targets: Damageable[]): void {
    playWeaponExplosion(this.scene);
    this.scene.add.circle(x, y, radius, Phaser.Display.Color.HexStringToColor('#f87171').color, 0.35).setDepth(4);
    for (const t of targets) {
      if (!t.alive) continue;
      const d = Phaser.Math.Distance.Between(x, y, t.gameObject.x, t.gameObject.y);
      if (d <= radius) {
        const real = applyDamage(t, damage);
        addPowerCharge(t, real);
      }
    }
  }

  /** Primer target (vivo) cuyo círculo intersecta el segmento, ordenado por distancia. */
  private firstHitOnSegment(x1: number, y1: number, x2: number, y2: number, targets: Damageable[]): Damageable | null {
    let best: Damageable | null = null;
    let bestDist = Infinity;
    for (const t of targets) {
      if (!t.alive) continue;
      const d = this.distanceToSegment(t.gameObject.x, t.gameObject.y, x1, y1, x2, y2);
      if (d <= 16 && d < bestDist) {
        bestDist = d;
        best = t;
      }
    }
    return best;
  }

  /** Target vivo más cercano a un punto. */
  private nearestTarget(x: number, y: number, targets: Damageable[]): Damageable | null {
    let best: Damageable | null = null;
    let bestDist = Infinity;
    for (const t of targets) {
      if (!t.alive) continue;
      const d = Phaser.Math.Distance.Between(x, y, t.gameObject.x, t.gameObject.y);
      if (d < bestDist) {
        bestDist = d;
        best = t;
      }
    }
    return best;
  }

  /** Distancia de un punto a un segmento. */
  private distanceToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Phaser.Math.Distance.Between(px, py, x1, y1);
    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Phaser.Math.Clamp(t, 0, 1);
    const cx = x1 + t * dx;
    const cy = y1 + t * dy;
    return Phaser.Math.Distance.Between(px, py, cx, cy);
  }

  /** Chispa de impacto (feedback visual básico). */
  private spawnHitSpark(x: number, y: number, color: string): void {
    const spark = this.scene.add.circle(x, y, 6, Phaser.Display.Color.HexStringToColor(color).color, 0.8).setDepth(6);
    this.scene.tweens.add({
      targets: spark,
      alpha: 0,
      scale: 2,
      duration: 200,
      onComplete: () => spark.destroy(),
    });
  }
}