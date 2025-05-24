# Script de nettoyage et build pour Indi-Suivi
Write-Host "💚 Nettoyage des builds précédents..." -ForegroundColor Yellow

# Arrêter tous les processus Node/Electron
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process electron* -ErrorAction SilentlyContinue | Stop-Process -Force

# Supprimer les dossiers de build
Remove-Item -Path "out" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "dist" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "release-builds" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path ".vite" -Recurse -Force -ErrorAction SilentlyContinue

# Supprimer electron-builder.json s'il existe
if (Test-Path "electron-builder.json") {
    Write-Host "⚠️  Suppression de electron-builder.json (conflit avec forge)" -ForegroundColor Yellow
    Remove-Item -Path "electron-builder.json" -Force
}

Write-Host "✅ Nettoyage terminé" -ForegroundColor Green

# Build Electron avec verbose
Write-Host "`n🚀 Build Electron..." -ForegroundColor Yellow
$env:DEBUG = "electron-forge:*,electron-packager"
$repoRoot = Resolve-Path "$PSScriptRoot\.."
Push-Location $repoRoot
npm run make -- --verbose
Pop-Location

Write-Host "`n✨ Build terminé!" -ForegroundColor Green
