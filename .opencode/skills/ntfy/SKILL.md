---
name: ntfy
description: Notificaciones push en tiempo real con ntfy — el servicio pub-sub por HTTP más simple que existe. Envía avisos al teléfono o escritorio desde cualquier script, terminal o agente IA con un simple PUT/POST. Cubre publicación (curl, PowerShell, Python, JS), suscripción (JSON/SSE/raw/WebSockets/poll), título/prioridad/tags/markdown, acciones y botones, adjuntos, autenticación con tokens, el CLI de ntfy, y casos de uso para equipos y agentes de IA (avisar al terminar, bloquearse, auditoría). Usar cuando el usuario quiera notificaciones push, avisos al equipo, "ping me cuando termines", alertas de scripts, o que agentes IA avisen en tiempo real.
---

# ntfy — Notificaciones push por HTTP

ntfy (pronunciado *notify*) es un servicio **pub-sub por HTTP**: publicas un mensaje con un `PUT`/`POST` y cualquier dispositivo suscrito al tópico lo recibe al instante. **100% gratis, sin cuenta, sin app obligatoria** (aunque la app del teléfono es recomendada para recibir avisos).

> **Regla de oro**: si solo necesitas *enviar* un aviso, **no necesitas instalar nada** — `curl` basta. El CLI de ntfy es opcional (más cómodo para suscribirse).

---

## 1. Conceptos clave

| Concepto | Descripción |
|---|---|
| **Tópico** | Un "canal" con nombre. Se crea solo al publicar/suscribirse. Solo `[-_A-Za-z0-9]`, máx 64 chars |
| **Publicar** | Enviar un mensaje al tópico (`PUT`/`POST` a `https://ntfy.sh/<topic>`) |
| **Suscribirse** | Recibir mensajes del tópico (stream HTTP, WebSocket, app, o CLI) |
| **Servidor público** | `ntfy.sh` — gratis, sin registro. Tópicos públicos = el nombre es la contraseña |
| **Self-hosted** | Puedes montar tu propio servidor ntfy (Docker, binario, paquete) |

> ⚠️ **Seguridad**: en ntfy.sh los tópicos son públicos. Cualquiera que conozca el nombre puede leer/escribir. Elige nombres difíciles de adivinar (ej: `losjonys-jam-2026` en vez de `jam`). Para privacidad real: tópico con token de acceso o self-host.

---

## 2. Publicar mensajes

### 2.1 Lo más básico (curl)

```bash
curl -d "Backup successful 😀" ntfy.sh/mytopic
```

### 2.2 PowerShell (Windows)

```powershell
curl.exe -d "Mensaje de prueba" ntfy.sh/mytopic
```

> ⚠️ En PowerShell, `curl` es un alias de `Invoke-WebRequest`. Usa **`curl.exe`** para el curl real.

### 2.3 Python

```python
import requests
requests.post("https://ntfy.sh/mytopic", data="Mensaje de prueba".encode("utf-8"))
```

### 2.4 JavaScript

```js
fetch('https://ntfy.sh/mytopic', {
  method: 'POST', // PUT también funciona
  body: 'Mensaje de prueba'
})
```

### 2.5 Con título, prioridad y tags

```bash
curl \
  -H "Title: Acceso no autorizado detectado" \
  -H "Priority: urgent" \
  -H "Tags: warning,skull" \
  -d "Acceso remoto al portátil detectado. Actúa ya." \
  ntfy.sh/phil_alerts
```

| Header | Alias | Valores |
|---|---|---|
| `Title` | `X-Title`, `t` | Cualquier texto |
| `Priority` | `X-Priority`, `p` | `min`(1), `low`(2), `default`(3), `high`(4), `urgent`(5) |
| `Tags` | `X-Tags`, `ta` | Emojis/nombres separados por coma: `warning`, `skull`, `partying_face`, `rotating_light`… |
| `Markdown` | `X-Markdown`, `md` | `true` para renderizar Markdown |
| `Click` | `X-Click` | URL que se abre al tocar la notificación |
| `Attach` | `X-Attach` | URL de archivo adjunto (imagen, PDF…) |
| `Actions` | `X-Actions` | Botones de acción (ver abajo) |
| `Email` | `X-Email` | Enviar también por email (requiere email verificado) |

