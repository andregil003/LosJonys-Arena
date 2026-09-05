// Generador de SFX procedurales para LosJonys Arena (placeholder/candidatos).
// Uso: node sfxgen/generate.cjs
// Base: jsfxr (https://github.com/chr15m/jsfxr) — sintetizador estilo sfxr.
// Mapeo de frecuencia: f = 3528 * (p_base_freq^2 + 0.001) Hz (aprox, con oversampling x8).
// Formas de onda: 0=square, 1=sawtooth, 2=sine, 3=noise.
// ¡OJO! Envelope de jsfxr: duracion_stage = p^2 * 100000 muestras (= p^2 * 2.27 s a 44.1kHz).
//   Para durar T segundos en un stage: p = sqrt(T * 0.441).

const { sfxr } = require("jsfxr");
const fs = require("fs");
const path = require("path");

const OUT_DIR = path.join(__dirname, "..", "..", "client", "public", "assets", "audio", "preview");

const DEFAULTS = {
  wave_type: 2,
  p_env_attack: 0,
  p_env_sustain: 0.2,
  p_env_punch: 0,
  p_env_decay: 0.3,
  p_base_freq: 0.35,
  p_freq_limit: 0,
  p_freq_ramp: 0,
  p_freq_dramp: 0,
  p_vib_strength: 0,
  p_vib_speed: 0,
  p_arp_mod: 0,
  p_arp_speed: 0,
  p_duty: 0.5,
  p_duty_ramp: 0,
  p_repeat_speed: 0,
  p_pha_offset: 0,
  p_pha_ramp: 0,
  p_lpf_freq: 1,
  p_lpf_ramp: 0,
  p_lpf_resonance: 0,
  p_hpf_freq: 0,
  p_hpf_ramp: 0,
  sound_vol: 0.55,
  sample_rate: 44100,
  sample_size: 16,
};

const mk = (over) => ({ ...DEFAULTS, ...over });

