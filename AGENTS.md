# AGENTS.md — Contrato del equipo LosJonys Arena

Este archivo lo leen automáticamente todos los opencode del equipo. **Léelo SIEMPRE antes de tocar código.**

## Equipo (2 roles)

| Agente | Persona | Rol | Territorio |
|--------|---------|-----|------------|
| `shrek` | Shrek | Gameplay Programmer | `client/src/entities/`, `client/src/systems/`, `server/src/rooms/` |
| `puck` | André (PUCK) | PM, Arquitecto, QA, UI | `client/src/main.ts`, `client/src/config.ts`, `client/src/types.ts`, `client/src/scenes/`, `client/src/ui/`, `server/src/index.ts`, `server/src/state.ts`, `docs/` |

> 🧠 **Orquestador: PUCK** — André usa PUCK como agente principal. PUCK tiene acceso a TODAS las skills, orquesta la integración, el esqueleto, los merges, el build y el deploy. Shrek trabaja en su territorio; PUCK integra.

## Stack

- **Cliente:** Phaser 4 + TypeScript + Vite (juego web en navegador)
- **Servidor:** Node.js + Colyseus (multiplayer autoritativo, WebSocket)
- **Comandos cliente:** `cd client && npm install` (una vez), `npm run dev` (desarrollo), `npm run build` (producción)
- **Comandos servidor:** `cd server && npm install` (una vez), `npm run dev` (desarrollo), `npm run build` (producción)
- **Deploy:** Cliente → Cloudflare Pages / Servidor → Railway o Render

## Estructura de archivos (NO TOCAR lo de otros)

```
LosJonys-Arena/
├── client/
│   ├── src/
│   │   ├── main.ts          ← PUCK
│   │   ├── config.ts        ← PUCK
│   │   ├── types.ts         ← PUCK (EL CONTRATO — sagrado)
│   │   ├── scenes/          ← PUCK (menú, crear Jony, lobby, agent select, juego)
│   │   ├── entities/        ← Shrek (player, enemigos, armas)
│   │   ├── systems/         ← Shrek (combate, poderes, red)
│   │   └── ui/              ← PUCK (HUD, menús)
│   └── public/assets/       ← ambos (assets compartidos)
├── server/
│   ├── src/
│   │   ├── index.ts         ← PUCK (servidor, conexiones, matchmaking)
│   │   ├── state.ts         ← PUCK (estado autoritativo base)
│   │   └── rooms/           ← Shrek (ArenaRoom, CoopRoom, FFARoom, IA)
│   └── package.json
├── docs/
│   └── GDD.md               ← PUCK (diseño del juego — léelo)
└── AGENTS.md
```

## El contrato (`client/src/types.ts`)

- Define los tipos compartidos, el **EventBus** y las constantes del juego.
- **Es el archivo más importante del proyecto.** Cualquier cambio requiere avisar al otro antes.
- Los 2 roles se comunican SOLO a través de este contrato. Nunca importes clases del territorio del otro directamente.

## Reglas de git

1. **Pull antes de empezar**: `git pull origin main`
2. **Branch por feature**: `git checkout -b feature/<tu-rol>` (ej: `feature/gameplay`, `feature/ui`)
3. **Commits pequeños y frecuentes** en español: `feat(player): añadir dash` / `fix(ui): HUD se superpone`
4. **Nunca dos personas tocan el mismo archivo al mismo tiempo.** Si necesitas el archivo de otro, avisa por el chat del equipo.
5. **Merge final**: lo hace PUCK (André). Shrek no hace merge a `main` sin avisar.
6. **El build siempre debe pasar**: `npm run build` sin errores antes de terminar tu turno.

## 📢 Notificaciones del equipo (ntfy)

Todos los agentes avisan al equipo cuando terminan una tarea, hacen push o se bloquean. Tópico: `losJonys` (`https://ntfy.sh/losJonys`).

- Terminé tarea: `curl.exe -d "✅ <Nombre>: <qué hiciste>" ntfy.sh/losJonys`
- Bloqueado: `curl.exe -d "🚨 <Nombre>: <qué necesitas>" ntfy.sh/losJonys`
- Hice push: `curl.exe -d "📦 <Nombre>: push hecho, hagan pull" ntfy.sh/losJonys`

## Convenciones de código

- TypeScript estricto: tipos explícitos, sin `any`, sin `@ts-ignore`
- Nombres de archivos en inglés (kebab-case): `player.ts`, `enemy-spawner.ts`
- Variables y funciones en inglés; comentarios y commits en español
- Assets en `client/public/assets/` (sprites, audio, tilemaps)

## Skills de gamedev disponibles

- **Arquetipos de juego**: `phaser-init` (platformer, top-down RPG, space shooter, match-3, tower defense, endless runner, card game, fighting, racing)
- **Gameplay** (Shrek): `phaser-physics`, `phaser-matter`, `phaser-gameobj`, `phaser-animation`, `phaser-input`, `phaser-fx`, `phaser-particles`, `phaser-arcade-physics`, `game-feel`
- **Arquitectura/UI** (PUCK): `phaser-init`, `phaser-architect`, `phaser-gdd`, `phaser-build`, `phaser-release`, `phaser-analyze`, `phaser-core`, `phaser-ui`, `phaser-scene`, `phaser-tilemap`, `phaser-audio`

## Regla de oro

**Nunca toques archivos que no son tuyos.** Si algo no compila o algo se rompe, avisa al dueño del archivo por el chat del equipo. Los 2 trabajamos en paralelo sin pisarnos.