### 2.6 Markdown

```bash
curl -d "Mira **negrita**, *itálica*, y `código`" -H "Markdown: true" ntfy.sh/mytopic
```

### 2.7 Acciones / botones

```bash
curl \
  -H "Actions: http, Abrir puerta, https://api.nest.com/open/yAxkasd, clear=true" \
  -d "Hay alguien en la puerta 🐶" \
  ntfy.sh/mydoorbell
```

Formato: `view, <label>, <url>` (abrir web) o `http, <label>, <url>` (petición HTTP). También como JSON:

```bash
curl ntfy.sh/myhome -d '{
  "topic": "myhome",
  "message": "Saliste de casa. ¿Bajo el aire acondicionado?",
  "actions": [
    {"action": "view", "label": "Abrir portal", "url": "https://home.nest.com/", "clear": true},
    {"action": "http", "label": "Bajar", "url": "https://api.nest.com/", "body": "{\"temp\": 65}"}
  ]
}'
```

### 2.8 Publicar como JSON (mensaje completo)

```bash
curl ntfy.sh/mytopic -d '{
  "topic": "mytopic",
  "message": "Mensaje con todo",
  "title": "Título",
  "priority": 4,
  "tags": ["warning", "skull"],
  "click": "https://example.com",
  "attach": "https://example.com/image.jpg"
}'
```

---

## 3. Suscribirse / leer mensajes

### 3.1 Stream JSON (recomendado para scripts)

```bash
# Conexión abierta para siempre — imprime cada mensaje en JSON
curl -s ntfy.sh/mytopic/json

# Poll: lee los mensajes en caché y cierra
curl -s "ntfy.sh/mytopic/json?poll=1"

# Poll desde hace 10 minutos
curl -s "ntfy.sh/mytopic/json?poll=1&since=10m"

# Todos los mensajes en caché
curl -s "ntfy.sh/mytopic/json?poll=1&since=all"
```

Formato de cada mensaje:
```json
{"id":"hwQ2YpKdmg","time":1635528741,"event":"message","topic":"mytopic","message":"Disk full","priority":3,"tags":["warning"]}
```

Eventos: `open` (conexión abierta), `keepalive` (latido), `message` (mensaje real), `poll_request`.

### 3.2 Stream SSE (para JavaScript/EventSource)

```bash
curl -s ntfy.sh/mytopic/sse
```

```js
const es = new EventSource('https://ntfy.sh/mytopic/sse');
es.onmessage = (e) => console.log(JSON.parse(e.data));
```

### 3.3 Stream raw (solo el texto del mensaje)

```bash
curl -s ntfy.sh/mytopic/raw
```

### 3.4 WebSockets

```bash
websocat wss://ntfy.sh/mytopic/ws
```

### 3.5 Parámetros de suscripción

| Parámetro | Alias | Descripción |
|---|---|---|
| `poll` | `X-Poll`, `po` | Leer mensajes en caché y cerrar conexión |
| `since` | `X-Since`, `si` | Desde: duración (`10m`), timestamp Unix, ID de mensaje, o `all` |
| `scheduled` | `X-Scheduled`, `sched` | Incluir mensajes programados |
| `id` | `X-ID` | Filtrar por ID exacto |
| `message` | `X-Message`, `m` | Filtrar por texto exacto |
| `priority` | `X-Priority`, `p` | Filtrar por prioridad (coma-separada) |
| `tags` | `X-Tags`, `ta` | Filtrar por tags (todos deben coincidir) |

