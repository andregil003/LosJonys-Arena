/**
 * systems/backgrounds.ts — Fondos animados para la arena y la carga (Shrek).
 *
 * Porta a Phaser los 5 fondos HTML del equipo (client/public/assets/backgrounds/)
 * como CanvasTexture animada (una por efecto, sin preload: todo procedural).
 *
 * Reglas (definidas por André):
 *  - LOADING_BACKGROUND ('data-rain') → FIJO en pantalla de carga y el inicio (menú).
 *  - ARENA_BACKGROUNDS → ROTATIVOS durante la partida (cada ARENA_BG_ROTATE_MS).
 *
 * Integración (PUCK):
 *  - MenuScene / pantalla de carga:  BackgroundSystem.installLoading(this)
 *  - GameScene (create):             BackgroundSystem.installArena(this)
 *  No requiere preload. El fondo se dibuja solo (listener 'update' de la escena).
 */

import Phaser from 'phaser';

export type BackgroundKind =
  | 'data-rain'
  | 'cyberpunk-conway'
  | 'circuit-traces'
  | 'gray-scott';

/** Fondo FIJO de carga y del inicio. */
export const LOADING_BACKGROUND: BackgroundKind = 'data-rain';

/** Fondos ROTATIVOS dentro de la arena. */
export const ARENA_BACKGROUNDS: BackgroundKind[] = [
  'cyberpunk-conway',
  'circuit-traces',
  'gray-scott',
];

/** Tiempo de rotación de fondo en la arena (ms). */
export const ARENA_BG_ROTATE_MS = 30000;

export interface BgEffect {
  readonly key: BackgroundKind;
  /** (Re)inicializa el estado del efecto para el tamaño w×h de la textura. */
  init(w: number, h: number): void;
  /** Pinta un frame sobre la textura. dt en segundos. */
  draw(ctx: CanvasRenderingContext2D, w: number, h: number, dt: number): void;
}

function rand<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ============================================================
// 1) DATA RAIN — lluvia de datos (katakana + hex + binario)
//    Fijo en carga / inicio.
// ============================================================

const KATAKANA = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
const HEX = '0123456789ABCDEF';
const RAIN_CHARS = [...KATAKANA, ...HEX, ...HEX, ...'010101'];

class DataRainEffect implements BgEffect {
  readonly key: BackgroundKind = 'data-rain';
  private cols = 0;
  private font = 16;
  private drops: number[] = [];
  private speeds: number[] = [];
  private nextChar: string[] = [];
  private lastSwap: number[] = [];

  init(w: number, h: number): void {
    this.font = 16;
    this.cols = Math.ceil(w / this.font);
    this.drops = [];
    this.speeds = [];
    this.nextChar = [];
    this.lastSwap = [];
    for (let i = 0; i < this.cols; i++) {
      this.drops.push(Math.random() * (h / this.font) * -1);
      this.speeds.push(0.25 + Math.random() * 0.9);
      this.nextChar.push(rand(RAIN_CHARS));
      this.lastSwap.push(Math.floor(Math.random() * 20));
    }
  }

  draw(ctx: CanvasRenderingContext2D, w: number, h: number, _dt: number): void {
    // velo semitransparente → estela de desvanecido
    ctx.fillStyle = 'rgba(8,11,10,0.13)';
    ctx.fillRect(0, 0, w, h);
    ctx.font = `${this.font}px monospace`;
    ctx.textBaseline = 'top';

    for (let i = 0; i < this.cols; i++) {
      const x = i * this.font;
      const y = this.drops[i] * this.font;

      if (y >= -this.font && y < h) {
        ctx.fillStyle = 'rgba(220,255,245,0.95)';
        ctx.fillText(this.nextChar[i], x, y);
      }
      for (let k = 1; k <= 3; k++) {
        const ty = y - k * this.font;
        if (ty < 0 || ty > h) continue;
        const alpha = 0.5 - k * 0.13;
        if (alpha <= 0) continue;
        ctx.fillStyle = `rgba(90,255,200,${alpha})`;
        ctx.fillText(rand(RAIN_CHARS), x, ty);
      }

      this.drops[i] += this.speeds[i];
      this.lastSwap[i]--;
      if (this.lastSwap[i] <= 0) {
        this.nextChar[i] = rand(RAIN_CHARS);
        this.lastSwap[i] = 4 + Math.floor(Math.random() * 14);
      }
      if (y > h + this.font * 4) {
        this.drops[i] = -(Math.random() * 10);
        this.speeds[i] = 0.25 + Math.random() * 0.9;
      }
    }
  }
}

