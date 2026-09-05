/**
 * ui/icons.ts — Iconos FontAwesome 6 (free, self-hosted) para la UI.
 *
 * FontAwesome vive en client/public/assets/fonts/fontawesome
 * (all.min.css + webfonts) y se carga en index.html.
 *
 * En Phaser los iconos se renderizan como texto con la fuente
 * 'Font Awesome 6 Free' (font-weight 900 = solid):
 *
 *   this.add.text(x, y, ICONS.heart, iconStyle({ fontSize: '20px', color: '#ef4444' }))
 *
 * ⚠️ Los códigos están VERIFICADOS contra el all.min.css local
 * (no inventar códigos — algunos cambian entre FA5 y FA6, ej. gun = \e19b).
 * Nota: no hay fa-knife en este CSS; para melee/cuchillo se usa fa-hand-fist.
 *
 * Territorio: PUCK (UI).
 */

export const ICONS = {
  // Identidad / jugadores
  user: '\uf007',
  users: '\uf0c0',
  crown: '\uf521',
  glasses: '\uf530',
  hatWizard: '\uf6e8',
  ribbon: '\uf4d6',
  satelliteDish: '\uf7c0',
  helmetSafety: '\uf807',
  dragon: '\uf6d5',
  ghost: '\uf6e2',
  wandSparkles: '\ue2ca',

  // Estado / HUD
  heart: '\uf004',
  zap: '\uf0e7',
  clock: '\uf017',
  shield: '\uf132',
  shieldHalved: '\uf3ed',
  shieldHeart: '\ue574',
  shieldVirus: '\ue06c',
  shieldCat: '\ue572',
  shieldDog: '\ue573',
  skull: '\uf54c',
  bolt: '\uf0e7',
  stopwatch: '\uf2f2',
  hourglass: '\uf254',
  kitMedical: '\uf479',
  heartPulse: '\uf21e',

  // Armas / combate
  gun: '\ue19b',
  fist: '\uf6de', // cuchillo/melee
  bomb: '\uf1e2',
  explosion: '\ue4e9',
  fire: '\uf06d',
  crosshairs: '\uf05b',
  bullseye: '\uf140',
  personRifle: '\ue54e',
  personFalling: '\ue546',
  handFist: '\uf6de',

  // Navegación / acciones
  check: '\uf00c',
  xmark: '\uf00d',
  plus: '\u002b',
  question: '\u003f',
  info: '\uf129',
  exclamation: '\u0021',
  circleCheck: '\uf058',
  arrowLeft: '\uf060',
  arrowRight: '\uf061',
  arrowUp: '\uf062',
  arrowDown: '\uf063',
  chevronLeft: '\uf053',
  chevronRight: '\uf054',
  angleLeft: '\uf104',
  angleRight: '\uf105',
  anglesLeft: '\uf100',
  anglesRight: '\uf101',
  caretLeft: '\uf0d9',
  caretRight: '\uf0da',
  play: '\uf04b',
  pause: '\uf04c',
  backward: '\uf04a',
  forward: '\uf04e',
  stepBackward: '\uf048',
  stepForward: '\uf051',
  fastBackward: '\uf049',
  repeat: '\uf363',
  rotateRight: '\uf2f9',
  rightLeft: '\uf362',
  flag: '\uf024',
  gear: '\uf013',

  // Premios / progreso
  trophy: '\uf091',
  star: '\uf005',
  medal: '\uf5a2',
  dice: '\uf522',

  // Input / misc
  keyboard: '\uf11c',
  mouse: '\uf8cc',
  gamepad: '\uf11b',
  wrench: '\uf0ad',
  hammer: '\uf6e3',
  broom: '\uf51a',
  eye: '\uf06e',
  eyeSlash: '\uf070',
  spinner: '\uf110',
  circleNotch: '\uf1ce',
  tableColumns: '\uf0db',
  grip: '\uf58d',
  gripVertical: '\uf58e',
  ellipsis: '\uf141',
  ellipsisVertical: '\uf142',
  lessThan: '\u003c',
  greaterThan: '\u003e',
  borderAll: '\uf84c',
  borderNone: '\uf850',
  circleHalfStroke: '\uf042',

  // Claves del catálogo original de PUCK main (mantener compatibilidad)
  peopleGroup: '\uf533',
  palette: '\uf53f',
  personRunning: '\uf70c',
  personRays: '\uf54d',
  timer: '\uf293',
  rocket: '\uf135',
  doorOpen: '\uf52b',
  hand: '\uf256',
  locationCrosshairs: '\uf601',
  hatCowboy: '\uf8c0',
} as const;

export type IconName = keyof typeof ICONS;

/** Devuelve el glifo del icono (concatenar en un texto Phaser con la fuente FA). */
export function fa(name: IconName): string {
  return ICONS[name];
}

/** Estilo de texto para iconos FontAwesome (solid). */
export function iconStyle(overrides: Phaser.Types.GameObjects.Text.TextStyle = {}): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: "'Font Awesome 6 Free', 'Font Awesome 6 Pro', sans-serif",
    fontStyle: '900',
    ...overrides,
  };
}

/** Estilo de fuente FontAwesome para textos Phaser (solo la fuente FA). */
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