> ⚠️ **`since=1d` NO es válido** — usa `since=all`, `since=10m`, `since=24h`, un timestamp Unix, o un ID de mensaje.

---

## 4. Autenticación (tópicos privados)

### 4.1 En ntfy.sh (cuenta + token)

1. Crea cuenta en **https://ntfy.sh/login** (gratis, sin verificación de email)
2. En **Account → Access Tokens** → crea un token (etiqueta + expiración)
3. Publica con el token:

```bash
curl -H "Authorization: Bearer tk_xxxxxxxx" -d "mensaje privado" ntfy.sh/topic-privado
```

4. Suscríbete con el token:

```bash
curl -s -H "Authorization: Bearer tk_xxxxxxxx" "ntfy.sh/topic-privado/json?poll=1"
```

> ⚠️ El signup por API (`curl -u email:pass ntfy.sh/account`) da **401** en ntfy.sh — la cuenta se crea desde la web o la app.

### 4.2 Basic auth (self-hosted)

```bash
curl -u usuario:password -d "mensaje" https://ntfy.midominio.com/topic
```

### 4.3 Tokens en self-hosted

```bash
# Crear token (en el servidor)
ntfy token add usuario tk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Publicar con token
curl -H "Authorization: Bearer tk_xxxxxxxx" -d "mensaje" https://ntfy.midominio.com/topic
```

---

## 5. CLI de ntfy (opcional pero cómodo)

### 5.1 Instalación

**Windows** (dos opciones):
```powershell
# Opción A: Scoop
scoop install ntfy

# Opción B: descargar ZIP de https://github.com/binwiederhier/ntfy/releases
# y poner ntfy.exe en %Path%
```

**Linux/macOS**:
```bash
# Debian/Ubuntu
curl -sSL https://archive.heckel.io/apt/pubkey.txt | gpg --dearmor | sudo tee /etc/apt/trusted.gpg.d/archive.heckel.io.gpg > /dev/null
echo "deb [arch=amd64] https://archive.heckel.io/apt debian main" | sudo tee /etc/apt/sources.list.d/archive.heckel.io.list
sudo apt update && sudo apt install ntfy

# Homebrew (macOS/Linux)
brew install ntfy
```

### 5.2 Publicar con el CLI

```bash
ntfy publish mytopic "Este es un mensaje"
ntfy pub mytopic "Mensaje"                          # alias
ntfy publish --title="Título" --priority=high --tags=partying_face mytopic "Mensaje"
ntfy pub --at=8:30am delayed_topic "Más tarde"      # programado
ntfy trigger mywebhook                              # disparar webhook
```

### 5.3 Suscribirse con el CLI

```bash
# Imprimir JSON de cada mensaje (se queda abierto)
ntfy subscribe mytopic

# Ejecutar un comando por cada mensaje
ntfy subscribe mytopic 'echo "Mensaje recibido: $message"'

# Desde config (múltiples tópicos)
ntfy subscribe --from-config
```

Variables de entorno disponibles en comandos: `$NTFY_MESSAGE`, `$NTFY_TOPIC`, `$NTFY_TITLE`, `$NTFY_PRIORITY`, `$NTFY_TAGS`.

### 5.4 Config del cliente (Windows: `%AppData%\ntfy\client.yml`)

```yaml
default-host: https://ntfy.sh

subscribe:
  - topic: losjonys
    command: 'echo Mensaje recibido: %message%'
  - topic: alerts
    command: |
      notifu /m "%NTFY_MESSAGE%"
      exit 0
    if:
      priority: high,urgent
```

---

## 6. Casos de uso para agentes IA y equipos

### 6.1 Avisar al equipo cuando un agente termina o se bloquea

```bash
# Terminé tarea
curl.exe -d "OK Shrek: dash implementado, push hecho" ntfy.sh/losjonys

# Bloqueado
curl.exe -d "BLOQUEADO Fiona: tilemap no carga, necesito ayuda" ntfy.sh/losjonys

# Push hecho
curl.exe -d "PUSH Shrek: push a main, hagan pull" ntfy.sh/losjonys
```