// ============================================================
// 2) CYBERPUNK CONWAY — autómata celular con rastro neón
// ============================================================

const GLIDER: ReadonlyArray<readonly [number, number]> = [[1, 0], [2, 1], [0, 2], [1, 2], [2, 2]];
const R_PENTOMINO: ReadonlyArray<readonly [number, number]> = [[1, 0], [2, 0], [0, 1], [1, 1], [1, 2]];

class CyberpunkConwayEffect implements BgEffect {
  readonly key: BackgroundKind = 'cyberpunk-conway';
  private N = 88;
  private cell = new Uint8Array(0);
  private next = new Uint8Array(0);
  private age = new Float32Array(0);
  private off: HTMLCanvasElement | null = null;
  private acc = 0;
  private stableFrames = 0;
  private prevPop = -1;
  private img: ImageData | null = null;

  init(w: number, h: number): void {
    const N = this.N;
    this.cell = new Uint8Array(N * N);
    this.next = new Uint8Array(N * N);
    this.age = new Float32Array(N * N);
    this.acc = 0;
    this.stableFrames = 0;
    this.prevPop = -1;
    this.off = document.createElement('canvas');
    this.off.width = N;
    this.off.height = N;
    this.img = new ImageData(N, N);
    this.seed();
    void w;
    void h;
  }

  private idx(x: number, y: number): number {
    return y * this.N + x;
  }

  private stamp(pattern: ReadonlyArray<readonly [number, number]>, ox: number, oy: number): void {
    for (const [dx, dy] of pattern) {
      const xi = (((ox + dx) % this.N) + this.N) % this.N;
      const yi = (((oy + dy) % this.N) + this.N) % this.N;
      this.cell[this.idx(xi, yi)] = 1;
    }
  }

  private seed(): void {
    this.cell.fill(0);
    for (let i = 0; i < this.N * this.N; i++) {
      this.cell[i] = Math.random() < 0.07 ? 1 : 0;
    }
    const patterns = 3 + Math.floor(Math.random() * 4);
    for (let p = 0; p < patterns; p++) {
      this.stamp(Math.random() < 0.5 ? GLIDER : R_PENTOMINO, Math.floor(Math.random() * this.N), Math.floor(Math.random() * this.N));
    }
    this.stableFrames = 0;
    this.prevPop = -1;
  }

  private step(): void {
    const N = this.N;
    let population = 0;
    for (let y = 0; y < N; y++) {
      const yN = (y - 1 + N) % N;
      const yS = (y + 1) % N;
      for (let x = 0; x < N; x++) {
        const xW = (x - 1 + N) % N;
        const xE = (x + 1) % N;
        const i = this.idx(x, y);
        const n =
          this.cell[this.idx(xW, yN)] + this.cell[this.idx(x, yN)] + this.cell[this.idx(xE, yN)] +
          this.cell[this.idx(xW, y)] + this.cell[this.idx(xE, y)] +
          this.cell[this.idx(xW, yS)] + this.cell[this.idx(x, yS)] + this.cell[this.idx(xE, yS)];
        const alive = this.cell[i] === 1;
        const willLive = alive ? n === 2 || n === 3 : n === 3;
        this.next[i] = willLive ? 1 : 0;
        if (willLive) {
          population++;
          this.age[i] = Math.min(1, this.age[i] + 0.55);
        } else {
          this.age[i] *= 0.9;
        }
      }
    }
    const swap = this.cell;
    this.cell = this.next;
    this.next = swap;
    if (population === this.prevPop) this.stableFrames++;
    else this.stableFrames = 0;
    this.prevPop = population;
    if (this.stableFrames > 40 || population < N * N * 0.01) this.seed();
  }

