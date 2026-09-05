# Genera la página de audición de audio (client/public/assets/audio/index.html).
# Uso: powershell -ExecutionPolicy Bypass -File tools/gen-audio-index.ps1
# Regenera el HTML con TODAS las pistas (preview + kenney-*) en secciones, con preload=metadata
# para que la duración se muestre al instante sin pulsar play.

$root = (Resolve-Path "client\public\assets\audio").Path
$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine('<!DOCTYPE html>')
[void]$sb.AppendLine('<html lang="es"><head><meta charset="utf-8">')
[void]$sb.AppendLine('<title>LosJonys Arena — Audición de audio</title>')
[void]$sb.AppendLine('<style>body{background:#12121a;color:#e8e8f0;font-family:"Segoe UI",Arial,sans-serif;margin:0;padding:24px}h1{font-size:22px;margin:0 0 4px}h2{font-size:16px;margin:28px 0 8px;color:#ffbd2e;border-bottom:1px solid #2a2a3a;padding-bottom:4px}.row{display:flex;align-items:center;gap:12px;margin:4px 0}.lbl{width:300px;font-family:Consolas,monospace;font-size:12px;color:#aab}audio{width:320px;height:32px}p.note{color:#889;font-size:13px}.tag{display:inline-block;background:#2a2a3a;border-radius:4px;padding:1px 8px;font-size:11px;color:#ffbd2e;margin-left:6px}</style></head><body>')
[void]$sb.AppendLine('<h1>LosJonys Arena — Audición de audio</h1>')
[void]$sb.AppendLine('<p class="note">Dale play a cada sonido. La duración se muestra al instante (preload=metadata).<br>Licencias: Kenney = CC0 (sin crédito). Los <b>preview/</b> son nuestros (generados con jsfxr).</p>')
$dirs = Get-ChildItem $root -Directory | Sort-Object Name
foreach ($dir in $dirs) {
  $files = Get-ChildItem $dir.FullName -Recurse -File | Where-Object { $_.Extension -in '.wav', '.ogg' } | Sort-Object Name
  if ($files.Count -eq 0) { continue }
  [void]$sb.AppendLine("<h2>$($dir.Name) <span class='tag'>$($files.Count) sonidos</span></h2>")
  foreach ($f in $files) {
    $rel = $f.FullName.Substring($root.Length + 1) -replace '\\', '/'
    [void]$sb.AppendLine("<div class='row'><span class='lbl'>$($f.Name)</span><audio controls preload='metadata' src='$rel'></audio></div>")
  }
}
[void]$sb.AppendLine('</body></html>')
[System.IO.File]::WriteAllText("$root\index.html", $sb.ToString(), [System.Text.Encoding]::UTF8)
Write-Host "index.html regenerado con $(([regex]::Matches($sb.ToString(), '<audio')).Count) pistas (preload=metadata)"