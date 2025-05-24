# Script de nettoyage et build pour Indi-Suivi
param(
    [switch]$Clean = $true,
    [switch]$Verbose = $false
)

# Obtenir le répertoire racine du projet (parent du dossier scripts)
$projectRoot = Split-Path -Parent $PSScriptRoot
Write-Host "📁 Répertoire du projet: $projectRoot" -ForegroundColor Cyan

# Se déplacer dans le répertoire racine
Push-Location $projectRoot

try {
    Write-Host "`n🧹 Nettoyage des builds précédents..." -ForegroundColor Yellow
    
    # Arrêter tous les processus Node/Electron
    Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
    Get-Process electron* -ErrorAction SilentlyContinue | Stop-Process -Force
    
    # Supprimer les dossiers de build
    @("out", "dist", "release-builds", ".vite") | ForEach-Object {
        if (Test-Path $_) {
            Remove-Item -Path $_ -Recurse -Force -ErrorAction SilentlyContinue
            Write-Host "  ✓ Supprimé: $_" -ForegroundColor Gray
        }
    }
    
    # Supprimer electron-builder.json s'il existe
    if (Test-Path "electron-builder.json") {
        Write-Host "  ⚠️ Suppression de electron-builder.json (conflit avec forge)" -ForegroundColor Yellow
        Remove-Item -Path "electron-builder.json" -Force
    }
    
    Write-Host "✅ Nettoyage terminé" -ForegroundColor Green
    
    # Vérifier que node_modules existe
    if (-not (Test-Path "node_modules")) {
        Write-Host "`n📦 Installation des dépendances..." -ForegroundColor Yellow
        npm install
        if ($LASTEXITCODE -ne 0) {
            throw "Échec de l'installation des dépendances"
        }
    }
    
    # Vérifier que electron-forge est installé
    $forgePath = "node_modules\.bin\electron-forge.cmd"
    if (-not (Test-Path $forgePath)) {
        Write-Host "`n⚠️ electron-forge non trouvé, réinstallation..." -ForegroundColor Yellow
        npm install --save-dev @electron-forge/cli
        if ($LASTEXITCODE -ne 0) {
            throw "Échec de l'installation d'electron-forge"
        }
    }
    
    # Build Electron
    Write-Host "`n🚀 Build Electron..." -ForegroundColor Yellow
    
    if ($Verbose) {
        $env:DEBUG = "electron-forge:*,electron-packager"
        & npm run make -- --verbose
    } else {
        & npm run make
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ Build terminé avec succès!" -ForegroundColor Green
        
        # Afficher les fichiers générés
        if (Test-Path "out\make") {
            Write-Host "`n📂 Fichiers générés:" -ForegroundColor Yellow
            Get-ChildItem -Path "out\make" -Recurse -File | ForEach-Object {
                $size = [math]::Round($_.Length / 1MB, 2)
                Write-Host "  ✓ $($_.Name) ($size MB)" -ForegroundColor Green
                Write-Host "    📍 $($_.FullName)" -ForegroundColor Gray
            }
        }
    } else {
        throw "Le build a échoué avec le code de sortie: $LASTEXITCODE"
    }
    
} catch {
    Write-Host "`n❌ Erreur: $_" -ForegroundColor Red
    exit 1
} finally {
    # Retourner au répertoire d'origine
    Pop-Location
    
    # Nettoyer les variables d'environnement
    Remove-Item Env:DEBUG -ErrorAction SilentlyContinue
}