  draw(ctx: CanvasRenderingContext2D, w: number, h: number, dt: number): void {
    this.acc += dt * 1000;
    while (this.acc >= 90) {
      this.step();
      this.acc -= 90;
    }
    const N = this.N;
    const data = this.img!.data;
    for (let i = 0; i < N * N; i++) {
      const a = this.age[i];
      const t = 1 - a;
      const p = i * 4;
      data[p] = Math.round(34 + t * (255 - 34));
      data[p + 1] = Math.round(211 * (1 - t) + 20 * t);
      data[p + 2] = 235;
      data[p + 3] = Math.round(a * 235);
    }
    const offCtx = this.off!.getContext('2d')!;
    offCtx.putImageData(this.img!, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 0.6;
    ctx.drawImage(this.off!, 0, 0, N, N, 0, 0, w, h);
    ctx.globalAlpha = 1;
  }
}

// ============================================================
// 3) CIRCUIT TRACES — pistas de placa con pulsos de luz
// ============================================================

const DIRS8: ReadonlyArray<readonly [number, number]> = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
const TURN_OPTS = [0, 1, -1, 2, -2];
const TURN_WEIGHTS = [0.45, 0.2, 0.2, 0.075, 0.075];

interface Trace {
  points: { x: number; y: number }[];
  cum: number[];
  total: number;
  rgb: [number, number, number];
}

interface Pulse {
  traceIndex: number;
  t: number;
  speed: number;
  delay: number;
  trail: { x: number; y: number }[];
}

class CircuitTracesEffect implements BgEffect {
  readonly key: BackgroundKind = 'circuit-traces';
  private traces: Trace[] = [];
  private pulses: Pulse[] = [];

  init(w: number, h: number): void {
    this.traces = this.generateTraces(w, h);
    this.pulses = [];
    const numPulses = Math.min(18, Math.round(this.traces.length * 0.6));
    for (let i = 0; i < numPulses; i++) this.spawnPulse(Math.random() * 3);
  }

  private weightedPick(opts: number[], weights: number[]): number {
    let r = Math.random();
    for (let i = 0; i < opts.length; i++) {
      if (r < weights[i]) return opts[i];
      r -= weights[i];
    }
    return opts[0];
  }

  private generateTraces(w: number, h: number): Trace[] {
    const cellSize = Math.max(22, Math.min(36, Math.floor(w / 40)));
    const cols = Math.ceil(w / cellSize);
    const rows = Math.ceil(h / cellSize);
    const density = (w * h) / (900 * 600);
    const numTraces = Math.round(10 + density * 10);
    const result: Trace[] = [];

    for (let t = 0; t < numTraces; t++) {
      let gx = Math.floor(Math.random() * cols);
      let gy = Math.floor(Math.random() * rows);
      let dirIdx = Math.floor(Math.random() * 8);
      const pts = [{ x: gx * cellSize, y: gy * cellSize }];
      const segCount = 7 + Math.floor(Math.random() * 10);

      for (let s = 0; s < segCount; s++) {
        const turn = this.weightedPick(TURN_OPTS, TURN_WEIGHTS);
        dirIdx = ((dirIdx + turn) % 8 + 8) % 8;
        const [dx, dy] = DIRS8[dirIdx];
        const segLen = 1 + Math.floor(Math.random() * 4);
        gx += dx * segLen;
        gy += dy * segLen;
        if (gx < 0 || gx > cols || gy < 0 || gy > rows) break;
        pts.push({ x: gx * cellSize, y: gy * cellSize });
      }
      if (pts.length < 2) continue;

      const cum = [0];
      for (let i = 1; i < pts.length; i++) {
        const dx = pts[i].x - pts[i - 1].x;
        const dy = pts[i].y - pts[i - 1].y;
        cum.push(cum[i - 1] + Math.sqrt(dx * dx + dy * dy));
      }
      result.push({
        points: pts,
        cum,
        total: cum[cum.length - 1],
        rgb: Math.random() < 0.22 ? [255, 45, 149] : [34, 211, 238],
      });
    }
    return result;
  }

