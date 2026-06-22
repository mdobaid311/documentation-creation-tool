# Docs Capture — start the web dev server.
# Run from anywhere:  .\dev.ps1   (or right-click > Run with PowerShell)
# cd's into the web/ folder next to this script and launches `npm run dev`.

$ErrorActionPreference = "Stop"

$webDir = Join-Path $PSScriptRoot "web"
if (-not (Test-Path $webDir)) {
    Write-Error "Could not find the 'web' folder at $webDir"
    exit 1
}

Set-Location $webDir
Write-Host "Starting Docs Capture dev server in $webDir ..." -ForegroundColor Magenta

# Install dependencies on first run (no node_modules yet).
if (-not (Test-Path (Join-Path $webDir "node_modules"))) {
    Write-Host "node_modules not found — running 'npm install' first..." -ForegroundColor Yellow
    npm install
}

npm run dev
