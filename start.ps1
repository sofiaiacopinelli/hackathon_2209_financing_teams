# FinanzaFacile - Avvio completo
# Eseguire dal terminale di Claude Code (ha l'API key nell'ambiente)
#   .\start.ps1

$root = $PSScriptRoot
$serverDir = Join-Path $root "app\server"
$appFile   = Join-Path $root "app\index.html"

Write-Host ""
Write-Host "=== FinanzaFacile - Avvio ==="
Write-Host ""

# 1. Installa dipendenze server se mancano
$nodeModules = Join-Path $serverDir "node_modules"
if (-not (Test-Path $nodeModules)) {
    Write-Host "[1/3] Installazione dipendenze server..."
    Push-Location $serverDir
    npm install --silent
    Pop-Location
    Write-Host "      OK - dipendenze installate"
} else {
    Write-Host "[1/3] Dipendenze gia' presenti"
}

# 2. Avvia il server Node in una nuova finestra PowerShell
Write-Host ""
Write-Host "[2/3] Avvio server su http://localhost:3000 ..."
$serverCmd = "Set-Location '$serverDir'; npm start; Read-Host 'Premi Invio per chiudere'"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $serverCmd

# 3. Aspetta che il server sia pronto (max 15 secondi)
Write-Host "      Attendo che il server risponda..."
$ready = $false
$attempts = 0
while (-not $ready -and $attempts -lt 15) {
    Start-Sleep -Seconds 1
    $attempts++
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing -TimeoutSec 1 -ErrorAction Stop
        if ($r.StatusCode -eq 200) {
            $ready = $true
        }
    } catch {
        # server non ancora pronto
    }
}

if ($ready) {
    Write-Host "      OK - server pronto"
} else {
    Write-Host "      ATTENZIONE: server non risponde ancora - controlla la finestra del server"
}

# 4. Apri l'app nel browser
Write-Host ""
Write-Host "[3/3] Apertura app nel browser..."
Start-Process $appFile

Write-Host ""
Write-Host "=================================="
Write-Host "  Server:  http://localhost:3000/health"
Write-Host "  App:     $appFile"
Write-Host ""
Write-Host "  Per fermare: chiudi la finestra PowerShell del server"
Write-Host "=================================="
Write-Host ""