### 6.2 Auditoría: escuchar el tópico y verificar el repo

```bash
# Leer los últimos mensajes
curl -s "ntfy.sh/losjonys/json?poll=1&since=all"

# Escuchar en tiempo real
curl -s -N ntfy.sh/losjonys/json
```

### 6.3 Notificar al terminar un comando largo

```bash
# Con el CLI (espera al comando y avisa)
ntfy publish --wait-cmd mytopic npm run build

# O manualmente
npm run build && curl -d "Build OK" ntfy.sh/mytopic || curl -d "Build FALLÓ" ntfy.sh/mytopic
```

### 6.4 Alertas de scripts / CI / cron

```bash
# En un script
if [ $? -eq 0 ]; then
  curl -d "✅ Deploy exitoso" ntfy.sh/deploys
else
  curl -d "🚨 Deploy falló" -H "Priority: urgent" ntfy.sh/deploys
fi
```

---

## 7. Mejores prácticas

1. **Tópicos difíciles de adivinar**: `losjonys-jam-2026` >> `jam`. El nombre ES la contraseña en ntfy.sh.
2. **No publiques datos sensibles** en tópicos públicos (contraseñas, tokens, IPs internas).
3. **Prioridad con criterio**: usa `urgent` solo para lo que requiere acción inmediata. El resto `default`.
4. **Tags para contexto visual**: `warning`, `rotating_light`, `white_check_mark`, `construction`.
5. **No notifiques cada micro-paso** — solo hitos o bloqueos (o cuando te lo pidan).
6. **Límites gratuitos ntfy.sh**: ~250 mensajes/día por IP, adjuntos 2MB (3h), emails 5/día. Suficiente para una jam.
7. **En PowerShell usa `curl.exe`**, no `curl` (alias de Invoke-WebRequest).
8. **`since=1d` no existe** — usa `since=all`, `since=10m`, `since=24h`, timestamp o ID.
9. **Para privacidad real**: token de acceso (ntfy.sh) o self-host con `auth-default-access: deny-all`.
10. **La app móvil** (Google Play / App Store / F-Droid) es gratis y sin cuenta — solo suscríbete al tópico.

---

## 8. Referencia rápida

| Acción | Comando |
|---|---|
| Enviar mensaje | `curl -d "hola" ntfy.sh/topic` |
| Enviar con título/prioridad | `curl -H "Title: X" -H "Priority: high" -d "msg" ntfy.sh/topic` |
| Enviar con Markdown | `curl -d "**negrita**" -H "Markdown: true" ntfy.sh/topic` |
| Leer mensajes (poll) | `curl -s "ntfy.sh/topic/json?poll=1&since=all"` |
| Escuchar en tiempo real | `curl -s -N ntfy.sh/topic/json` |
| Leer solo texto | `curl -s ntfy.sh/topic/raw` |
| Publicar con token | `curl -H "Authorization: Bearer tk_xxx" -d "msg" ntfy.sh/topic` |
| CLI publicar | `ntfy publish topic "msg"` |
| CLI suscribirse | `ntfy subscribe topic` |
| CLI suscribirse + comando | `ntfy subscribe topic 'echo $message'` |

---

## 9. Recursos

- Documentación: https://docs.ntfy.sh
- Publicar: https://docs.ntfy.sh/publish/
- Suscribir por API: https://docs.ntfy.sh/subscribe/api/
- Suscribir por CLI: https://docs.ntfy.sh/subscribe/cli/
- Instalación: https://docs.ntfy.sh/install/
- App Android: https://play.google.com/store/apps/details?id=io.heckel.ntfy
- App iOS: https://apps.apple.com/app/ntfy/id1625396347
- Repo: https://github.com/binwiederhier/ntfy