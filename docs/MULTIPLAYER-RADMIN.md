# Multiplayer con Radmin VPN — Guía rápida

Cómo jugar **LosJonys Arena** en red local (LAN virtual) entre varias PCs usando
[Radmin VPN](https://www.radmin-vpn.com/). Sin servidor público: un jugador hace
de **host** y los demás se conectan a su IP de Radmin.

> Estado actual: el cliente ya renderiza jugadores remotos (RemotePlayer) con
> colores por equipo (COOP: aliado azul / enemigo rojo). El servidor es
> autoritativo (movimiento, armas, cuchillo, poderes, kills).

---

## 1. Instalar Radmin VPN (todos los jugadores)

1. Descargar e instalar [Radmin VPN](https://www.radmin-vpn.com/) en cada PC.
2. Abrir Radmin VPN → **Crear cuenta** (o entrar con la existente).
3. Todos deben estar en la **misma red** (el host crea la red y comparte el nombre
   y la contraseña; los demás entran con **Unirse a red**).

## 2. Host (el que abre la partida)

1. Abrir el puerto en el firewall de Windows (una vez):
   ```powershell
   netsh advfirewall firewall add rule name="LosJonys 2567" dir=in action=allow protocol=TCP localport=2567
   ```
2. Levantar el servidor:
   ```powershell
   cd server
   npm run dev
   ```
   El servidor escucha en `0.0.0.0:2567` (todas las interfaces, incluida la IP de Radmin).
3. Anotar la **IP de Radmin** del host: Radmin VPN → aparece junto al nombre de la PC
   (ej: `26.10.10.10`). Esa IP se la pasas a los demás.

## 3. Clientes (los demás jugadores)

1. En `client/`, crear (o editar) el archivo `.env`:
   ```
   VITE_SERVER_URL=ws://26.10.10.10:2567
   ```
   (Reemplaza `26.10.10.10` por la IP de Radmin del host.)
2. Levantar el cliente:
   ```powershell
   cd client
   npm run dev
   ```
3. Entrar al juego → elegir modo → el lobby mostrará el contador de jugadores
   conectados. Al empezar la partida verás a los demás como círculos con su
   nombre (y badge ALIADO/ENEMIGO en COOP).

> Sin `.env`, el cliente intenta `ws://localhost:2567` (modo solitario/offline).

## 4. Probar la conexión

- **Ping**: `ping 26.10.10.10` desde el cliente → debe responder.
- **Puerto abierto**: desde el cliente, `Test-NetConnection 26.10.10.10 -Port 2567`
  (PowerShell) → `TcpTestSucceeded : True`.

## 5. Solución de problemas

| Problema | Causa probable | Fix |
|----------|----------------|-----|
| "RED: sin servidor (offline)" | IP mal escrita o firewall bloquea | Verificar IP de Radmin del host; abrir puerto 2567 TCP en el host |
| Se conecta pero no ve jugadores | Clientes apuntando a IPs distintas | Todos deben usar la MISMA IP del host |
| El lobby marca 0 jugadores remotos | El cliente no llegó a unirse a la sala | Reiniciar cliente; verificar `.env` y rebuild (`npm run dev` recarga) |
| Ping OK pero no conecta | Firewall del host bloquea 2567 | Ejecutar el comando `netsh` del paso 2.1 |

## Notas técnicas

- **Sala única**: todos los que apuntan a la misma IP entran a la misma sala
  `arena` (máx 6 jugadores, `joinOrCreate`).
- **Equipos**: el servidor asigna `team` según el modo — COOP: todos los humanos
  al team 0 (aliados, azul); FFA: cada jugador un índice único (su color).
- **Autoritativo**: el servidor valida movimiento, disparos, cuchillo y poderes;
  el cliente solo envía intenciones (`sendMove`, `sendShot`, etc.).
- **Radmin VPN** es gratis, sin configurar routers ni puertos públicos: ideal para
  probar multiplayer sin desplegar el servidor a internet.