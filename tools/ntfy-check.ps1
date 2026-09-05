# Consulta los mensajes recientes del tópico ntfy de LosJonys y detecta mensajes de PUCK.
# Uso: powershell -ExecutionPolicy Bypass -File tools/ntfy-check.ps1 [-Last 25] [-TimeoutSec 60]
# Regla de trabajo: ejecutar ANTES de empezar cada instrucción del usuario.

param(
  [int]$Last = 25,
  [int]$TimeoutSec = 60
)

try {
  $msgs = Invoke-RestMethod -Uri "https://ntfy.sh/losJonys/json?poll=1&last=$Last" -TimeoutSec $TimeoutSec
  if (-not $msgs) {
    Write-Host "(sin mensajes en el tópico)"
    exit 0
  }
  if ($msgs -isnot [array]) { $msgs = @($msgs) }

  $puck = @()
  foreach ($m in $msgs) {
    $t = [DateTimeOffset]::FromUnixTimeSeconds([int64]$m.time).ToLocalTime().ToString("dd/MM HH:mm")
    $text = if ($m.message) { $m.message } else { "(sin texto)" }
    Write-Host ("[{0}] {1}" -f $t, $text)
    if ($text -match '^\[TAREA\]' -or $text -match 'PUCK\s*:' -or $text -match '^REGISTRO') {
      $puck += ("[{0}] {1}" -f $t, $text)
    }
  }

  if ($puck.Count -gt 0) {
    Write-Host ""
    Write-Host ("=== MENSAJES DE PUCK DETECTADOS ({0}) ===" -f $puck.Count)
    $puck | ForEach-Object { Write-Host $_ }
  } else {
    Write-Host ""
    Write-Host ("(no hay mensajes de PUCK en los últimos {0} del tópico)" -f $Last)
  }
} catch {
  Write-Host ("Error consultando ntfy: {0}" -f $_.Exception.Message)
  exit 1
}