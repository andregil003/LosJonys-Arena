/**
 * ui/theme.ts — Design tokens de la UI de LosJonys Arena.
 *
 * Estética base: la de `presentacion.html` de André.
 *  - Fondo oscuro #0f0f0f + acento cian #22d3ee.
 *  - Tipografía mono (JetBrains Mono) + sans (Inter).
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

  /** Tipografía mono (técnica / HUD / eyebrows) */
  fontMono: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
  /** Tipografía sans (cuerpo) */
  fontSans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
} as const;

/** Helper: crea un estilo de texto Phaser con la fuente mono del tema. */
export function monoStyle(overrides: Phaser.Types.GameObjects.Text.TextStyle = {}): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: THEME.fontMono,
    color: THEME.text,
    ...overrides,
  };
}

/** Helper: crea un estilo de texto Phaser con la fuente sans del tema. */
export function sansStyle(overrides: Phaser.Types.GameObjects.Text.TextStyle = {}): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: THEME.fontSans,
    color: THEME.text,
    ...overrides,
  };
}
