# Game Design Document: LosJonys Arena

> **Estado:** Borrador v0.1 — documento vivo, se actualiza conforme evoluciona el juego.
> **Equipo:** PUCK (estructura, escenas, UI, servidor, orquestación) + Shrek (gameplay, armas, poderes, enemigos, IA).

---

## Section 1 — Game Overview

- **Title:** LosJonys Arena (working title — verificar disponibilidad en itch.io/dominio)
- **Tagline:** *Crea tu Jony. Elige tus armas. Sobrevive a la arena.*
- **Genre:** Arena brawler top-down 2D con mecánicas de shooter táctico
- **Target Audience:** Jugadores casuales y de shooter (12+), fans de Brawl Stars y Valorant
- **Elevator Pitch:** Creas tu propio personaje ("Jony") eligiendo 2 armas + 1 poder, y peleas en arenas 2D contra bots (coop) o contra otros jugadores (todos contra todos). La mezcla de personalización tipo Brawl Stars con cambio de armas 1/2/3 estilo Valorant le da identidad propia.
- **Unique Selling Points (USPs):**
  - "Crea tu Jony": personalización completa (nombre, color, accesorios, loadout)
  - Cambio de armas 1/2/3 con cuchillo instakill (mecánica Valorant en 2D)
  - 5 armas + 5 poderes elegibles → builds únicos por jugador
  - 2 modos: COOP (máx 6) y FFA (máx 6)
  - Pantalla de selección tipo Valorant antes de la partida
- **Comparable Titles:**
  - **Brawl Stars** — arena top-down, poderes con barra de Super, modos de juego
  - **Valorant** — cambio de armas 1/2/3, cuchillo, pantalla de agentes, compra/loadout
  - **Fortnite** — zona que se encoge en el modo FFA

---

## Section 2 — Core Game Loop

### 30-Second Loop
```
[Moverte] --> [Encontrar enemigo] --> [Disparar / Cuchillo] --> [Daño / Kill] --> [Decisión: seguir o retroceder] --+
   ^                                                                                                               |
   +---------------------------------------------------------------------------------------------------------------+
```

### 5-Minute Loop (una partida)
```
[Lobby 2:00] --> [Pantalla tipo Valorant: quién es cada uno] --> [Partida] --> [Resultado] --> [Volver al lobby / menú]
```

### Session Loop (15-30 min)
```
[Menú] --> [Crea tu Jony] --> [Selección de modo] --> [Partida(s)] --> [Mejorar/experimentar builds] --> [Salir]
```

- **Win Condition (COOP):** Sobrevivir todas las rondas de oleadas / defender el punto hasta el final.
- **Win Condition (FFA):** Ser el último en pie.
- **Lose Condition (COOP):** Todos los Jonys del equipo mueren.
- **Lose Condition (FFA):** Tu Jony muere (puedes ver el resto de la partida como espectador).

---

## Section 3 — Mechanics Deep Dive

### Primary Mechanics

| Mecánica | Input | Comportamiento | Edge cases |
|----------|-------|----------------|------------|
| Movimiento 8 direcciones | WASD / Flechas | Velocidad base ~200 px/s; +20% con cuchillo en mano | Colisiones con muros/obstáculos |
| Disparo arma 1 | Clic izquierdo / Espacio | Apunta con el mouse, dispara en dirección del cursor | Recarga automática al vaciar |
| Disparo arma 2 | Clic izquierdo (tras cambiar con tecla 2) | Ídem, con stats distintas | Ídem |
| Cuchillo (tecla 3) | Clic izquierdo | **Instakill** si el enemigo está en rango melee (~40px); bonus de velocidad | Sin recarga; requiere estar cerca |
| Cambio de arma | Teclas 1 / 2 / 3 | Cambio instantáneo (mecánica Valorant) | No se puede cambiar durante recarga |
| Recarga | Tecla R | Recarga manual; también automática al vaciar | Tiempo de recarga por arma |
| Poder (Super) | Tecla Q / Shift | Barra se carga con daño hecho/recibido; al 100% se puede usar | Un uso por carga completa |

