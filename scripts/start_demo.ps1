# Starts the whole game on this laptop: builds the frontend once, then serves the UI and the API from one
# process at http://localhost:8000 (no Vite dev server needed). Uses the real model through Ollama.
#
#   powershell -ExecutionPolicy Bypass -File scripts/start_demo.ps1            # build, then run
#   powershell -ExecutionPolicy Bypass -File scripts/start_demo.ps1 -SkipBuild # run again without rebuilding
#   powershell -ExecutionPolicy Bypass -File scripts/start_demo.ps1 -Stub      # canned guard replies, no model
param([switch]$SkipBuild, [switch]$Stub)
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)

foreach ($tool in 'python', 'npm') {
    if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) { throw "$tool was not found on PATH. See README.md, Installation and Setup." }
}
if (Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue) {
    throw 'Port 8000 is already in use (an old backend or tools/dev_server.py?). Stop it first.'
}

if (-not $Stub) {
    if (-not (Get-Command ollama -ErrorAction SilentlyContinue)) { throw 'Ollama is not installed. Install it from https://ollama.com, or use -Stub.' }
    $models = (ollama list) -join "`n"
    if ($models -notmatch 'gemma4:e2b') { throw 'The model is missing. Run: ollama pull gemma4:e2b   (about 4.6 GB)' }
}

if (-not $SkipBuild -or -not (Test-Path 'frontend/dist/index.html')) {
    Push-Location frontend
    npm ci --no-audit --no-fund
    $env:VITE_USE_BACKEND = 'true'
    npm run build
    Pop-Location
}

python -m pip install -q -r backend/requirements.txt
if ($Stub) { $env:GUARD_STUB = '1' } else { $env:OLLAMA_MODEL = 'gemma4:e2b' }
$env:DATABASE_PATH = Join-Path $env:TEMP 'prompt_heist_demo.db'
Write-Host 'Open http://localhost:8000  (Ctrl+C stops the game)' -ForegroundColor Green
python -m uvicorn backend.app.main:create_app --factory --port 8000
