/**
 * entities/Weapon.ts — Arma del Jony: disparo con el catálogo REAL de Shrek.
 *
 * ⚠️ TERRITORIO DE SHREK — implementación base hecha por puck pilas
 * con aviso a Shrek. Shrek extiende: sonidos, partículas, game feel,
 * server sync.
 *
 * Soporta las stats del catálogo (systems/weapon-catalog.ts):
 *  - hitscan (rayo instantáneo) vs proyectil
 *  - pellets (escopeta w1), spread (w1, w4)
 *  - windup (sniper w3 — placeholder: pequeño delay antes del disparo)
 *  - explosionRadius (lanzagranadas w5)
 *  - fireRate (cooldown entre disparos) y reloadTime (recarga manual con R)
 *  - magSize (cargador): se agota y hay que recargar con R
 *
 * Colisión con paredes (PUCK main):
 *  - Los proyectiles se destruyen al chocar con una pared.
 *  - Los hitscan se cortan en la primera pared que atraviesan.
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
  /** Munición restante en el cargador */
  private ammo: number;

  constructor(scene: Phaser.Scene, config: WeaponConfig) {
    this.scene = scene;
    this.config = config;
    this.ammo = config.magSize;
  }

  get isReloading(): boolean {
    return this.reloading;
  }

  /** Munición restante en el cargador actual. */
  get ammoLeft(): number {
    return this.ammo;
  }

  /** Tamaño del cargador. */
  get magSize(): number {
    return this.config.magSize;
  }

  /** ¿Está vacío el cargador? */
  get isEmpty(): boolean {
    return this.ammo <= 0;
  }

  /** ¿Puede disparar ahora? (respeta fireRate, recarga y munición) */
  canFire(now: number): boolean {
    if (this.reloading) return false;
    if (this.ammo <= 0) return false;
    const interval = 1000 / this.config.fireRate;
    return now - this.lastFireAt >= interval;
  }

  /** Recarga manual (bloquea el disparo durante reloadTime). */
  reload(): void {
    if (this.reloading) return;
    if (this.ammo >= this.config.magSize) return; // ya está lleno
    this.reloading = true;
    playWeaponReload(this.scene);
    this.scene.time.delayedCall(this.config.reloadTime * 1000, () => {
      this.ammo = this.config.magSize;
      this.reloading = false;
    });
  }

  /**
   * Dispara desde (x, y) hacia `angle` (radianes).
   * `targets`: entidades dañables a comprobar (enemigos/dummies).
   * `walls`: rectángulos de pared (opcional) que bloquean el disparo.
   * `shooter`: quien dispara (se registra como killer en PLAYER_DIED).
   */
  fire(x: number, y: number, angle: number, targets: Damageable[], now: number, walls?: Phaser.GameObjects.Rectangle[], shooter: Damageable | null = null): void {
    if (!this.canFire(now)) return;
    this.lastFireAt = now;
    this.ammo--;

    const doShot = (): void => {
      if (this.config.hitscan) {
        this.fireHitscan(x, y, angle, targets, walls, shooter);
      } else {
        this.fireProjectile(x, y, angle, targets, walls, shooter);
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

private fireHitscan(x: number, y: number, angle: number, targets: Damageable[], walls?: Phaser.GameObjects.Rectangle[], shooter: Damageable | null = null): void {
    const { range, damage, tracer, spread, pellets } = this.config;
    const shots = pellets ?? 1;

    for (let i = 0; i < shots; i++) {
      const a = spread ? angle + Phaser.Math.FloatBetween(-spread, spread) : angle;
      let endX = x + Math.cos(a) * range;
      let endY = y + Math.sin(a) * range;

      // Cortar el rayo en la primera pared que atraviesa
      if (walls && walls.length > 0) {
        const hit = this.firstWallOnSegment(x, y, endX, endY, walls);
        if (hit) {
          endX = hit.x;
          endY = hit.y;
        }
      }

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
        const real = applyDamage(hit, damage, shooter);
        addPowerCharge(hit, real); // daño hecho carga la Super
        this.spawnHitSpark(hit.gameObject.x, hit.gameObject.y, tracer);
      }
    }
  }

  // ============================================================
  // Disparo con proyectil
  // ============================================================

private fireProjectile(x: number, y: number, angle: number, targets: Damageable[], walls?: Phaser.GameObjects.Rectangle[], shooter: Damageable | null = null): void {
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
          this.explode(proj.x, proj.y, explosionRadius, damage, targets, shooter);
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
            this.explode(proj.x, proj.y, explosionRadius, damage, targets, shooter);
          } else {
            const hit = this.nearestTarget(proj.x, proj.y, targets);
            if (hit) {
              const real = applyDamage(hit, damage, shooter);
              addPowerCharge(hit, real);
              this.spawnHitSpark(hit.gameObject.x, hit.gameObject.y, tracer);
            }
          }
          proj.destroy();
        },
      );

      // Colisión con paredes: el proyectil explota/se destruye al chocar
      if (walls && walls.length > 0) {
        this.scene.physics.add.collider(
          proj as unknown as Phaser.GameObjects.GameObject,
          walls,
          () => doExplode(),
        );
      }
    }
  }

  // ============================================================
  // Helpers
  // ============================================================

  /** Explosión en área (lanzagranadas w5). */
  private explode(x: number, y: number, radius: number, damage: number, targets: Damageable[], shooter: Damageable | null): void {
    playWeaponExplosion(this.scene);
    this.scene.add.circle(x, y, radius, Phaser.Display.Color.HexStringToColor('#f87171').color, 0.35).setDepth(4);
    for (const t of targets) {
      if (!t.alive) continue;
      const d = Phaser.Math.Distance.Between(x, y, t.gameObject.x, t.gameObject.y);
      if (d <= radius) {
        const real = applyDamage(t, damage, shooter);
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

  /** Punto de intersección de un segmento con la primera pared que cruza. */
  private firstWallOnSegment(
    x1: number, y1: number, x2: number, y2: number,
    walls: Phaser.GameObjects.Rectangle[],
  ): { x: number; y: number } | null {
    let best: { x: number; y: number } | null = null;
    let bestDist = Infinity;
    for (const w of walls) {
      const hit = this.segmentRectIntersection(x1, y1, x2, y2, w);
      if (hit) {
        const d = Phaser.Math.Distance.Between(x1, y1, hit.x, hit.y);
        if (d < bestDist) {
          bestDist = d;
          best = hit;
        }
      }
    }
    return best;
  }

  /** Intersección segmento-rectángulo (devuelve el punto más cercano al origen). */
  private segmentRectIntersection(
    x1: number, y1: number, x2: number, y2: number,
    rect: Phaser.GameObjects.Rectangle,
  ): { x: number; y: number } | null {
    const rx = rect.x - rect.width / 2;
    const ry = rect.y - rect.height / 2;
    const rw = rect.width;
    const rh = rect.height;

    // Lados del rectángulo
    const edges: Array<[number, number, number, number]> = [
      [rx, ry, rx + rw, ry], // top
      [rx, ry + rh, rx + rw, ry + rh], // bottom
      [rx, ry, rx, ry + rh], // left
      [rx + rw, ry, rx + rw, ry + rh], // right
    ];

    let best: { x: number; y: number } | null = null;
    let bestDist = Infinity;
    for (const [ex1, ey1, ex2, ey2] of edges) {
      const p = this.segmentIntersection(x1, y1, x2, y2, ex1, ey1, ex2, ey2);
      if (p) {
        const d = Phaser.Math.Distance.Between(x1, y1, p.x, p.y);
        if (d < bestDist) {
          bestDist = d;
          best = p;
        }
      }
    }
    return best;
  }

  /** Intersección de dos segmentos (o null si no se cruzan). */
  private segmentIntersection(
    x1: number, y1: number, x2: number, y2: number,
    x3: number, y3: number, x4: number, y4: number,
  ): { x: number; y: number } | null {
    const d = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(d) < 1e-9) return null;
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / d;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / d;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      return { x: x1 + t * (x2 - x1), y: y1 + t * (y2 - y1) };
    }
    return null;
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