// Duración real ≈ (p_sustain^2 + p_decay^2 + p_attack^2) * 2.27 s (con repeats se alarga más).
// Targets: clicks ~100ms · disparos 150-300ms · explosiones 700-900ms · cargas/sostenidos 700-1100ms.
const DESIGNS = {
  // ─── ARMAS ───────────────────────────────────────────────
  "weapon-shotgun": mk({           // boom grave ~380ms
    wave_type: 3, p_base_freq: 0.22, p_env_sustain: 0.3, p_env_decay: 0.45,
    p_env_punch: 0.5, p_freq_ramp: -0.2, p_lpf_freq: 0.8, sound_vol: 0.5,
  }),
  "weapon-rifle": mk({             // crack seco ~200ms
    wave_type: 3, p_base_freq: 0.3, p_env_sustain: 0.12, p_env_decay: 0.3,
    p_freq_ramp: -0.3, p_lpf_freq: 0.9, sound_vol: 0.42,
  }),
  "weapon-sniper-windup": mk({     // silbido ascendente ~750ms
    wave_type: 2, p_base_freq: 0.35, p_freq_ramp: 0.4, p_env_sustain: 0.58,
    p_env_decay: 0.15, p_vib_strength: 0.15, p_vib_speed: 0.4,
    p_lpf_freq: 0.5, sound_vol: 0.35,
  }),
  "weapon-sniper-shot": mk({       // UN solo disparo MUY fuerte: crack seco + cola grave ~930ms
    wave_type: 3, p_base_freq: 0.18, p_env_sustain: 0.4, p_env_decay: 0.5,
    p_env_punch: 0.75, p_freq_ramp: -0.6, p_lpf_freq: 1, sound_vol: 0.7,
  }),
  "weapon-smg": mk({               // ráfaga rápida ~250ms (repeats)
    wave_type: 3, p_base_freq: 0.38, p_env_sustain: 0.08, p_env_decay: 0.3,
    p_repeat_speed: 0.82, p_lpf_freq: 0.85, sound_vol: 0.38,
  }),
  "weapon-grenade-launch": mk({    // pop de tubo ~130ms
    wave_type: 2, p_base_freq: 0.2, p_freq_ramp: 0.25, p_env_sustain: 0.08,
    p_env_decay: 0.3, p_lpf_freq: 0.6, sound_vol: 0.4,
  }),
  "weapon-grenade-explosion": mk({ // boom en área ~900ms
    wave_type: 3, p_base_freq: 0.12, p_env_sustain: 0.4, p_env_decay: 0.6,
    p_env_punch: 0.5, p_freq_ramp: -0.25, p_repeat_speed: 0.25,
    p_lpf_freq: 0.6, sound_vol: 0.55,
  }),

  // ─── CUCHILLO ────────────────────────────────────────────
  "knife-swing": mk({              // whoosh ~300ms
    wave_type: 3, p_base_freq: 0.3, p_freq_ramp: 0.5, p_env_sustain: 0.1,
    p_env_decay: 0.4, p_lpf_freq: 0.35, p_hpf_freq: 0.1, sound_vol: 0.4,
  }),
  "knife-hit": mk({                // golpe seco ~250ms
    wave_type: 3, p_base_freq: 0.28, p_env_sustain: 0.1, p_env_decay: 0.36,
    p_env_punch: 0.3, p_freq_ramp: -0.15, p_lpf_freq: 0.7, sound_vol: 0.45,
  }),

  // ─── PODERES ─────────────────────────────────────────────
  "power-kamehameha-charge": mk({  // carga ascendente ~1100ms
    wave_type: 0, p_base_freq: 0.15, p_freq_ramp: 0.35, p_env_sustain: 0.68,
    p_env_decay: 0.1, p_vib_strength: 0.3, p_vib_speed: 0.4, p_arp_mod: 0.2,
    p_arp_speed: 0.5, p_lpf_freq: 0.5, sound_vol: 0.45,
  }),
  "power-kamehameha-beam": mk({    // rayo sostenido ~1000ms
    wave_type: 1, p_base_freq: 0.4, p_freq_ramp: 0.1, p_env_sustain: 0.64,
    p_env_decay: 0.2, p_vib_strength: 0.2, p_vib_speed: 0.3, p_repeat_speed: 0.2,
    p_lpf_freq: 0.8, sound_vol: 0.5,
  }),
  "power-kamehameha-impact": mk({  // explosión final ~800ms
    wave_type: 3, p_base_freq: 0.2, p_env_sustain: 0.4, p_env_decay: 0.56,
    p_env_punch: 0.5, p_freq_ramp: -0.3, p_lpf_freq: 0.7, sound_vol: 0.55,
  }),
  "power-dash": mk({               // ZAZ: barrido agudo ascendente, como cuerda girando a toda velocidad ~210ms
    wave_type: 3, p_base_freq: 0.55, p_freq_ramp: 0.75, p_env_sustain: 0.05,
    p_env_decay: 0.3, p_lpf_freq: 0.55, p_hpf_freq: 0.12, sound_vol: 0.6,
  }),
  "power-shield": mk({             // shimmer brillante ~350ms
    wave_type: 2, p_base_freq: 0.45, p_env_sustain: 0.14, p_env_decay: 0.4,
    p_vib_strength: 0.4, p_vib_speed: 0.5, p_lpf_freq: 0.9, sound_vol: 0.42,
  }),
  "power-shield-block": mk({       // impacto amortiguado ~180ms
    wave_type: 3, p_base_freq: 0.25, p_env_sustain: 0.08, p_env_decay: 0.32,
    p_lpf_freq: 0.25, sound_vol: 0.4,
  }),
  "power-ceguera-launch": mk({     // HUMO: masa grave que avanza hacia adelante, whoosh creciente amortiguado ~700ms
    wave_type: 3, p_base_freq: 0.18, p_freq_ramp: 0.35, p_env_sustain: 0.35,
    p_env_decay: 0.4, p_lpf_freq: 0.25, p_hpf_freq: 0.05, sound_vol: 0.6,
  }),
  "power-ceguera-hit": mk({        // puff de humo que se expande ~690ms
    wave_type: 3, p_base_freq: 0.2, p_freq_ramp: 0.15, p_env_sustain: 0.32,
    p_env_decay: 0.45, p_repeat_speed: 0.28, p_lpf_freq: 0.2, sound_vol: 0.55,
  }),
  "power-teleport-mark": mk({      // ping de marca ~280ms
    wave_type: 2, p_base_freq: 0.5, p_freq_ramp: 0.2, p_env_sustain: 0.12,
    p_env_decay: 0.37, p_vib_strength: 0.25, p_vib_speed: 0.4, sound_vol: 0.42,
  }),
  "power-teleport-return": mk({    // whoosh de retorno ~320ms
    wave_type: 3, p_base_freq: 0.4, p_freq_ramp: -0.4, p_env_sustain: 0.14,
    p_env_decay: 0.39, p_lpf_freq: 0.5, sound_vol: 0.42,
  }),

  // ─── JUGADOR ─────────────────────────────────────────────
  "player-hurt": mk({              // PUM suave: algo pegó pero suavecito ~200ms
    wave_type: 3, p_base_freq: 0.25, p_env_sustain: 0.04, p_env_decay: 0.3,
    p_env_punch: 0.35, p_freq_ramp: -0.2, p_lpf_freq: 0.5, sound_vol: 0.55,
  }),
  "player-death": mk({             // CAÍDA: thud grave retumbante, alguien se cae al piso ~780ms
    wave_type: 3, p_base_freq: 0.1, p_env_sustain: 0.2, p_env_decay: 0.55,
    p_env_punch: 0.8, p_freq_ramp: -0.2, p_repeat_speed: 0.3, p_lpf_freq: 0.5,
    sound_vol: 0.7,
  }),
  "player-power-ready": mk({       // CHECK: ding claro ascendente (do→sol) ~350ms
    wave_type: 2, p_base_freq: 0.42, p_freq_ramp: 0.1, p_env_sustain: 0.1,
    p_env_decay: 0.38, p_arp_mod: 0.4, p_arp_speed: 0.35, p_vib_strength: 0.1,
    p_lpf_freq: 0.9, sound_vol: 0.6,
  }),
  "player-step": mk({              // paso breve ~190ms
    wave_type: 3, p_base_freq: 0.25, p_env_sustain: 0.06, p_env_decay: 0.28,
    p_lpf_freq: 0.4, sound_vol: 0.4,
  }),

  // ─── UI ──────────────────────────────────────────────────
  "ui-click": mk({                 // blip de menú ~220ms
    wave_type: 0, p_base_freq: 0.5, p_env_sustain: 0.08, p_env_decay: 0.3,
    sound_vol: 0.5,
  }),
  "ui-weapon-switch": mk({         // mini-ZAZ suave: barrido corto, como un dash pero mucho más suave ~160ms
    wave_type: 3, p_base_freq: 0.5, p_freq_ramp: 0.5, p_env_sustain: 0.04,
    p_env_decay: 0.26, p_lpf_freq: 0.45, sound_vol: 0.45,
  }),
};