### Secondary Mechanics

- **Personalización del Jony:** nombre, color/atuendo, accesorios (persistencia en localStorage).
- **Loadout:** 2 armas de un arsenal de 5 + 1 poder de 5.
- **Power-ups (FFA):** vida, daño, velocidad — aparecen en el mapa.

### Control Scheme

| Action | Keyboard | Touch | Gamepad |
|--------|----------|-------|---------|
| Move | WASD / Arrows | Virtual joystick | Left stick |
| Aim / Shoot | Mouse | Tap / drag | Right stick / RT |
| Weapon 1 | 1 | Botón UI | LB |
| Weapon 2 | 2 | Botón UI | RB |
| Knife | 3 | Botón UI | Y |
| Reload | R | Botón UI | X |
| Power | Q / Shift | Botón UI | A |

<!-- ASSUMPTION: touch/gamepad son post-MVP; la prioridad es desktop con mouse+teclado -->

---

## Section 4 — Progression System

- **Difficulty Curve:** COOP escala por rondas (más enemigos, más HP, nuevos tipos). FFA es PvP puro.
- **Unlock Sequence:** Todos los brawlers/armas/poderes disponibles desde el inicio (no hay grind en MVP). <!-- ASSUMPTION: sin desbloqueos por ahora; se puede añadir después -->
- **Scoring System:** Kills + puntos por ronda superada (COOP). Leaderboard local por sesión.
- **Replayability Hooks:** Combinaciones de loadout (5 armas × 5 poderes = 25 builds), partidas cortas, personalización visual.
- **Estimated Play Time:** Partida COOP ~5-8 min; FFA ~3-5 min.

---

## Section 5 — Level / World Design

- **Level Count:** 1 arena base por modo (MVP). <!-- ASSUMPTION: más mapas después -->
- **Themes:** Arena con obstáculos (cajas, muros) y power-ups. Estilo visual limpio/colorido.
- **Flow Maps:**
```
[Menú] --> [Crea tu Jony] --> [Selección de modo] --> [Lobby 2:00] --> [Agent Select] --> [Arena]
```
- **Difficulty Scaling (COOP):** Ronda 1: 5 enemigos básicos → Ronda N: más enemigos + tipos especiales.

---

## Section 6 — Characters & Entities

### Player Character (Jony)
- **Base stats:** HP 100, velocidad 200 px/s, sin salto (top-down).
- **State machine:** idle, move, shoot, reload, knife, power, hurt, dead.
- **Loadout:** 2 armas (de 5) + 1 poder (de 5) + cuchillo (siempre).

### Armas (5 principales) — DEFINIDAS POR SHREK <!-- PENDIENTE: Shrek está definiendo stats -->
| # | Arma | Daño | Cadencia | Alcance | Notas |
|---|------|------|----------|---------|-------|
| 1 | (Shrek) | - | - | - | Incluye idea kamehameha |
| 2 | (Shrek) | - | - | - | |
| 3 | (Shrek) | - | - | - | |
| 4 | (Shrek) | - | - | - | |
| 5 | (Shrek) | - | - | - | |

### Cuchillo (todos)
- **Instakill** en rango melee (~40px). Sin recarga. +20% velocidad al tenerlo en mano.

### Poderes (5) — DEFINIDOS POR SHREK <!-- PENDIENTE -->
| # | Poder | Efecto | Carga |
|---|-------|--------|-------|
| 1 | (Shrek) | - | - |
| 2 | (Shrek) | - | - |
| 3 | (Shrek) | - | - |
| 4 | (Shrek) | - | - |
| 5 | (Shrek) | - | - |

### Enemigos (COOP) — DEFINIDOS POR SHREK <!-- PENDIENTE -->
| Enemy | HP | Speed | Behavior | Attack | Drop |
|-------|----|-------|----------|--------|------|
| (Shrek) | - | - | - | - | - |

