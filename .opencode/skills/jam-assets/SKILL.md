---
name: jam-assets
description: Consigue assets GRATIS para el juego sin API keys ni pagos — sprites, música, SFX, tilemaps, paletas y fuentes de fuentes CC0/libres (Kenney, OpenGameArt, itch.io, Piskel, jsfxr, BeepBox, Tiled, Lospec, Google Fonts). Use when the user needs art, sprites, music, sound effects, tilemaps, palettes, or fonts for the game, or when fal-ai-image/retro-diffusion are not available (no API key).
---

# jam-assets — Assets gratis sin API key

Cuando el equipo necesita assets y NO hay API key para generación por IA (`fal-ai-image`, `retro-diffusion`), usa estas fuentes 100% gratis. Prioriza packs CC0 (sin atribución obligatoria).

## Fuentes por tipo de asset

### Sprites / Arte (prioridad: Kenney primero)
1. **Kenney.nl** — https://kenney.nl/assets — packs CC0 completos (platformer, top-down, UI, audio). Descarga directa ZIP. **La mejor fuente para jams.**
2. **OpenGameArt** — https://opengameart.org — busca con filtro CC0. Sprites, tilesets, música.
3. **itch.io** — https://itch.io/game-assets/free — filtro "Free". Muchos packs de jam.
4. **CraftPix** — https://craftpix.net/freebies/ — packs gratis con licencia libre.

### Pixel art (sin instalar nada)
5. **Piskel** — https://www.piskelapp.com — editor de pixel art en el navegador. Exporta PNG/spritesheet.
6. **Lospec** — https://lospec.com/palette-list — paletas de colores retro (Sweetie 16, PICO-8, etc.).

### Música (sin instalar nada)
7. **BeepBox** — https://www.beepbox.co — música chiptune generada en el navegador. Exporta WAV. Ideal para jams.
8. **Kenney Audio** — https://kenney.nl/assets/category:Audio — packs de música y SFX CC0.

### SFX (sin instalar nada)
9. **jsfxr** — https://sfxr.me — SFX retro (saltos, disparos, explosiones) generados en el navegador. Exporta WAV.
10. **freesound** — https://freesound.org — SFX con licencias CC (verificar cada uno).

### Tilemaps
11. **Tiled** — https://www.mapeditor.org — editor de tilemaps gratis (open source). Exporta .tmj/.json que Phaser carga con `phaser-tilemap`.

### Fuentes
12. **Google Fonts** — https://fonts.google.com — fuentes gratis. Descarga TTF y ponlas en `public/assets/fonts/`.

## Flujo de trabajo

1. **Pregunta qué necesita el equipo** (sprites de personaje, tileset, música de fondo, SFX de salto…).
2. **Busca primero en Kenney** (CC0, consistente, completo). Si no hay, OpenGameArt → itch.io.
3. **Descarga el ZIP** y extrae solo lo necesario a `public/assets/`:
   - Sprites → `public/assets/sprites/`
   - Tilemaps → `public/assets/tilemaps/`
   - Audio → `public/assets/audio/`
   - Fuentes → `public/assets/fonts/`
4. **Verifica la licencia** de cada asset (CC0 = sin atribución; CC-BY = atribución en créditos).
5. **Añade los créditos** al final del juego o en la página de itch.io (obligatorio si no es CC0).
6. Si el asset necesita recorte (spritesheet), usa `phaser-animation` o `sprite-animation` para el slicing.

## Reglas

- **NUNCA** uses assets de Google Images o webs sin licencia clara.
- **NUNCA** uses assets de juegos comerciales (Mario, Zelda, etc.).
- **SIEMPRE** documenta la fuente y licencia en `CREDITOS.md` (o en la página de itch.io).
- Para SFX rápidos: `jsfxr` es más rápido que buscar en OpenGameArt.
- Para música rápida: `BeepBox` genera un loop chiptune en 2 minutos.

## Failure modes

- **Kenney no tiene lo que busco** → OpenGameArt con filtro CC0, luego itch.io free.
- **El ZIP de Kenney es enorme** → extrae solo las carpetas que necesitas (ej: `PNG/` en vez de todo).
- **El asset no encaja con el estilo** → usa `retro-diffusion`/`fal-ai-image` si hay API key, o busca un pack de la misma colección.
- **No sé la licencia** → asume que NO es libre; busca otro asset CC0.