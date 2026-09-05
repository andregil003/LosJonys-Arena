import Phaser from 'phaser';

/**
 * TuringBackground — Fondo animado de reacción-difusión (Gray-Scott / Turing patterns).
 *
 * Replica el efecto del `presentacion.html` de André:
 *  - Patrón orgánico que se mueve solo (no depende del mouse).
 *  - Aleatorio en cada carga (preset + sembrado aleatorios).
 *  - Acento cian #22d3ee sobre fondo oscuro #0f0f0f.
 *  - Respeta `prefers-reduced-motion` (se congela).
 *
 * Uso (dentro de una Scene):
 *   const bg = new TuringBackground(this, { alpha: 0.55 });
 *   bg.setDepth(-1000);
 *
 * Territorio: PUCK (UI / escenas).
 */
export class TuringBackground {
  private scene: Phaser.Scene;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private off: HTMLCanvasElement;
  private offCtx: CanvasRenderingContext2D;
  private imgData: ImageData;
  private textureKey: string;

  // Simulación Gray-Scott
  private N = 112; // resolución de la grilla
  private Du = 0.16;
  private Dv = 0.08;
  private dt = 1.0;
  private f = 0.055;
  private k = 0.062;
  private u!: Float32Array;
  private v!: Float32Array;
  private u2!: Float32Array;
  private v2!: Float32Array;

  private rafId = 0;
  private running = false;

  /** Acento RGB (cian #22d3ee por defecto) */
  private accent = { r: 34, g: 211, b: 238 };
  /** Alpha máximo del patrón sobre el fondo */
  private maxAlpha = 190;

  constructor(scene: Phaser.Scene, opts?: { accent?: string; maxAlpha?: number; alpha?: number }) {
    this.scene = scene;

    if (opts?.accent) {
      const c = Phaser.Display.Color.HexStringToColor(opts.accent);
      this.accent = { r: c.red, g: c.green, b: c.blue };
    }
    if (opts?.maxAlpha !== undefined) this.maxAlpha = opts.maxAlpha;

    // Crear canvas de fondo
    this.canvas = document.createElement('canvas');
    this.canvas.style.position = 'fixed';
    this.canvas.style.inset = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.zIndex = '0';
    this.canvas.style.pointerEvents = 'none';
    document.body.appendChild(this.canvas);

    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('No 2D context');
    this.ctx = ctx;

    // Canvas offscreen de baja resolución
    this.off = document.createElement('canvas');
    this.off.width = this.N;
    this.off.height = this.N;
    const offCtx = this.off.getContext('2d');
    if (!offCtx) throw new Error('No offscreen 2D context');
    this.offCtx = offCtx;
    this.imgData = offCtx.createImageData(this.N, this.N);

    // Texture key única por instancia
    this.textureKey = `turing-bg-${Phaser.Math.RND.uuid()}`;

    this.initSimulation();
    this.resize();
    window.addEventListener('resize', this.resize);

    // Respetar prefers-reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.renderOnce();
    } else {
      this.start();
    }
  }

  /** Presets del patrón (mismos que presentacion.html) */
  private pickPreset(): void {
    const PRESETS = [
      { f: 0.055, k: 0.062 }, // coral
      { f: 0.026, k: 0.055 }, // gusanos
      { f: 0.014, k: 0.054 }, // mitosis
      { f: 0.035, k: 0.065 }, // manchas
      { f: 0.018, k: 0.051 }, // agujeros
      { f: 0.030, k: 0.058 }, // laberinto
    ];
    const preset = PRESETS[Math.floor(Math.random() * PRESETS.length)];
    this.f = preset.f;
    this.k = preset.k;
  }

  private initSimulation(): void {
    this.pickPreset();
    const N = this.N;
    this.u = new Float32Array(N * N).fill(1);
    this.v = new Float32Array(N * N).fill(0);
    this.u2 = new Float32Array(N * N);
    this.v2 = new Float32Array(N * N);

    const idx = (x: number, y: number) => y * N + x;

    const seedBlob = (cx: number, cy: number, r: number) => {
      for (let y = -r; y <= r; y++) {
        for (let x = -r; x <= r; x++) {
          const d = Math.sqrt(x * x + y * y);
          if (d <= r) {
            const xi = ((cx + x) % N + N) % N;
            const yi = ((cy + y) % N + N) % N;
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
      seedBlob(
        Math.floor(Math.random() * N),
        Math.floor(Math.random() * N),
        3 + Math.floor(Math.random() * 5)
      );
    }
    for (let i = 0; i < N * N; i++) {
      if (Math.random() < 0.002) {
        this.v[i] = 0.4;
        this.u[i] = 0.4;
      }
    }
  }

  private step(): void {
    const N = this.N;
    const u = this.u, v = this.v, u2 = this.u2, v2 = this.v2;
    const Du = this.Du, Dv = this.Dv, dt = this.dt, f = this.f, k = this.k;
    const idx = (x: number, y: number) => y * N + x;

    for (let y = 0; y < N; y++) {
      const yN = (y - 1 + N) % N, yS = (y + 1) % N;
      for (let x = 0; x < N; x++) {
        const xW = (x - 1 + N) % N, xE = (x + 1) % N;
        const i = idx(x, y);
        const uC = u[i], vC = v[i];
        const lapU = u[idx(xW, y)] + u[idx(xE, y)] + u[idx(x, yN)] + u[idx(x, yS)] - 4 * uC;
        const lapV = v[idx(xW, y)] + v[idx(xE, y)] + v[idx(x, yN)] + v[idx(x, yS)] - 4 * vC;
        const reaction = uC * vC * vC;
        let nu = uC + (Du * lapU - reaction + f * (1 - uC)) * dt;
        let nv = vC + (Dv * lapV + reaction - (f + k) * vC) * dt;
        u2[i] = Math.min(1, Math.max(0, nu));
        v2[i] = Math.min(1, Math.max(0, nv));
      }
    }
    this.u = u2;
    this.v = v2;
    this.u2 = u;
    this.v2 = v;
  }

  private render(): void {
    const data = this.imgData.data;
    const { r, g, b } = this.accent;
    for (let i = 0; i < this.N * this.N; i++) {
      const val = Math.min(1, Math.max(0, this.v[i]));
      const p = i * 4;
      data[p] = r;
      data[p + 1] = g;
      data[p + 2] = b;
      data[p + 3] = Math.round(val * this.maxAlpha);
    }
    this.offCtx.putImageData(this.imgData, 0, 0);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.globalAlpha = 0.55;
    this.ctx.drawImage(this.off, 0, 0, this.N, this.N, 0, 0, this.canvas.width, this.canvas.height);
    this.ctx.globalAlpha = 1;
  }

  /** Renderiza un solo frame (para prefers-reduced-motion) */
  private renderOnce(): void {
    for (let s = 0; s < 8; s++) this.step();
    this.render();
  }

  private resize = (): void => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.canvas.style.width = window.innerWidth + 'px';
    this.canvas.style.height = window.innerHeight + 'px';
  };

  private loop = (): void => {
    if (!this.running) return;
    const STEPS_PER_FRAME = 8;
    for (let s = 0; s < STEPS_PER_FRAME; s++) this.step();
    this.render();
    this.rafId = requestAnimationFrame(this.loop);
  };

  start(): void {
    if (this.running) return;
    this.running = true;
    this.rafId = requestAnimationFrame(this.loop);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  /** Elimina el canvas y libera recursos. Llamar al salir de la escena. */
  destroy(): void {
    this.stop();
    window.removeEventListener('resize', this.resize);
    this.canvas.remove();
  }
}
