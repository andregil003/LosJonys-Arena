/**
 * ui/icons.ts — Iconos FontAwesome para la UI (PUCK).
 *
 * FontAwesome 6 Free está self-hosted en client/public/assets/fonts/fontawesome/
 * (css/all.min.css + webfonts/*.woff2). Para usarlo en Phaser:
 *   - Los textos Phaser usan la fuente 'Font Awesome 6 Free' con el código
 *     unicode del icono (ej: '\uf04b' = play).
 *   - El helper `fa()` devuelve el glifo listo para concatenar en un texto.
 *
 * ⚠️ EXCEPCIÓN: los accesorios (sombreros, gafas, moño, corona, antenas)
 * siguen usando EMOJI (decisión de André) — ver data/catalog.ts.
 *
 * Territorio: PUCK (UI).
 */

/** Mapa de iconos FontAwesome 6 (solid) usados en el juego */
export const ICONS = {
  play: '\uf04b', // fa-play
  arrowLeft: '\uf060', // fa-arrow-left
  arrowRight: '\uf061', // fa-arrow-right
  check: '\uf00c', // fa-check
  user: '\uf007', // fa-user
  users: '\uf0c0', // fa-users
  peopleGroup: '\uf533', // fa-people-group
  skull: '\uf54c', // fa-skull
  gun: '\uf19b', // fa-gun
  bolt: '\uf0e7', // fa-bolt
  zap: '\uf0e7', // fa-bolt (alias)
  palette: '\uf53f', // fa-palette
  heart: '\uf004', // fa-heart
  shield: '\uf132', // fa-shield
  shieldHalved: '\uf3ed', // fa-shield-halved
  personRunning: '\uf70c', // fa-person-running
  eyeSlash: '\uf070', // fa-eye-slash
  personRays: '\uf54d', // fa-person-rays
  timer: '\uf293', // fa-timer
  gamepad: '\uf11b', // fa-gamepad
  crosshairs: '\uf05b', // fa-crosshairs
  trophy: '\uf091', // fa-trophy
  rocket: '\uf135', // fa-rocket
  bomb: '\uf1e2', // fa-bomb
  explosion: '\uf4e9', // fa-explosion
  wandSparkles: '\uf72b', // fa-wand-magic-sparkles
  star: '\uf005', // fa-star
  gear: '\uf013', // fa-gear
  doorOpen: '\uf52b', // fa-door-open
  hand: '\uf256', // fa-hand
  locationCrosshairs: '\uf601', // fa-location-crosshairs
  ghost: '\uf6e2', // fa-ghost
  hatCowboy: '\uf8c0', // fa-hat-cowboy (referencia, los accesorios usan emoji)
} as const;

export type IconName = keyof typeof ICONS;

/** Devuelve el glifo del icono (concatenar en un texto Phaser con la fuente FA) */
export function fa(name: IconName): string {
  return ICONS[name];
}

/** Estilo de fuente FontAwesome para textos Phaser */
export function faStyle(overrides: Phaser.Types.GameObjects.Text.TextStyle = {}): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: '"Font Awesome 6 Free"',
    ...overrides,
  };
}

/**
 * Crea un texto Phaser con un icono FontAwesome.
 * Uso: this.add.text(x, y, fa('play'), faStyle({ fontSize: '20px', color: '#fff' }))
 */
export function faText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  icon: IconName,
  style: Phaser.Types.GameObjects.Text.TextStyle = {},
): Phaser.GameObjects.Text {
  return scene.add.text(x, y, fa(icon), faStyle(style)).setOrigin(0.5);
}