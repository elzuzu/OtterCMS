# Script de nettoyage et build pour Indi-Suivi
param(
    [switch]$Clean = $true,
    [switch]$Verbose = $false
)

# Obtenir le rpertoire racine du projet (parent du dossier scripts)
$projectRoot = Split-Path -Parent $PSScriptRoot
Write-Host " Rpertoire du projet: $projectRoot" -ForegroundColor Cyan

# Se dplacer dans le rpertoire racine
Push-Location $projectRoot

try {
    Write-Host "`n Nettoyage des builds prcdents..." -ForegroundColor Yellow
    
    # Arrter tous les processus Node/Electron
    Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
    Get-Process electron* -ErrorAction SilentlyContinue | Stop-Process -Force
    
    # Supprimer les dossiers de build
    @("out", "dist", "release-builds", ".vite") | ForEach-Object {
        if (Test-Path $_) {
            Remove-Item -Path $_ -Recurse -Force -ErrorAction SilentlyContinue
            Write-Host "   Supprim: $_" -ForegroundColor Gray
        }
    }
    
    # Supprimer electron-builder.json s'il existe
    if (Test-Path "electron-builder.json") {
        Write-Host "   Suppression de electron-builder.json (conflit avec forge)" -ForegroundColor Yellow
        Remove-Item -Path "electron-builder.json" -Force
    }
    
    Write-Host " Nettoyage termin" -ForegroundColor Green
    
    # Vrifier que node_modules existe
    if (-not (Test-Path "node_modules")) {
        Write-Host "`n Installation des dpendances..." -ForegroundColor Yellow
        npm install
        if ($LASTEXITCODE -ne 0) {
            throw "chec de l'installation des dpendances"
        }
    }
    
    # Vrifier que electron-forge est install
    $forgePath = "node_modules\.bin\electron-forge.cmd"
    if (-not (Test-Path $forgePath)) {
        Write-Host "`n electron-forge non trouv, rinstallation..." -ForegroundColor Yellow
        npm install --save-dev @electron-forge/cli
        if ($LASTEXITCODE -ne 0) {
            throw "chec de l'installation d'electron-forge"
        }
    }
    
    # Build Electron
    Write-Host "`n Build Electron..." -ForegroundColor Yellow
    
    if ($Verbose) {
        $env:DEBUG = "electron-forge:*,electron-packager"
        & npm run make -- --verbose
    } else {
        & npm run make
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n Build termin avec succs!" -ForegroundColor Green
        
        # Afficher les fichiers gnrs
        if (Test-Path "out\make") {
            Write-Host "`n Fichiers gnrs:" -ForegroundColor Yellow
            Get-ChildItem -Path "out\make" -Recurse -File | ForEach-Object {
                $size = [math]::Round($_.Length / 1MB, 2)
                Write-Host "   $($_.Name) ($size MB)" -ForegroundColor Green
                Write-Host "     $($_.FullName)" -ForegroundColor Gray
            }
        }
    } else {
        throw "Le build a chou avec le code de sortie: $LASTEXITCODE"
    }
    
} catch {
    Write-Host "`n Erreur: $_" -ForegroundColor Red
    exit 1
} finally {
    # Retourner au rpertoire d'origine
    Pop-Location
    
    # Nettoyer les variables d'environnement
    Remove-Item Env:DEBUG -ErrorAction SilentlyContinue
}