### Power-ups (FFA)
| Power-up | Efecto | Duración | Rarity |
|----------|--------|----------|--------|
| Vida | +50 HP | Instantáneo | Común |
| Daño | ×1.5 daño | 10s | Raro |
| Velocidad | +30% velocidad | 10s | Raro |

---

## Section 7 — UI/UX Wireframes

### HUD Layout
```
+---------------------------------------+
| [Vida: 100]   [Poder: ████░░ 80%]     |
| [Arma1] [Arma2] [🔪]      [Timer]     |
|                                       |
|              ARENA                    |
|                                       |
| [Kills: 3]                 [Ronda: 2] |
+---------------------------------------+
```

### Menu Flow Diagram
```
[Menú Principal] --> [Crea tu Jony] --> [Selección de Modo] --> [Lobby 2:00] --> [Agent Select] --> [Arena]
       |                    |                    |
       +--> [Cómo jugar]    +--> [Loadout]       +--> [COOP (6)] / [FFA (6)]
       +--> [Créditos]
```

### Screen Mockups
- **Menú Principal:** Título "LosJonys Arena", botones: Jugar, Cómo jugar, Créditos.
- **Crea tu Jony:** Nombre, color/atuendo, accesorios, selección de 2 armas + 1 poder. Vista previa del personaje.
- **Selección de Modo:** Dos tarjetas: COOP (🤝) y FFA (⚔️).
- **Lobby:** Temporizador 2:00, lista de jugadores conectados, botón "Listo".
- **Agent Select (tipo Valorant):** Pantalla que muestra quién es cada jugador y su loadout antes de empezar.
- **Arena:** HUD con vida, poder, armas, timer, kills/ronda.

### Accessibility Considerations
- Controles remapeables (post-MVP). <!-- ASSUMPTION -->
- Alto contraste en UI. <!-- ASSUMPTION -->

---

## Section 8 — Art Direction

- **Visual Style:** 2D top-down, estilo limpio y colorido (estilo Brawl Stars casual), con partículas y game feel.
- **Color Palette:**

| Role | Hex | Usage |
|------|-----|-------|
| Primary | #3A86FF | Jugador, UI highlights |
| Secondary | #FF006E | Enemigos, daño |
| Background | #1B1B2F | Fondos, menús |
| Accent | #FFBE0B | Power-ups, monedas |
| Success | #06D6A0 | Vida, curación |

- **Resolution & Scaling:** 1280×720, scale mode FIT. <!-- ASSUMPTION -->
- **Animation Guidelines:** Sprites 32×32 o 48×48, animaciones idle/move/shoot/knife/hurt/dead. <!-- ASSUMPTION -->
- **Asset List with Specs:**

| Asset | Type | Size | Frames | Format |
|-------|------|------|--------|--------|
| jony_idle | Spritesheet | 48×48 | 4 | PNG |
| jony_move | Spritesheet | 48×48 | 6 | PNG |
| jony_shoot | Spritesheet | 48×48 | 2 | PNG |
| jony_knife | Spritesheet | 48×48 | 3 | PNG |
| enemy_basic | Spritesheet | 48×48 | 4 | PNG |
| bullet | Static | 8×8 | 1 | PNG |
| knife | Static | 16×16 | 1 | PNG |

<!-- ASSUMPTION: assets placeholder con Graphics.generateTexture() al inicio; reemplazar con jam-assets / retro-diffusion -->

---

## Section 9 — Audio Design Plan

| Scene | Mood | Tempo | Loop? |
|-------|------|-------|-------|
| Menú Principal | Épico, invitante | 90 BPM | Yes |
| Lobby | Tensión leve | 80 BPM | Yes |
| Arena COOP | Intenso | 130 BPM | Yes |
| Arena FFA | Agresivo | 140 BPM | Yes |
| Victoria | Triunfal | 120 BPM | No |
| Derrota | Sombrío | 70 BPM | No |

