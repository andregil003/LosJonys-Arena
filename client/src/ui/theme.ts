/**
 * ui/theme.ts — Design tokens de la UI de LosJonys Arena.
 *
 * Estética base: la de `presentacion.html` de André.
 *  - Fondo oscuro #0f0f0f + acento cian #22d3ee.
 *  - Tipografía self-hosted (Google Fonts, OFL):
 *      • Rajdhani (SemiBold/Bold) → Logo, títulos de pantalla, números
 *        (daño, contadores, timer). Estética "HUD militar-futurista" tipo
 *        Valorant, formas abiertas y juguetonas.
 *      • Nunito (Bold/ExtraBold) → UI, nombres de armas, puntuación, stats.
 *        Redondeada y amigable tipo Brawl Stars, muy legible a tamaños pequeños.
 *  - Estética limpia, tech, minimalista, "hacker".
 *
 * Territorio: PUCK (UI / escenas).
 */

export const THEME = {
  /** Fondo principal */
  bg: '#0f0f0f',
  /** Acento principal (cian) */
  accent: '#22d3ee',
  /** Texto principal */
  text: '#fafafa',
  /** Texto secundario */
  secondary: '#a8a8a8',
  /** Bordes */
  border: '#2e2e2e',

  /** Tipografía display (títulos / logo / headers) — Rajdhani */
  fontDisplay: "'Rajdhani', 'Segoe UI', sans-serif",
  /** Tipografía UI (cuerpo / armas / puntuación) — Nunito */
  fontUi: "'Nunito', 'Segoe UI', sans-serif",
  /** Tipografía de números (daño / contadores / timer) — Rajdhani */
  fontNumbers: "'Rajdhani', 'Segoe UI', sans-serif",

  // Aliases de compatibilidad (mantienen el nombre histórico)
  /** @deprecated usa fontDisplay */
  fontMono: "'Rajdhani', 'Segoe UI', sans-serif",
  /** @deprecated usa fontUi */
  fontSans: "'Nunito', 'Segoe UI', sans-serif",
  /** @deprecated usa fontDisplay + FontAwesome */
  fontMonoFa: "'Font Awesome 6 Free', 'Rajdhani', 'Segoe UI', sans-serif",
  /** @deprecated usa fontUi + FontAwesome */
  fontSansFa: "'Font Awesome 6 Free', 'Nunito', 'Segoe UI', sans-serif",
} as const;

/** Helper: crea un estilo de texto Phaser con la fuente display (Rajdhani). */
export function monoStyle(overrides: Phaser.Types.GameObjects.Text.TextStyle = {}): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: THEME.fontDisplay,
    color: THEME.text,
    ...overrides,
  };
}

/** Helper: crea un estilo de texto Phaser con la fuente UI (Nunito). */
export function sansStyle(overrides: Phaser.Types.GameObjects.Text.TextStyle = {}): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: THEME.fontUi,
    color: THEME.text,
    ...overrides,
  };
}

/** Helper: estilo display (Rajdhani) + FontAwesome (iconos FA mezclados con texto). */
export function monoFaStyle(overrides: Phaser.Types.GameObjects.Text.TextStyle = {}): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: THEME.fontMonoFa,
    color: THEME.text,
    ...overrides,
  };
}

/** Helper: estilo UI (Nunito) + FontAwesome (iconos FA mezclados con texto). */
export function sansFaStyle(overrides: Phaser.Types.GameObjects.Text.TextStyle = {}): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: THEME.fontSansFa,
    color: THEME.text,
    ...overrides,
  };
}

/** Helper: estilo de números (Rajdhani) — daño, contadores, timer. */
export function numbersStyle(overrides: Phaser.Types.GameObjects.Text.TextStyle = {}): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: THEME.fontNumbers,
    color: THEME.text,
    ...overrides,
  };
}
