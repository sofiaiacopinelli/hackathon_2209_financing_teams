# FinanzaFacile — Avvio completo
# Eseguire dal terminale di Claude Code (ha l'API key nell'ambiente)
#   .\start.ps1

$root = $PSScriptRoot
$serverDir = Join-Path $root "app\server"
$appFile = Join-Path $root "app\index.html"

Write-Host ""
Write-Host "╔══════════════════════════════════════════╗"
Write-Host "║   FinanzaFacile — Avvio                  ║"
Write-Host "╚══════════════════════════════════════════╝"
Write-Host ""

# 1. Installa dipendenze server se mancano
if (-not (Test-Path (Join-Path $serverDir "node_modules"))) {
    Write-Host "📦 Installazione dipendenze server..."
    Push-Location $serverDir
    npm install --silent
    Pop-Location
    Write-Host "   ✓ Dipendenze installate"
} else {
    Write-Host "   ✓ Dipendenze già presenti"
}

# 2. Avvia il server Node in una nuova finestra PowerShell
Write-Host ""
Write-Host "🚀 Avvio server su http://localhost:3000 ..."
$serverCmd = "cd '$serverDir'; npm start; Read-Host 'Premi Invio per chiudere'"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $serverCmd

# 3. Aspetta che il server sia pronto (max 10 secondi)
Write-Host "   Attendo che il server risponda..."
$ready = $false
for ($i = 0; $i -lt 10; $i++) {
    Start-Sleep -Seconds 1
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing -TimeoutSec 1 -ErrorAction Stop
        if ($r.StatusCode -eq 200) { $ready = $true; break }
    } catch {}
}

if ($ready) {
    Write-Host "   ✓ Server pronto"
} else {
    Write-Host "   ⚠  Server non risponde ancora — potrebbe impiegare qualche secondo in più"
}

# 4. Apri l'app nel browser
Write-Host ""
Write-Host "🌐 Apertura app nel browser..."
Start-Process $appFile

Write-Host ""
Write-Host "══════════════════════════════════════════"
Write-Host "  Server:  http://localhost:3000/health"
Write-Host "  App:     $appFile"
Write-Host ""
Write-Host "  Per fermare il server: chiudi la finestra PowerShell del server"
Write-Host "══════════════════════════════════════════"
Write-Host ""
