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
    
    # Supprimer forge.config.mjs s'il existe
    if (Test-Path "forge.config.mjs") {
        Write-Host "   Suppression de forge.config.mjs (obsolète)" -ForegroundColor Yellow
        Remove-Item -Path "forge.config.mjs" -Force
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
    
    # Vrifier que electron-builder est install
    $builderPath = "node_modules\.bin\electron-builder.cmd"
    if (-not (Test-Path $builderPath)) {
        Write-Host "`n electron-builder non trouv, installation..." -ForegroundColor Yellow
        npm install --save-dev electron-builder
        if ($LASTEXITCODE -ne 0) {
            throw "chec de l'installation d'electron-builder"
        }
    }
    
    # Build Electron
    Write-Host "`n Build Electron..." -ForegroundColor Yellow

    if ($Verbose) {
        $env:DEBUG = "electron-builder"
        & npm run dist -- --publish never
    } else {
        & npm run dist
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n Build termin avec succs!" -ForegroundColor Green
        
        # Afficher les fichiers gnrs
        if (Test-Path "release-builds") {
            Write-Host "`n Fichiers gnrs:" -ForegroundColor Yellow
            Get-ChildItem -Path "release-builds" -Recurse -File | ForEach-Object {
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