  private spawnPulse(delay: number): void {
    if (this.traces.length === 0) return;
    this.pulses.push({
      traceIndex: Math.floor(Math.random() * this.traces.length),
      t: 0,
      speed: 0.09 + Math.random() * 0.14,
      delay: delay || 0,
      trail: [],
    });
  }

  private pointAtT(tr: Trace, t: number): { x: number; y: number } {
    const target = Math.max(0, Math.min(1, t)) * tr.total;
    for (let i = 1; i < tr.cum.length; i++) {
      if (target <= tr.cum[i] || i === tr.cum.length - 1) {
        const segStart = tr.cum[i - 1];
        const segEnd = tr.cum[i];
        const localT = segEnd > segStart ? (target - segStart) / (segEnd - segStart) : 0;
        const p0 = tr.points[i - 1];
        const p1 = tr.points[i];
        return { x: p0.x + (p1.x - p0.x) * localT, y: p0.y + (p1.y - p0.y) * localT };
      }
    }
    return tr.points[tr.points.length - 1];
  }

  private drawStatic(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.clearRect(0, 0, w, h);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    for (const tr of this.traces) {
      const [r, g, b] = tr.rgb;
      ctx.beginPath();
      tr.points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.strokeStyle = `rgba(${r},${g},${b},0.10)`;
      ctx.lineWidth = 6;
      ctx.shadowColor = `rgba(${r},${g},${b},0.6)`;
      ctx.shadowBlur = 12;
      ctx.stroke();

      ctx.beginPath();
      tr.points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.strokeStyle = `rgba(${r},${g},${b},0.35)`;
      ctx.lineWidth = 1.6;
      ctx.shadowBlur = 0;
      ctx.stroke();

      for (let i = 0; i < tr.points.length; i++) {
        const p = tr.points[i];
        const isEnd = i === 0 || i === tr.points.length - 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, isEnd ? 3.2 : 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${isEnd ? 0.55 : 0.3})`;
        ctx.fill();
      }
    }
  }

  private drawPulses(ctx: CanvasRenderingContext2D): void {
    for (const pu of this.pulses) {
      if (pu.delay > 0) continue;
      const tr = this.traces[pu.traceIndex];
      const [r, g, b] = tr.rgb;
      for (let i = pu.trail.length - 1; i >= 0; i--) {
        const p = pu.trail[i];
        const alpha = (1 - i / pu.trail.length) * 0.8;
        const rad = 3.2 * (1 - (i / pu.trail.length) * 0.6);
        ctx.beginPath();
        ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.shadowColor = `rgba(${r},${g},${b},0.9)`;
        ctx.shadowBlur = 10;
        ctx.fill();
      }
      if (pu.trail.length) {
        const head = pu.trail[0];
        ctx.beginPath();
        ctx.arc(head.x, head.y, 2.4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.shadowColor = `rgba(${r},${g},${b},1)`;
        ctx.shadowBlur = 14;
        ctx.fill();
      }
    }
    ctx.shadowBlur = 0;
  }

  draw(ctx: CanvasRenderingContext2D, w: number, h: number, dt: number): void {
    for (const pu of this.pulses) {
      if (pu.delay > 0) {
        pu.delay -= dt;
        continue;
      }
      pu.t += pu.speed * dt;
      const tr = this.traces[pu.traceIndex];
      const pos = this.pointAtT(tr, pu.t);
      pu.trail.unshift(pos);
      if (pu.trail.length > 14) pu.trail.pop();
      if (pu.t >= 1) {
        pu.t = 0;
        pu.trail = [];
        pu.delay = 0.4 + Math.random() * 2.5;
        pu.traceIndex = Math.floor(Math.random() * this.traces.length);
      }
    }
    this.drawStatic(ctx, w, h);
    this.drawPulses(ctx);
  }
}

// ============================================================
// 4) GRAY-SCOTT — reacción-difusión (patrón cambiante)
// ============================================================

interface GsPreset {
  f: number;
  k: number;
}

const GS_PRESETS: ReadonlyArray<GsPreset> = [
  { f: 0.055, k: 0.062 },
  { f: 0.026, k: 0.055 },
  { f: 0.014, k: 0.054 },
  { f: 0.035, k: 0.065 },
  { f: 0.018, k: 0.051 },
  { f: 0.03, k: 0.058 },
];

class GrayScottEffect implements BgEffect {
  readonly key: BackgroundKind = 'gray-scott';
  private N = 112;
  private u = new Float32Array(0);
  private v = new Float32Array(0);
  private u2 = new Float32Array(0);
  private v2 = new Float32Array(0);
  private off: HTMLCanvasElement | null = null;
  private img: ImageData | null = null;
  private f = 0.055;
  private k = 0.062;

  init(w: number, h: number): void {
    const N = this.N;
    const preset = rand(GS_PRESETS);
    this.f = preset.f;
    this.k = preset.k;
    this.u = new Float32Array(N * N).fill(1);
    this.v = new Float32Array(N * N).fill(0);
    this.u2 = new Float32Array(N * N);
    this.v2 = new Float32Array(N * N);
    this.off = document.createElement('canvas');
    this.off.width = N;
    this.off.height = N;
    this.img = new ImageData(N, N);

    const idx = (x: number, y: number): number => y * N + x;
    const seedBlob = (cx: number, cy: number, r: number): void => {
      for (let y = -r; y <= r; y++) {
        for (let x = -r; x <= r; x++) {
          const d = Math.sqrt(x * x + y * y);
          if (d <= r) {
            const xi = (((cx + x) % N) + N) % N;
            const yi = (((cy + y) % N) + N) % N;
            const i = idx(xi, yi);
            const jitter = 0.85 + Math.random() * 0.3;
            this.u[i] = 0.5 * jitter;
            this.v[i] = 0.25 * jitter;
          }
        }
      }
    };
    const numBlobs = 5 + Math.floor(Math.random() * 6);
    for (let b = 0; b < numBlobs; b++) {
      seedBlob(Math.floor(Math.random() * N), Math.floor(Math.random() * N), 3 + Math.floor(Math.random() * 5));
    }
    for (let i = 0; i < N * N; i++) {
      if (Math.random() < 0.002) {
        this.v[i] = 0.4;
        this.u[i] = 0.4;
      }
    }
    void w;
    void h;
  }

  private step(): void {
    const N = this.N;
    const Du = 0.16;
    const Dv = 0.08;
    for (let y = 0; y < N; y++) {
      const yN = (y - 1 + N) % N;
      const yS = (y + 1) % N;
      for (let x = 0; x < N; x++) {
        const xW = (x - 1 + N) % N;
        const xE = (x + 1) % N;
        const i = y * N + x;
        const uC = this.u[i];
        const vC = this.v[i];
        const lapU = this.u[y * N + xW] + this.u[y * N + xE] + this.u[yN * N + x] + this.u[yS * N + x] - 4 * uC;
        const lapV = this.v[y * N + xW] + this.v[y * N + xE] + this.v[yN * N + x] + this.v[yS * N + x] - 4 * vC;
        const reaction = uC * vC * vC;
        this.u2[i] = Math.min(1, Math.max(0, uC + (Du * lapU - reaction + this.f * (1 - uC))));
        this.v2[i] = Math.min(1, Math.max(0, vC + (Dv * lapV + reaction - (this.f + this.k) * vC)));
      }
    }
    const su = this.u;
    this.u = this.u2;
    this.u2 = su;
    const sv = this.v;
    this.v = this.v2;
    this.v2 = sv;
  }

  draw(ctx: CanvasRenderingContext2D, w: number, h: number, _dt: number): void {
    for (let s = 0; s < 8; s++) this.step();
    const N = this.N;
    const data = this.img!.data;
    for (let i = 0; i < N * N; i++) {
      const val = Math.min(1, Math.max(0, this.v[i]));
      const p = i * 4;
      data[p] = 34;
      data[p + 1] = 211;
      data[p + 2] = 238;
      data[p + 3] = Math.round(val * 190);
    }
    const offCtx = this.off!.getContext('2d')!;
    offCtx.putImageData(this.img!, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = true;
    ctx.globalAlpha = 0.55;
    ctx.drawImage(this.off!, 0, 0, N, N, 0, 0, w, h);
    ctx.globalAlpha = 1;
  }
}

// ============================================================
// Sistema de fondos (singleton)
// ============================================================

const EFFECTS: Record<BackgroundKind, () => BgEffect> = {
  'data-rain': () => new DataRainEffect(),
  'cyberpunk-conway': () => new CyberpunkConwayEffect(),
  'circuit-traces': () => new CircuitTracesEffect(),
  'gray-scott': () => new GrayScottEffect(),
};

class BackgroundSystemImpl {
  private scene: Phaser.Scene | null = null;
  private image: Phaser.GameObjects.Image | null = null;
  private textureKey = '__arena_bg';
  private effect: BgEffect | null = null;
  private effectKey: BackgroundKind | null = null;
  private rotateEveryMs = 0;
  private nextRotateAt = 0;
  private w = 0;
  private h = 0;
  private fading = false;

  /** Fondo FIJO (data-rain) para pantalla de carga / inicio. */
  installLoading(scene: Phaser.Scene): void {
    this.install(scene, LOADING_BACKGROUND, 0);
  }

  /** Fondos rotativos para la arena (cada rotateEveryMs). */
  installArena(scene: Phaser.Scene, rotateEveryMs: number = 30000): void {
    const start = rand(ARENA_BACKGROUNDS);
    this.install(scene, start, rotateEveryMs);
  }

  private install(scene: Phaser.Scene, kind: BackgroundKind, rotateEveryMs: number): void {
    this.detach();
    this.scene = scene;
    this.w = scene.scale.width;
    this.h = scene.scale.height;
    this.rotateEveryMs = rotateEveryMs;
    this.nextRotateAt = this.rotateEveryMs > 0 ? Date.now() + this.rotateEveryMs : 0;

    if (scene.textures.exists(this.textureKey)) {
      scene.textures.remove(this.textureKey);
    }
    scene.textures.createCanvas(this.textureKey, this.w, this.h);

    this.image = scene.add.image(0, 0, this.textureKey).setOrigin(0, 0).setDepth(-1000).setScrollFactor(0);

    this.setEffect(kind);
    scene.events.on('update', this.onUpdate);
    scene.events.once('shutdown', this.detach);
  }

  private setEffect(kind: BackgroundKind): void {
    this.effectKey = kind;
    this.effect = EFFECTS[kind]();
    this.effect.init(this.w, this.h);
    if (this.scene && this.texture) {
      this.effect.draw(this.texture.context, this.w, this.h, 0.016);
      this.texture.refresh();
    }
  }

  private get texture(): Phaser.Textures.CanvasTexture | null {
    if (!this.scene) return null;
    const tex = this.scene.textures.get(this.textureKey);
    return tex instanceof Phaser.Textures.CanvasTexture ? tex : null;
  }

  private onUpdate = (_time: number, delta: number): void => {
    if (!this.scene || !this.effect) return;
    const tex = this.texture;
    if (!tex) return;
    this.effect.draw(tex.context, this.w, this.h, delta / 1000);
    tex.refresh();

    if (this.rotateEveryMs > 0 && !this.fading && Date.now() >= this.nextRotateAt) {
      this.rotate();
    }
  };

  private rotate(): void {
    if (!this.effectKey || !this.image) return;
    const list = ARENA_BACKGROUNDS;
    const idx = list.indexOf(this.effectKey);
    const next = list[(idx + 1) % list.length];
    this.nextRotateAt = Date.now() + this.rotateEveryMs;
    this.fading = true;

    this.image.alpha = 0;
    this.setEffect(next);
    this.scene?.tweens.add({
      targets: this.image,
      alpha: 1,
      duration: 400,
      onComplete: () => {
        this.fading = false;
      },
    });
  }

  detach(): void {
    if (!this.scene) return;
    this.scene.events.off('update', this.onUpdate);
    this.scene.events.off('shutdown', this.detach);
    this.image?.destroy();
    this.image = null;
    this.scene = null;
    this.effect = null;
    this.effectKey = null;
  }
}

export const BackgroundSystem = new BackgroundSystemImpl();