// Normaliza a 16-bit con soft clip: sube el volumen hasta un pico objetivo
// (jsfxr sale flojo; aquí se amplifica sin distorsión dura).
function normalize16bitWav(buf, targetPeak = 0.95) {
  const dataStart = 44;
  let peak = 0;
  for (let i = dataStart; i < buf.length; i += 2) {
    const s = buf.readInt16LE(i) / 32768;
    const a = Math.abs(s);
    if (a > peak) peak = a;
  }
  const gain = peak > 0.0001 ? Math.min(targetPeak / peak, 8) : 1;
  const out = Buffer.from(buf);
  for (let i = dataStart; i < out.length; i += 2) {
    const s = out.readInt16LE(i) / 32768;
    const t = Math.tanh(s * gain) / Math.tanh(gain);
    out.writeInt16LE(Math.round(Math.max(-32767, Math.min(32767, t * 32767))), i);
  }
  return out;
}

function peakDbOf(buf) {
  let peak = 0;
  for (let i = 44; i < buf.length; i += 2) {
    const a = Math.abs(buf.readInt16LE(i) / 32768);
    if (a > peak) peak = a;
  }
  return 20 * Math.log10(peak + 1e-9);
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const manifest = { generatedAt: new Date().toISOString(), sounds: {} };
  let totalBytes = 0;

  for (const [name, params] of Object.entries(DESIGNS)) {
    const sound = sfxr.toWave(params);
    const m = /^data:.+\/(.+);base64,(.*)$/.exec(sound.dataURI);
    if (!m) throw new Error(`No se pudo generar ${name}`);
    const buf = normalize16bitWav(Buffer.from(m[2], "base64"));
    const file = path.join(OUT_DIR, `${name}.wav`);
    fs.writeFileSync(file, buf);
    const dataSize = buf.readInt32LE(40);
    const byteRate = buf.readInt32LE(28);
    const ms = byteRate > 0 ? Math.round((dataSize / byteRate) * 1000) : 0;
    const peakDb = peakDbOf(buf);
    manifest.sounds[name] = { file: `assets/audio/preview/${name}.wav`, bytes: buf.length, ms, bits: 16, peakDb };
    totalBytes += buf.length;
    console.log(`  ${name}.wav  (${(buf.length / 1024).toFixed(1)} KB, ${ms} ms, ${peakDb.toFixed(1)} dBFS)`);
  }

  fs.writeFileSync(
    path.join(OUT_DIR, "..", "sfx-manifest.json"),
    JSON.stringify({ ...manifest, totalBytes }, null, 2),
  );
  console.log(`\n${Object.keys(DESIGNS).length} sonidos generados en ${OUT_DIR}`);
  console.log(`Manifest: ${path.join(OUT_DIR, "..", "sfx-manifest.json")}`);
}

main();