| Action | Sound Description | Priority |
|--------|-------------------|----------|
| Disparo | Crack seco por arma | High |
| Cuchillo | Slash + kill confirm | High |
| Recarga | Click mecánico | Medium |
| Poder | Whoosh potente | High |
| Daño recibido | Golpe sordo | High |
| Kill | Confirmación sonora | High |

- **Format Requirements:** MP3 + OGG para compatibilidad cross-browser.
- **Volume Hierarchy:** Music 0.4, SFX 0.7, UI 0.5.

<!-- ASSUMPTION: audio con jsfxr/BeepBox (jam-assets) al inicio -->

---

## Section 10 — Technical Requirements

- **Phaser Version:** `phaser` v4.2.1 stable.
- **Physics Engine:** **Arcade** — top-down shooter, AABB suficiente, bajo costo CPU.
- **Multiplayer:** **Colyseus** (Node.js) — servidor autoritativo, salas, sincronización de estado 20-30 Hz.
- **Performance Budgets:** 60 FPS objetivo, máx 50 entidades simultáneas, pool de balas.
- **Browser/Device Targets:** Desktop moderno (Chrome/Edge/Firefox). Mobile post-MVP.

---

## Section 11 — Platform Targets & Device Profiles

- **Primary Platform:** Desktop browser (mouse + teclado).
- **Deployment Method:**
  - Cliente: Cloudflare Pages (estático)
  - Servidor: Railway / Render / Fly.io (Node.js + WebSocket)

| Platform | Primary Input | Secondary Input |
|----------|--------------|-----------------|
| Desktop | Keyboard + Mouse | Gamepad (post-MVP) |
| Mobile | Touch (post-MVP) | - |

---

## Section 12 — Monetization & Release Plan (Optional)

- **Business Model:** Gratis (free-to-play sin monetización en MVP). <!-- ASSUMPTION -->
- **Milestones:**

| Milestone | Deliverable |
|-----------|-------------|
| Fase 0 | Prototipo local: movimiento + disparo + cuchillo, 2 jugadores red local |
| Fase 1 | 3+ brawlers, armas, poderes, partículas, game feel |
| Fase 2 | Modo FFA: sala de 6, zona que se encoge, power-ups |
| Fase 3 | Modo COOP: lobby 2:00, agent select, oleadas de bots |
| Fase 4 | Polish + Deploy: Cloudflare + Railway, testeo con el equipo |

- **Distribution:** itch.io + Cloudflare Pages (jugar en navegador).

---

## Section 13 — Acceptance Criteria

### Vertical Slice (Fase 0)
- [ ] El juego arranca en `npm run dev` sin errores de consola
- [ ] El jugador se mueve en 8 direcciones con WASD/flechas
- [ ] El jugador dispara en dirección del cursor con clic
- [ ] El cuchillo (tecla 3) hace instakill en rango melee (~40px)
- [ ] El cambio de arma 1/2/3 funciona instantáneamente
- [ ] 2 jugadores se conectan en red local y se ven moverse mutuamente

### Alpha (Fase 1-2)
- [ ] 5 armas implementadas con stats distintas (daño, cadencia, alcance)
- [ ] 5 poderes implementados con barra de Super que carga con daño
- [ ] Modo FFA: sala de 6 jugadores, último en pie gana
- [ ] Zona que se encoge fuerza encuentros en FFA
- [ ] Power-ups aparecen y dan sus efectos

### Beta (Fase 3)
- [ ] Modo COOP: lobby con temporizador 2:00
- [ ] Pantalla tipo Valorant muestra quién es cada jugador antes de la partida
- [ ] Oleadas de bots escalan en dificultad por ronda
- [ ] Victoria/derrota del equipo se muestra correctamente

### Launch (Fase 4)
- [ ] Deploy a Cloudflare Pages (cliente) y Railway (servidor)
- [ ] 6 jugadores simultáneos sin lag perceptible (ping < 100ms)
- [ ] El build pasa sin errores de TypeScript

### Human review required (not automatable)
- El game feel (screen shake, hit-stop) se siente satisfactorio
- El balance de armas/poderes se siente justo
- La dificultad del COOP escala de forma divertida