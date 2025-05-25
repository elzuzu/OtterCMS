# Script alternatif avec Electron Forge
param(
    [switch]$Clean = $true,
    [switch]$Verbose = $false
)

$projectRoot = Split-Path -Parent $PSScriptRoot
Write-Host "🚀 Build avec Electron Forge - Projet: $projectRoot" -ForegroundColor Cyan

Push-Location $projectRoot

try {
    # Nettoyage
    if ($Clean) {
        Write-Host "`n🧹 Nettoyage..." -ForegroundColor Yellow
        Get-Process node*, electron* -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
        @("out", "dist", ".vite", ".webpack") | ForEach-Object {
            if (Test-Path $_) {
                Remove-Item -Path $_ -Recurse -Force -ErrorAction SilentlyContinue
                Write-Host "   ✓ Supprimé: $_" -ForegroundColor Gray
            }
        }
    }
    
    # Créer un fichier forge.config.js si nécessaire
    $forgeConfigPath = "forge.config.js"
    if (-not (Test-Path $forgeConfigPath)) {
        Write-Host "`n📝 Création de forge.config.js..." -ForegroundColor Yellow
        
        $forgeConfig = @"
const path = require('path');

module.exports = {
  packagerConfig: {
    name: 'Indi-Suivi',
    executableName: 'Indi-Suivi',
    icon: './src/assets/app-icon.ico',
    asar: false,
    out: './out',
    overwrite: true,
    platform: 'win32',
    arch: 'x64'
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'Indi-Suivi',
        setupIcon: './src/assets/app-icon.ico',
        iconUrl: './src/assets/app-icon.ico'
      }
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['win32']
    }
  ]
};
"@
        Set-Content -Path $forgeConfigPath -Value $forgeConfig -Encoding UTF8
        Write-Host "   ✓ forge.config.js créé" -ForegroundColor Green
    }
    
    # Installer Electron Forge si nécessaire
    Write-Host "`n📦 Vérification d'Electron Forge..." -ForegroundColor Yellow
    if (-not (Test-Path "node_modules/@electron-forge")) {
        Write-Host "   📥 Installation d'Electron Forge..." -ForegroundColor Gray
        npm install --save-dev @electron-forge/cli @electron-forge/maker-squirrel @electron-forge/maker-zip
        if ($LASTEXITCODE -ne 0) {
            throw "Échec de l'installation d'Electron Forge"
        }
    }
    
    # Build des composants Vite d'abord
    Write-Host "`n🛠️ Build des composants..." -ForegroundColor Yellow
    @(".vite", ".vite/build", "dist") | ForEach-Object {
        if (-not (Test-Path $_)) { New-Item -ItemType Directory -Path $_ -Force | Out-Null }
    }
    Write-Host "   📝 Build renderer..." -ForegroundColor Gray
    npx vite build --config vite.config.js
    if ($LASTEXITCODE -ne 0) { throw "Échec du build renderer" }
    Write-Host "   📝 Préparation main.js..." -ForegroundColor Gray
    if (Test-Path "src/main.js") { Copy-Item "src/main.js" ".vite/build/main.js" -Force } else { npx vite build --config vite.main.config.ts }
    Write-Host "   📝 Préparation preload.js..." -ForegroundColor Gray
    if (Test-Path "src/preload.ts") {
        npx tsc src/preload.ts --outDir .vite/build --module commonjs --target es2020 --esModuleInterop --skipLibCheck
        if (-not (Test-Path ".vite/build/preload.js")) { npx vite build --config vite.preload.config.ts }
    }

    # Copier les utilitaires dans le dossier de build
    $utilsSrc = "src\utils"
    $utilsDest = ".vite\build\utils"
    if (Test-Path $utilsSrc) {
        Copy-Item $utilsSrc $utilsDest -Recurse -Force
        Write-Host "   ✓ Utils copiés dans le build" -ForegroundColor Green
    }
    
    $packageJsonPath = "package.json"
    if (Test-Path $packageJsonPath) {
        $packageContent = Get-Content $packageJsonPath -Raw | ConvertFrom-Json
        if (-not $packageContent.config) {
            $packageContent | Add-Member -Type NoteProperty -Name "config" -Value @{ "forge" = "./forge.config.js" }
            $packageContent | ConvertTo-Json -Depth 10 | Set-Content $packageJsonPath -Encoding UTF8
            Write-Host "   ✓ package.json mis à jour pour Forge" -ForegroundColor Green
        }
    }
    
    Write-Host "`n📦 Construction avec Electron Forge..." -ForegroundColor Yellow
    if ($Verbose) { $env:DEBUG = "electron-forge:*" }
    npx electron-forge make
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ Build Forge terminé avec succès!" -ForegroundColor Green
        if (Test-Path "out") {
            Write-Host "`n📊 Fichiers générés:" -ForegroundColor Yellow
            Get-ChildItem -Path "out" -Recurse | Where-Object { $_.Extension -in @('.exe', '.zip', '.msi', '.nupkg') } | ForEach-Object {
                $size = [math]::Round($_.Length / 1MB, 2)
                Write-Host "   ✓ $($_.Name) ($size MB)" -ForegroundColor Green
                Write-Host "     $($_.FullName)" -ForegroundColor Gray
            }
        }
    } else {
        throw "Le build Forge a échoué"
    }
}
catch {
    Write-Host "`n❌ Erreur Forge: $_" -ForegroundColor Red
    exit 1
}
finally {
    Pop-Location
    Remove-Item Env:DEBUG -ErrorAction SilentlyContinue
}

Write-Host "`n✨ Build Forge terminé!" -ForegroundColor Green
